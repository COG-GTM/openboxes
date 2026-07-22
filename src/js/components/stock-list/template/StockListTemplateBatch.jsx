import React, { useEffect, useState } from 'react';

import { getTranslate } from 'react-localize-redux';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import Alert from 'react-s-alert';

import requisitionTemplateApi from 'api/services/RequisitionTemplateApi';
import StockListTemplateSummary from 'components/stock-list/template/StockListTemplateSummary';
import { REQUISITION_TEMPLATE_URL } from 'consts/applicationUrls';
import useTranslation from 'hooks/useTranslation';
import Translate, { translateWithDefaultMessage } from 'utils/Translate';

const findDuplicates = (rows) => {
  const seen = new Map();
  rows.forEach((row) => {
    const code = row[0];
    if (code && code !== 'Product Code') {
      seen.set(code, (seen.get(code) || 0) + 1);
    }
  });
  return [...seen.entries()].filter(([, count]) => count > 1).map(([code]) => code);
};

const StockListTemplateBatch = () => {
  const { templateId } = useParams();
  const [template, setTemplate] = useState(null);
  const [csvText, setCsvText] = useState('');
  const [productCodes, setProductCodes] = useState('');
  const [delimiter, setDelimiter] = useState(',');
  const [skipLines, setSkipLines] = useState(0);
  const [parsedRows, setParsedRows] = useState(null);
  const [parseErrors, setParseErrors] = useState([]);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState(null);

  useTranslation('stockListManagement', 'requisition', 'default');

  const translate = useSelector(
    (state) => translateWithDefaultMessage(getTranslate(state.localize)),
  );

  const loadTemplate = () => requisitionTemplateApi.getTemplate(templateId)
    .then(({ data }) => setTemplate(data?.data))
    .catch((err) => {
      setError(err?.response?.data?.errorMessage || 'An error occurred while loading the stock list');
    });

  useEffect(() => {
    loadTemplate();
  }, [templateId]);

  const parse = async (event) => {
    event.preventDefault();
    try {
      const { data } = await requisitionTemplateApi.importTemplateData(templateId, {
        csv: csvText,
        delimiter,
        skipLines: Number(skipLines) || 0,
      });
      setParsedRows(data?.data ?? []);
      setParseErrors(data?.errors ?? []);
    } catch (err) {
      const message = err?.response?.data?.errorMessage;
      if (message) {
        Alert.error(message);
      }
    }
  };

  const doImport = async () => {
    setImporting(true);
    try {
      const { data } = await requisitionTemplateApi.importTemplateItems(templateId, {
        data: parsedRows,
      });
      const counts = data?.data;
      Alert.success(`Imported: ${counts?.insertCount ?? 0} added, ${counts?.updateCount ?? 0} updated, ${counts?.ignoreCount ?? 0} ignored`);
      (data?.errors ?? []).forEach((message) => Alert.error(message));
      setParsedRows(null);
      setParseErrors([]);
      setCsvText('');
      await loadTemplate();
    } catch (err) {
      const message = err?.response?.data?.errorMessage;
      if (message) {
        Alert.error(message);
      }
    } finally {
      setImporting(false);
    }
  };

  const addProductCodes = async (event) => {
    event.preventDefault();
    try {
      const codes = productCodes.split(/[\s,]+/).filter(Boolean);
      const { data } = await requisitionTemplateApi.addProductCodes(templateId, {
        productCodes: codes,
      });
      const result = data?.data;
      Alert.success(`Added: ${result?.processedProductCodes?.length ?? 0}, ignored: ${result?.ignoredProductCodes?.length ?? 0}`);
      setProductCodes('');
      await loadTemplate();
    } catch (err) {
      const message = err?.response?.data?.errorMessage;
      if (message) {
        Alert.error(message);
      }
    }
  };

  if (error) {
    return <div className="alert alert-danger m-3" role="alert">{error}</div>;
  }

  if (!template) {
    return null;
  }

  const duplicates = parsedRows ? findDuplicates(parsedRows) : [];

  return (
    <div className="d-flex flex-column m-3">
      <StockListTemplateSummary template={template} currentScreen="batch" />
      <div className="card mb-3">
        <div className="card-header">
          <Translate id="react.stockListTemplate.importItems.label" defaultMessage="Import stock list items" />
        </div>
        <form className="card-body" onSubmit={parse}>
          <div className="form-group">
            <label htmlFor="stocklist-template-import-text">
              <Translate id="react.stockListTemplate.copyPaste.label" defaultMessage="Copy/paste CSV or TSV data (product code, product name, quantity, unit of measure)" />
            </label>
            <textarea
              id="stocklist-template-import-text"
              className="form-control"
              rows="6"
              value={csvText}
              onChange={(event) => setCsvText(event.target.value)}
              data-testid="stocklist-template-import-text"
            />
          </div>
          <div className="form-row align-items-end">
            <div className="col-md-3">
              <label htmlFor="stocklist-template-delimiter-select">
                <Translate id="react.stockListTemplate.delimiter.label" defaultMessage="Delimiter" />
              </label>
              <select
                id="stocklist-template-delimiter-select"
                className="form-control"
                value={delimiter}
                onChange={(event) => setDelimiter(event.target.value)}
                data-testid="stocklist-template-delimiter-select"
              >
                <option value=",">Comma</option>
                <option value="&#9;">Tab</option>
              </select>
            </div>
            <div className="col-md-3">
              <label htmlFor="stocklist-template-skip-lines">
                <Translate id="react.stockListTemplate.skipLines.label" defaultMessage="Lines to skip" />
              </label>
              <input
                type="number"
                min="0"
                id="stocklist-template-skip-lines"
                className="form-control"
                value={skipLines}
                onChange={(event) => setSkipLines(event.target.value)}
                data-testid="stocklist-template-skip-lines"
              />
            </div>
            <div className="col-md-3">
              <button
                type="submit"
                className="btn btn-primary btn-block"
                disabled={!csvText}
                data-testid="stocklist-template-parse-button"
              >
                <Translate id="react.stockListTemplate.preview.label" defaultMessage="Preview" />
              </button>
            </div>
          </div>
        </form>
        {parsedRows && (
          <div className="card-body border-top">
            {parseErrors.map((message) => (
              <div key={message} className="alert alert-danger py-1">{message}</div>
            ))}
            {duplicates.length > 0 && (
              <div className="alert alert-danger py-1" data-testid="stocklist-template-duplicates-warning">
                <Translate id="react.stockListTemplate.duplicates.label" defaultMessage="Duplicate product codes detected" />
                {': '}
                {duplicates.join(', ')}
              </div>
            )}
            <div className="table-responsive">
              <table className="table table-sm table-striped mb-2" data-testid="stocklist-template-import-preview-table">
                <thead>
                  <tr>
                    <th>{translate('react.stockListTemplate.productCode.label', 'Code')}</th>
                    <th>{translate('react.default.product.label', 'Product')}</th>
                    <th className="text-right">{translate('react.stockListTemplate.maxQuantity.label', 'Quantity')}</th>
                    <th>{translate('react.stockListTemplate.uom.label', 'UOM')}</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.map((row, index) => (
                    // eslint-disable-next-line react/no-array-index-key
                    <tr key={index} className={duplicates.includes(row[0]) ? 'table-danger' : ''}>
                      <td>{row[0]}</td>
                      <td>{row[1]}</td>
                      <td className="text-right">{row[2]}</td>
                      <td>{row[3]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={doImport}
              disabled={importing || !!parseErrors.length || !!duplicates.length}
              data-testid="stocklist-template-import-button"
            >
              <Translate id="react.default.button.import.label" defaultMessage="Import" />
            </button>
          </div>
        )}
      </div>
      <div className="card">
        <div className="card-header">
          <Translate id="react.stockListTemplate.bulkAdd.label" defaultMessage="Bulk add products by product code" />
        </div>
        <form className="card-body" onSubmit={addProductCodes}>
          <div className="form-group">
            <textarea
              className="form-control"
              rows="3"
              value={productCodes}
              onChange={(event) => setProductCodes(event.target.value)}
              placeholder="AB12, CD34, EF56"
              data-testid="stocklist-template-product-codes"
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!productCodes.trim()}
            data-testid="stocklist-template-add-codes-button"
          >
            <Translate id="react.default.button.add.label" defaultMessage="Add" />
          </button>
        </form>
        <div className="card-footer d-flex justify-content-end">
          <a className="btn btn-outline-secondary" href={REQUISITION_TEMPLATE_URL.edit(templateId)}>
            <Translate id="react.default.button.back.label" defaultMessage="Back" />
          </a>
        </div>
      </div>
    </div>
  );
};

export default StockListTemplateBatch;
