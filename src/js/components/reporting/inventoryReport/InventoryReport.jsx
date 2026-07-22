import React, { useEffect, useState } from 'react';

import { useDispatch, useSelector } from 'react-redux';
import { getCurrentLocation } from 'selectors';

import { hideSpinner, showSpinner } from 'actions';
import { JSON_QOH_BY_PRODUCT_GROUP, JSON_SUMMARY_BY_PRODUCT_GROUP } from 'api/urls';
import notification from 'components/Layout/notifications/notification';
import Section from 'components/Layout/v2/Section';
import { INVENTORY_LEVEL_URL, PRODUCT_GROUP_URL, REPORT_URL } from 'consts/applicationUrls';
import NotificationType from 'consts/notificationTypes';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import apiClient from 'utils/apiClient';
import Translate from 'utils/Translate';
import HeaderWrapper from 'wrappers/HeaderWrapper';
import PageWrapper from 'wrappers/PageWrapper';

const STATUSES = [
  'OVERSTOCK',
  'IN_STOCK',
  'IDEAL_STOCK',
  'REORDER',
  'LOW_STOCK',
  'STOCK_OUT',
  'NOT_STOCKED',
  'INVALID',
];

const STATUS_COLORS = {
  IN_STOCK: 'green',
  NOT_STOCKED: 'grey',
  STOCK_OUT: 'red',
  LOW_STOCK: 'orange',
  REORDER: '#eed7b0',
  IDEAL_STOCK: 'green',
  OVERSTOCK: 'blue',
  INVALID: 'grey',
};

