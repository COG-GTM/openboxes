import React, { useCallback, useEffect, useState } from 'react';

import { useDispatch } from 'react-redux';
import { useHistory } from 'react-router-dom';

import { hideSpinner, showSpinner } from 'actions';
import migrationApi from 'api/services/MigrationApi';
import Button from 'components/form-elements/Button';
import notification from 'components/Layout/notifications/notification';
import { MIGRATION_URL } from 'consts/applicationUrls';
import NotificationType from 'consts/notificationTypes';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';
import HeaderWrapper from 'wrappers/HeaderWrapper';
import PageWrapper from 'wrappers/PageWrapper';

const MaterializedViews = () => {
  useTranslation('migration', 'default');

  const dispatch = useDispatch();
  const history = useHistory();
  const translate = useTranslate();

  const [counts, setCounts] = useState(null);

  const fetchCounts = useCallback(() => {
    migrationApi.getMaterializedViews()
      .then((response) => setCounts(response?.data?.data));
  }, []);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  const refresh = async (refreshCall) => {
    dispatch(showSpinner());
    try {
      await refreshCall();
      notification(NotificationType.SUCCESS)({
        message: translate('react.migration.refresh.success.label', 'Refresh completed successfully'),
      });
      fetchCounts();
    } finally {
      dispatch(hideSpinner());
    }
  };

  return (
    <PageWrapper>
      <HeaderWrapper className="align-items-center h-auto py-3">
        <span className="title">
          <Translate id="react.migration.materializedViews.label" defaultMessage="Materialized Views" />
        </span>
        <div className="d-flex justify-content-end buttons align-items-center gap-8">
          <a href={MIGRATION_URL.index()}>
            <Button
              defaultLabel="Back to Migrations"
              label="react.migration.backToMigrations.label"
              variant="primary-outline"
            />
          </a>
        </div>
      </HeaderWrapper>
      <div className="p-3">
        <table className="table table-sm w-auto" data-testid="materialized-views">
          <thead>
            <tr>
              <th aria-label={translate('react.migration.table.label', 'Table')}>
                <Translate id="react.migration.table.label" defaultMessage="Table" />
              </th>
              <th aria-label={translate('react.migration.count.label', 'Count')}>
                <Translate id="react.migration.count.label" defaultMessage="Count" />
              </th>
              <th aria-label={translate('react.migration.actions.label', 'Actions')}>
                <Translate id="react.migration.actions.label" defaultMessage="Actions" />
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><Translate id="react.migration.productDemand.label" defaultMessage="Product Demand" /></td>
              <td data-testid="product-demand-count">{counts?.productDemandCount}</td>
              <td>
                <Button
                  defaultLabel="Refresh"
                  label="react.migration.refresh.label"
                  variant="primary-outline"
                  onClick={() => refresh(migrationApi.refreshProductDemand)}
                />
              </td>
            </tr>
            <tr>
              <td><Translate id="react.migration.productAvailability.label" defaultMessage="Product Availability" /></td>
              <td data-testid="product-availability-count">{counts?.productAvailabilityCount}</td>
              <td>
                <div className="d-flex gap-8">
                  <Button
                    defaultLabel="List"
                    label="react.default.button.list.label"
                    variant="primary-outline"
                    onClick={() => history.push(MIGRATION_URL.productAvailability())}
                  />
                  <Button
                    defaultLabel="Refresh"
                    label="react.migration.refresh.label"
                    variant="primary-outline"
                    onClick={() => refresh(() => migrationApi.refreshProductAvailability())}
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </PageWrapper>
  );
};

export default MaterializedViews;
