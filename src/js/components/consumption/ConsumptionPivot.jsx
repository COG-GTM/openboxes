import React, { useEffect, useMemo, useState } from 'react';

import _ from 'lodash';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { getCurrentLocation } from 'selectors';

import { CONSUMPTION_AGGREGATE } from 'api/urls';
import Spinner from 'components/spinner/Spinner';
import { CONSUMPTION_URL } from 'consts/applicationUrls';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import apiClient from 'utils/apiClient';
import PageWrapper from 'wrappers/PageWrapper';

const ROW_DIMENSIONS = [
  { value: 'productName', label: 'Product' },
  { value: 'productCode', label: 'Product code' },
  { value: 'categoryName', label: 'Category' },
];

const COLUMN_DIMENSIONS = [
  { value: 'yearMonth', label: 'Year / Month' },
  { value: 'year', label: 'Year' },
  { value: 'month', label: 'Month' },
];

const columnValue = (row, dimension) => {
  if (dimension === 'yearMonth') {
    return `${row.year}-${String(row.month).padStart(2, '0')}`;
  }
  if (dimension === 'month') {
    return String(row.month).padStart(2, '0');
  }
  return String(row[dimension]);
};

const ConsumptionPivot = () => {
  useTranslation('consumption');
  const translate = useTranslate();
  const currentLocation = useSelector(getCurrentLocation);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rowDimension, setRowDimension] = useState('productName');
  const [columnDimension, setColumnDimension] = useState('yearMonth');

  useEffect(() => {
    if (!currentLocation?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    apiClient.get(CONSUMPTION_AGGREGATE, { params: { locationId: currentLocation?.id } })
      .then((response) => setRows(response.data.data))
      .finally(() => setLoading(false));
  }, [currentLocation?.id]);

  const { columns, pivotRows, columnTotals } = useMemo(() => {
    const columnKeys = _.uniq(rows.map((row) => columnValue(row, columnDimension))).sort();
    const byRow = _.groupBy(rows, rowDimension);
    const dataRows = Object.keys(byRow).sort().map((rowKey) => {
      const quantities = _.mapValues(
        _.groupBy(byRow[rowKey], (row) => columnValue(row, columnDimension)),
        (groupedRows) => _.sumBy(groupedRows, 'quantity'),
      );
      return { rowKey, quantities, total: _.sum(Object.values(quantities)) };
    });
    const totals = _.fromPairs(columnKeys.map((columnKey) => [
      columnKey,
      _.sumBy(dataRows, (row) => row.quantities[columnKey] ?? 0),
    ]));
    return { columns: columnKeys, pivotRows: dataRows, columnTotals: totals };
  }, [rows, rowDimension, columnDimension]);

  return (
    <PageWrapper>
      <div className="d-flex flex-column list-page-main p-3">
        <h1>{translate('react.consumption.pivot.title.label', 'Consumption Pivot')}</h1>
        <div className="d-flex align-items-end mb-3" style={{ gap: '0.75rem' }}>
          <div>
            <label htmlFor="pivot-row-dimension">
              {translate('react.consumption.pivot.rows.label', 'Rows')}
            </label>
            <select
              id="pivot-row-dimension"
              className="form-control"
              value={rowDimension}
              onChange={(e) => setRowDimension(e.target.value)}
            >
              {ROW_DIMENSIONS.map((dimension) => (
                <option key={dimension.value} value={dimension.value}>{dimension.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="pivot-column-dimension">
              {translate('react.consumption.pivot.columns.label', 'Columns')}
            </label>
            <select
              id="pivot-column-dimension"
              className="form-control"
              value={columnDimension}
              onChange={(e) => setColumnDimension(e.target.value)}
            >
              {COLUMN_DIMENSIONS.map((dimension) => (
                <option key={dimension.value} value={dimension.value}>{dimension.label}</option>
              ))}
            </select>
          </div>
          <Link className="btn btn-outline-secondary" to={CONSUMPTION_URL.list()}>
            {translate('react.consumption.list.label', 'List')}
          </Link>
        </div>
        {loading ? <Spinner /> : (
          <div className="table-responsive">
            <table className="table table-bordered table-sm" data-testid="consumption-pivot-table">
              <thead>
                <tr>
                  <th>{ROW_DIMENSIONS.find((d) => d.value === rowDimension)?.label}</th>
                  {columns.map((column) => <th key={column} className="text-right">{column}</th>)}
                  <th className="text-right">{translate('react.default.total.label', 'Total')}</th>
                </tr>
              </thead>
              <tbody>
                {pivotRows.map((row) => (
                  <tr key={row.rowKey}>
                    <td>{row.rowKey}</td>
                    {columns.map((column) => (
                      <td key={column} className="text-right">{row.quantities[column] ?? ''}</td>
                    ))}
                    <td className="text-right font-weight-bold">{row.total}</td>
                  </tr>
                ))}
                {!pivotRows.length && (
                  <tr>
                    <td colSpan={columns.length + 2}>
                      {translate('react.default.noResultsFound.label', 'No results found')}
                    </td>
                  </tr>
                )}
              </tbody>
              {pivotRows.length > 0 && (
                <tfoot>
                  <tr>
                    <th>{translate('react.default.total.label', 'Total')}</th>
                    {columns.map((column) => (
                      <th key={column} className="text-right">{columnTotals[column]}</th>
                    ))}
                    <th className="text-right">{_.sumBy(pivotRows, 'total')}</th>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>
    </PageWrapper>
  );
};

export default ConsumptionPivot;