const InventoryReport = () => {
  useTranslation('inventoryReport', 'default');

  const dispatch = useDispatch();
  const translate = useTranslate();
  const currentLocation = useSelector(getCurrentLocation);

  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [summary, setSummary] = useState({});
  const [rows, setRows] = useState(null);

  useEffect(() => {
    const fetchSummary = async () => {
      if (!currentLocation?.id) {
        return;
      }
      try {
        const response = await apiClient.get(JSON_SUMMARY_BY_PRODUCT_GROUP, {
          params: { 'location.id': currentLocation.id },
        });
        setSummary(response?.data ?? {});
      } catch (error) {
        // Summary badges are decorative - ignore failures, like the legacy screen did
      }
    };
    fetchSummary();
  }, [currentLocation?.id]);

  const toggleStatus = (status) => {
    setSelectedStatuses((prevState) => (prevState.includes(status)
      ? prevState.filter((it) => it !== status)
      : [...prevState, status]));
  };

  const runReport = async () => {
    dispatch(showSpinner());
    try {
      // URLSearchParams encodes the brackets in "status[]" (Tomcat rejects them raw)
      const searchParams = new URLSearchParams({
        'location.id': currentLocation?.id,
        'status[]': selectedStatuses.join(','),
      });
      const response = await apiClient.get(`${JSON_QOH_BY_PRODUCT_GROUP}?${searchParams.toString()}`);
      setRows(response?.data?.aaData ?? []);
    } catch (error) {
      notification(NotificationType.ERROR)({
        message: translate('react.inventoryReport.fetchError.label', 'Unable to load inventory report'),
      });
    } finally {
      dispatch(hideSpinner());
    }
  };

  const exportReport = () => {
    const searchParams = new URLSearchParams();
    selectedStatuses.forEach((status) => searchParams.append('status', status));
    window.location.href = `${REPORT_URL.exportInventoryReport()}?${searchParams.toString()}`;
  };

  return (
    <PageWrapper>
      <HeaderWrapper className="align-items-center h-auto py-3">
        <span className="title">
          <Translate id="react.inventoryReport.title.label" defaultMessage="Inventory Report" />
        </span>
      </HeaderWrapper>
      <div className="p-3 d-flex" style={{ gap: '1rem', alignItems: 'flex-start' }}>
        <div style={{ minWidth: '280px' }}>
          <Section
            title={{ label: 'react.inventoryReport.status.label', defaultMessage: 'Status' }}
          >
            {STATUSES.map((status) => (
              <div className="form-check" key={status}>
                <label className="form-check-label" htmlFor={`status-${status}`} title={status}>
                  <input
                    id={`status-${status}`}
                    type="checkbox"
                    className="form-check-input"
                    checked={selectedStatuses.includes(status)}
                    onChange={() => toggleStatus(status)}
                  />
                  {translate(`react.inventoryReport.status.${status}.label`, status)}
                  {summary[status] && (
                    <span className="badge badge-secondary ml-1">
                      {summary[status].numProductGroups}
                    </span>
                  )}
                  {summary[status] && (
                    <span className="ml-1">
                      {`${Math.round(summary[status].percentage * 100)}%`}
                    </span>
                  )}
                </label>
              </div>
            ))}
            <div className="d-flex mt-2" style={{ gap: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-primary"
                data-testid="refresh-button"
                onClick={runReport}
              >
                <Translate id="react.inventoryReport.refresh.label" defaultMessage="Refresh" />
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={exportReport}
              >
                <Translate id="react.inventoryReport.export.label" defaultMessage="Export" />
              </button>
            </div>
          </Section>
        </div>
        <div className="flex-grow-1" style={{ minWidth: 0 }}>
          <Section
            title={{ label: 'react.inventoryReport.results.label', defaultMessage: 'Inventory Report' }}
          >
            {rows === null ? (
              <div className="text-muted">
                <Translate id="react.inventoryReport.runPrompt.label" defaultMessage="Select statuses and refresh to see results" />
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm" data-testid="inventory-report-table">
                  <thead>
                    <tr>
                      <th>{translate('react.inventoryReport.statusColumn.label', 'Status')}</th>
                      <th>{translate('react.inventoryReport.name.label', 'Name')}</th>
                      <th>{translate('react.inventoryReport.productCodes.label', 'Product codes')}</th>
                      <th>{translate('react.inventoryReport.minQuantity.label', 'Min')}</th>
                      <th>{translate('react.inventoryReport.reorderQuantity.label', 'Reorder')}</th>
                      <th>{translate('react.inventoryReport.maxQuantity.label', 'Max')}</th>
                      <th>{translate('react.inventoryReport.onHandQuantity.label', 'QoH')}</th>
                      <th>{translate('react.inventoryReport.totalValue.label', 'Total Value')}</th>
                      <th>{translate('react.inventoryReport.hasProductGroup.label', 'Has Product Group')}</th>
                      <th>{translate('react.inventoryReport.hasInventoryLevel.label', 'Has Inventory Level')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, index) => (
                      // eslint-disable-next-line react/no-array-index-key
                      <tr key={index} style={{ color: STATUS_COLORS[row.status] }}>
                        <td>{row.status}</td>
                        <td>
                          {row.id ? (
                            <a href={PRODUCT_GROUP_URL.edit(row.id)} target="_blank" rel="noopener noreferrer">
                              {row.name}
                            </a>
                          ) : row.name}
                        </td>
                        <td>{row.productCodes}</td>
                        <td>
                          {row.inventoryLevelId ? (
                            <a href={INVENTORY_LEVEL_URL.edit(row.inventoryLevelId)} target="_blank" rel="noopener noreferrer">
                              {row.minQuantity}
                            </a>
                          ) : row.minQuantity}
                        </td>
                        <td>
                          {row.inventoryLevelId ? (
                            <a href={INVENTORY_LEVEL_URL.edit(row.inventoryLevelId)} target="_blank" rel="noopener noreferrer">
                              {row.reorderQuantity}
                            </a>
                          ) : row.reorderQuantity}
                        </td>
                        <td>
                          {row.inventoryLevelId ? (
                            <a href={INVENTORY_LEVEL_URL.edit(row.inventoryLevelId)} target="_blank" rel="noopener noreferrer">
                              {row.maxQuantity}
                            </a>
                          ) : row.maxQuantity}
                        </td>
                        <td>{row.onHandQuantity}</td>
                        <td>{row.totalValue}</td>
                        <td>{String(row.hasProductGroup)}</td>
                        <td>{String(row.hasInventoryLevel)}</td>
                      </tr>
                    ))}
                    {!rows.length && (
                      <tr>
                        <td colSpan={10} className="text-center text-muted">
                          <Translate id="react.inventoryReport.noRecords.label" defaultMessage="No records found" />
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        </div>
      </div>
    </PageWrapper>
  );
};

export default InventoryReport;
