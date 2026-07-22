import React, { useState } from 'react';

import Alert from 'react-s-alert';

import productApi from 'api/services/ProductApi';
import Button from 'components/form-elements/Button';
import { CONTEXT_PATH } from 'consts/applicationUrls';
import useSpinner from 'hooks/useSpinner';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';
import PageWrapper from 'wrappers/PageWrapper';

import './styles.scss';

const COMPARED_FIELDS = [
  'active', 'productCode', 'productType', 'name', 'productFamily', 'category',
  'glAccount', 'description', 'unitOfMeasure', 'pricePerUnit', 'lotAndExpiryControl',
  'coldChain', 'controlledSubstance', 'hazardousMaterial', 'reconditioned',
  'manufacturer', 'brandName', 'manufacturerCode', 'manufacturerName',
  'vendor', 'vendorCode', 'vendorName', 'upc', 'ndc',
];

const formatValue = (value) => {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  return String(value);
};

const ProductImportCsv = () => {
  useTranslation('product', 'default');
  const spinner = useSpinner();
  const translate = useTranslate();

  const [step, setStep] = useState(1);
  const [csvText, setCsvText] = useState(null);
  const [rows, setRows] = useState([]);
  const [tags, setTags] = useState('');
  const [errors, setErrors] = useState([]);
  const [importedCount, setImportedCount] = useState(null);

  const onFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      setCsvText(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setCsvText(reader.result);
    reader.readAsText(file);
  };

  const onUpload = async (event) => {
    event.preventDefault();
    setErrors([]);
    if (!csvText) {
      setErrors([translate('react.product.import.emptyFile.message', 'Please choose a CSV file to upload')]);
      return;
    }
    spinner.show();
    try {
      const { data } = await productApi.validateImportCsv(csvText);
      setRows(data?.data ?? []);
      setStep(2);
    } catch (error) {
      const errorMessages = error.response?.data?.errorMessages
        ?? [error.response?.data?.errorMessage ?? 'Unable to validate products'];
      setErrors(errorMessages);
    } finally {
      spinner.hide();
    }
  };

  const onImport = async () => {
    setErrors([]);
    spinner.show();
    try {
      const { data } = await productApi.importCsv(csvText, tags || null);
      setImportedCount(data?.data?.length ?? rows.length);
      setStep(3);
      Alert.success(translate('react.product.import.success.message', 'Products imported successfully'));
    } catch (error) {
      const errorMessages = error.response?.data?.errorMessages
        ?? [error.response?.data?.errorMessage ?? 'Unable to import products'];
      setErrors(errorMessages);
    } finally {
      spinner.hide();
    }
  };

  const isModified = (row, field) =>
    row.existingProduct && formatValue(row[field]) !== formatValue(row.existingProduct[field]);

  return (
    <PageWrapper>
      <div className="d-flex flex-column product-page p-3">
        <h3 className="mb-3" data-testid="import-title">
          <Translate id="react.product.import.title.label" defaultMessage="Import products" />
        </h3>
        <ul className="nav nav-tabs mb-3">
          {[
            { id: 1, label: 'react.product.import.step1.label', defaultLabel: 'Step 1: Upload data file' },
            { id: 2, label: 'react.product.import.step2.label', defaultLabel: 'Step 2: Verify products' },
            { id: 3, label: 'react.product.import.step3.label', defaultLabel: 'Step 3: Import products' },
          ].map((tab) => (
            <li className="nav-item" key={tab.id}>
              <span className={`nav-link ${step === tab.id ? 'active' : 'disabled'}`} data-testid={`import-step-${tab.id}`}>
                <Translate id={tab.label} defaultMessage={tab.defaultLabel} />
              </span>
            </li>
          ))}
        </ul>
        {errors.length > 0 && (
          <div className="alert alert-danger" role="alert" aria-label="error-message">
            <ul className="mb-0">
              {errors.map((error) => <li key={error}>{error}</li>)}
            </ul>
          </div>
        )}
        {step === 1 && (
          <form onSubmit={onUpload} data-testid="import-upload-form">
            <p>
              <a href={`${CONTEXT_PATH}/batch/downloadCsvTemplate?template=products.csv`}>
                <Translate id="react.product.import.downloadTemplate.label" defaultMessage="Download CSV template" />
              </a>
              {' | '}
              <a href={`${CONTEXT_PATH}/product/exportAsCsv`}>
                <Translate id="react.product.import.exportProducts.label" defaultMessage="Export products as CSV" />
              </a>
            </p>
            <div className="form-group">
              <input type="file" accept=".csv,text/csv" onChange={onFileChange} data-testid="import-file-input" />
            </div>
            <Button
              type="submit"
              label="react.default.button.upload.label"
              defaultLabel="Upload"
              variant="primary"
            />
          </form>
        )}
        {step === 2 && (
          <div data-testid="import-verify-step">
            <div className="mb-2" data-testid="import-results-count">
              <Translate id="react.default.results.label" defaultMessage="Results" />
              {`: ${rows.length}`}
            </div>
            <div className="form-group row">
              <label className="col-sm-3 col-form-label" htmlFor="tagsToBeAdded">
                <Translate id="react.product.tags.label" defaultMessage="Tags" />
              </label>
              <div className="col-sm-9">
                <input
                  id="tagsToBeAdded"
                  type="text"
                  className="form-control"
                  value={tags}
                  onChange={(event) => setTags(event.target.value)}
                />
              </div>
            </div>
            <div className="table-responsive">
              <table className="table table-sm" data-testid="import-verify-table">
                <thead>
                  <tr>
                    <th>{translate('react.product.import.status.label', 'Status')}</th>
                    {COMPARED_FIELDS.map((field) => <th key={field}>{field}</th>)}
                    <th>{translate('react.product.tags.label', 'Tags')}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id ?? row.productCode ?? row.name}>
                      <td>
                        {row.isNew
                          ? <span className="badge badge-success"><Translate id="react.product.import.new.label" defaultMessage="New" /></span>
                          : <span className="badge badge-warning"><Translate id="react.product.import.update.label" defaultMessage="Update" /></span>}
                      </td>
                      {COMPARED_FIELDS.map((field) => (
                        <td key={field} className={isModified(row, field) ? 'import-modified-value' : ''}>
                          {formatValue(row[field])}
                          {isModified(row, field) && (
                            <div className="import-old-value">{formatValue(row.existingProduct[field])}</div>
                          )}
                        </td>
                      ))}
                      <td>{formatValue(row.tags)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="d-flex gap-8">
              <Button
                label="react.default.button.back.label"
                defaultLabel="Back"
                variant="primary-outline"
                onClick={() => setStep(1)}
              />
              <Button
                label="react.product.import.importNow.label"
                defaultLabel="Import products"
                variant="primary"
                onClick={onImport}
              />
            </div>
          </div>
        )}
        {step === 3 && (
          <div data-testid="import-complete-step">
            <div className="alert alert-success">
              <Translate
                id="react.product.import.completed.message"
                defaultMessage="Products were imported successfully."
              />
              {` (${importedCount})`}
            </div>
            <Button
              label="react.product.import.startOver.label"
              defaultLabel="Import another file"
              variant="primary-outline"
              onClick={() => {
                setStep(1);
                setCsvText(null);
                setRows([]);
                setTags('');
                setImportedCount(null);
              }}
            />
          </div>
        )}
      </div>
    </PageWrapper>
  );
};

export default ProductImportCsv;
