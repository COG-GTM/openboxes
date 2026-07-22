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
import { fetchProductsCategories } from 'utils/option-utils';
import PageWrapper from 'wrappers/PageWrapper';

const { CONTEXT_PATH } = window;

const monthKey = (row) => `${row.year}-${String(row.month).padStart(2, '0')}`;

const toApiDate = (isoDate) => {
  if (!isoDate) {
    return null;
  }
  const [year, month, day] = isoDate.split('-');
  return `${month}/${day}/${year}`;
};

const toIsoLocalDate = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const isoDateMonthsAgo = (months) => {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  return toIsoLocalDate(date);
};

const ConsumptionList = () => {
  useTranslation('consumption');
  const translate = useTranslate();
  const currentLocation = useSelector(getCurrentLocation);

  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState('');
  const [startDate, setStartDate] = useState(isoDateMonthsAgo(6));
  const [endDate, setEndDate] = useState(toIsoLocalDate(new Date()));
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProductsCategories().then(setCategories);
  }, []);

  const fetchData = () => {
    setLoading(true);
    apiClient.get(CONSUMPTION_AGGREGATE, {
      params: {
        locationId: currentLocation?.id,
        categoryId: categoryId || null,
        startDate: toApiDate(startDate),
        endDate: toApiDate(endDate),
      },
    })
      .then((response) => setRows(response.data.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (currentLocation?.id) {
      fetchData();
    }
  }, [currentLocation?.id]);

  const { columns, pivotRows } = useMemo(() => {
    const months = _.uniq(rows.map(monthKey)).sort();
    const byProduct = _.groupBy(rows, 'productName');
    const productRows = Object.keys(byProduct).sort().map((productName) => {
      const quantities = _.mapValues(
        _.groupBy(byProduct[productName], monthKey),
        (groupedRows) => _.sumBy(groupedRows, 'quantity'),
      );
      return {
        productName,
        quantities,
        total: _.sum(Object.values(quantities)),
      };
    });
    return { columns: months, pivotRows: productRows };
  }, [rows]);

  const downloadUrl = `${CONTEXT_PATH}/consumption/list?download=true&location=${currentLocation?.id ?? ''}&startDate=${toApiDate(startDate) ?? ''}&endDate=${toApiDate(endDate) ?? ''}&category=${categoryId}`;

  return (
    <PageWrapper>
      <div className="d-flex flex-column list-page-main p-3">
        <h1>{translate('react.consumption.list.title.label', 'Consumption')}</h1>
        <div className="d-flex align-items-end mb-3" style={{ gap: '0.75rem' }}>
          <div>
            <label htmlFor="consumption-category">
              {translate('react.consumption.category.label', 'Category')}
            </label>
            <select
              id="consumption-category"
              className="form-control"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">{translate('react.default.all.label', 'All')}</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="consumption-start-date">
              {translate('react.consumption.startDate.label', 'Start date')}
            </label>
            <input
              id="consumption-start-date"
              type="date"
              className="form-control"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="consumption-end-date">
              {translate('react.consumption.endDate.label', 'End date')}
            </label>
            <input
              id="consumption-end-date"
              type="date"
              className="form-control"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <button type="button" className="btn btn-primary" onClick={fetchData}>
            {translate('react.default.button.view.label', 'View')}
          </button>
          <a className="btn btn-outline-primary" href={downloadUrl}>
            {translate('react.default.button.download.label', 'Download')}
          </a>
          <Link className="btn btn-outline-secondary" to={CONSUMPTION_URL.pivot()}>
            {translate('react.consumption.pivot.label', 'Pivot')}
          </Link>
        </div>
        {loading ? <Spinner /> : (
          <div className="table-responsive">
            <table className="table table-bordered table-sm" data-testid="consumption-list-table">
              <thead>
                <tr>
                  <th>{translate('react.consumption.product.label', 'Product')}</th>
                  {columns.map((month) => <th key={month} className="text-right">{month}</th>)}
                  <th className="text-right">{translate('react.default.total.label', 'Total')}</th>
                </tr>
              </thead>
              <tbody>
                {pivotRows.map((row) => (
                  <tr key={row.productName}>
                    <td>{row.productName}</td>
                    {columns.map((month) => (
                      <td key={month} className="text-right">{row.quantities[month] ?? ''}</td>
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
            </table>
          </div>
        )}
      </div>
    </PageWrapper>
  );
};

export default ConsumptionList;
