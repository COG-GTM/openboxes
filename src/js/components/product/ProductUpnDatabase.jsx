import React, { useEffect, useState } from 'react';

import Alert from 'react-s-alert';

import productApi from 'api/services/ProductApi';
import useSpinner from 'hooks/useSpinner';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';
import PageWrapper from 'wrappers/PageWrapper';

import './styles.scss';

const COLUMNS = [
  'upn', 'supplier', 'division', 'tradeName', 'description', 'uom', 'qty',
  'partno', 'saleable', 'upnQualifierCode', 'srcCode', 'trackingRequired',
  'upnCreateDate', 'upnEditDate', 'statusCode', 'actionCode', 'reference',
  'referenceQualifierCode',
];

const ProductUpnDatabase = () => {
  useTranslation('product', 'default');
  const spinner = useSpinner();
  const translate = useTranslate();

  const [rows, setRows] = useState([]);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    const fetchRows = async () => {
      spinner.show();
      try {
        const { data } = await productApi.getUpnDatabase();
        setRows(data?.data ?? []);
        setTotalCount(data?.totalCount ?? 0);
      } catch (error) {
        Alert.error(error.response?.data?.errorMessage ?? 'Unable to load UPN database');
      } finally {
        spinner.hide();
      }
    };
    fetchRows();
  }, []);

  return (
    <PageWrapper>
      <div className="d-flex flex-column product-page p-3">
        <h3 className="mb-3" data-testid="upn-database-title">
          <Translate id="react.product.upnDatabase.title.label" defaultMessage="UPN Database" />
        </h3>
        <div className="mb-2" data-testid="upn-database-count">
          <Translate id="react.default.results.label" defaultMessage="Results" />
          {`: ${totalCount}`}
        </div>
        <div className="table-responsive">
          <table className="table table-sm table-bordered upn-database-table" data-testid="upn-database-table">
            <thead>
              <tr>
                {COLUMNS.map((column) => (
                  <th key={column}>{translate(`react.product.upnDatabase.${column}.label`, column)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.upn}>
                  {COLUMNS.map((column) => (
                    <td key={column}>{row[column]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PageWrapper>
  );
};

export default ProductUpnDatabase;
