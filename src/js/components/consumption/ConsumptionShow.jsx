import React, { useEffect, useState } from 'react';

import { useSelector } from 'react-redux';
import { getCurrentLocation } from 'selectors';

import { CONSUMPTION_SUMMARY } from 'api/urls';
import Spinner from 'components/spinner/Spinner';
import { INVENTORY_ITEM_URL } from 'consts/applicationUrls';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import apiClient from 'utils/apiClient';
import PageWrapper from 'wrappers/PageWrapper';

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

const formatNumber = (value, fractionDigits = 1) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))
      || !Number.isFinite(Number(value))) {
    return '';
  }
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: fractionDigits });
};

const ConsumptionShow = () => {
  useTranslation('consumption');
  const translate = useTranslate();
  const currentLocation = useSelector(getCurrentLocation);

  const [startDate, setStartDate] = useState(isoDateMonthsAgo(1));
  const [endDate, setEndDate] = useState(toIsoLocalDate(new Date()));
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchData = () => {
    setLoading(true);
    apiClient.get(CONSUMPTION_SUMMARY, {
      params: {
        locationId: currentLocation?.id,
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

  return (
    <PageWrapper>
      <div className="d-flex flex-column list-page-main p-3">
        <h1>{translate('react.consumption.report.title.label', 'Consumption Report')}</h1>
        <div className="d-flex align-items-end mb-3" style={{ gap: '0.75rem' }}>
          <div>
            <label htmlFor="consumption-show-start-date">
              {translate('react.consumption.startDate.label', 'Start date')}
            </label>
            <input
              id="consumption-show-start-date"
              type="date"
              className="form-control"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="consumption-show-end-date">
              {translate('react.consumption.endDate.label', 'End date')}
            </label>
            <input
              id="consumption-show-end-date"
              type="date"
              className="form-control"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <button type="button" className="btn btn-primary" onClick={fetchData}>
            {translate('react.default.button.view.label', 'View')}
          </button>
        </div>
        {loading ? <Spinner /> : (
          <div className="table-responsive">
            <table className="table table-bordered table-sm" data-testid="consumption-report-table">
              <thead>
                <tr>
                  <th>{translate('react.consumption.productCode.label', 'Product Code')}</th>
                  <th>{translate('react.consumption.product.label', 'Product')}</th>
                  <th className="text-right">{translate('react.consumption.unitPrice.label', 'Unit Price')}</th>
                  <th className="text-right">{translate('react.consumption.issued.label', 'Issued')}</th>
                  <th className="text-right">{translate('react.consumption.consumed.label', 'Consumed')}</th>
                  <th className="text-right">{translate('react.consumption.returned.label', 'Returned')}</th>
                  <th className="text-right">{translate('react.consumption.totalConsumption.label', 'Total Consumption')}</th>
                  <th className="text-right">{translate('react.consumption.totalConsumptionValue.label', 'Total Consumption Value')}</th>
                  <th className="text-right">{translate('react.consumption.monthly.label', 'Monthly')}</th>
                  <th className="text-right">{translate('react.consumption.qoh.label', 'QoH')}</th>
                  <th className="text-right">{translate('react.consumption.monthsRemaining.label', 'Months remaining')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.productId}>
                    <td>
                      <a href={INVENTORY_ITEM_URL.showStockCard(row.productId)}>
                        {row.productCode}
                      </a>
                    </td>
                    <td>
                      <a href={INVENTORY_ITEM_URL.showStockCard(row.productId)}>
                        {row.productName}
                      </a>
                    </td>
                    <td className="text-right">{formatNumber(row.unitPrice, 4)}</td>
                    <td className="text-right">{formatNumber(row.issuedQuantity)}</td>
                    <td className="text-right">{formatNumber(row.consumedQuantity)}</td>
                    <td className="text-right">{formatNumber(row.returnedQuantity)}</td>
                    <td className="text-right">{formatNumber(row.totalConsumptionQuantity)}</td>
                    <td className="text-right">{formatNumber(row.totalConsumptionValue, 2)}</td>
                    <td className="text-right">{formatNumber(row.monthlyQuantity, 4)}</td>
                    <td className="text-right">{formatNumber(row.onHandQuantity)}</td>
                    <td className="text-right">{formatNumber(row.numberOfMonthsRemaining, 0)}</td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr>
                    <td colSpan={11}>
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

export default ConsumptionShow;
