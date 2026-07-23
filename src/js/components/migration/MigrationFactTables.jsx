import React, { useEffect, useState } from 'react';

import { useDispatch } from 'react-redux';

import { hideSpinner, showSpinner } from 'actions';
import migrationApi from 'api/services/MigrationApi';
import notification from 'components/Layout/notifications/notification';
import MigrationTabs from 'components/migration/MigrationTabs';
import { REPORT_URL } from 'consts/applicationUrls';
import NotificationType from 'consts/notificationTypes';
import useTranslate from 'hooks/useTranslate';
import apiClient from 'utils/apiClient';
import Translate from 'utils/Translate';

const MigrationFactTables = () => {
  const dispatch = useDispatch();
  const translate = useTranslate();

  const [counts, setCounts] = useState(null);

  const fetchCounts = () => migrationApi.getFactTables()
    .then((response) => setCounts(response?.data?.data));

  useEffect(() => {
    fetchCounts();
  }, []);

  // Matches the legacy g:remoteLink refresh actions on the report controller.
  const refresh = async (action) => {
    dispatch(showSpinner());
    try {
      await apiClient.get(`${REPORT_URL.base}/${action}`);
      notification(NotificationType.SUCCESS)({ message: 'Completed migration!' });
      await fetchCounts();
    } finally {
      dispatch(hideSpinner());
    }
  };

  const rows = [
    ['transactionFactCount', 'Transaction Facts', 'refreshTransactionFact'],
    ['consumptionFactCount', 'Consumption Facts', 'refreshConsumptionFact'],
    ['stockoutFactCount', 'Stockout Facts', 'refreshStockoutFact'],
  ];

  return (
    <MigrationTabs activeTab="factTables">
      <h2 className="font-weight-bold">
        <Translate id="react.migration.factTables.label" defaultMessage="Facts" />
      </h2>
      <table className="table table-sm" data-testid="fact-tables-table">
        <thead>
          <tr>
            <th>{translate('react.migration.column.table.label', 'Table')}</th>
            <th>{translate('react.migration.column.count.label', 'Count')}</th>
            <th>{translate('react.migration.column.actions.label', 'Actions')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([key, label, refreshAction]) => (
            <tr key={key}>
              <td>{label}</td>
              <td aria-label={label} data-testid={`${key}`}>{counts?.[key] ?? '...'}</td>
              <td>
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm"
                  onClick={() => refresh(refreshAction)}
                  data-testid={`${key}-refresh-button`}
                >
                  Refresh
                </button>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td aria-label="No actions" />
            <td>
              <div className="d-flex gap-8">
                <a className="btn btn-outline-danger btn-sm" href={`${REPORT_URL.base}/truncateFacts`}>Truncate</a>
                <a className="btn btn-outline-primary btn-sm" href={`${REPORT_URL.base}/buildFacts`}>Build</a>
              </div>
            </td>
            <td aria-label="No actions" />
          </tr>
        </tfoot>
      </table>
    </MigrationTabs>
  );
};

export default MigrationFactTables;
