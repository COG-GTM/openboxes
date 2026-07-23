import React, { useCallback, useEffect, useState } from 'react';

import { useDispatch } from 'react-redux';

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

const MigrationProductAvailability = () => {
  useTranslation('migration', 'default');

  const dispatch = useDispatch();
  const translate = useTranslate();

  const [rows, setRows] = useState([]);
  const [calculated, setCalculated] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchRows = useCallback(() => {
    setLoading(true);
    migrationApi.getProductAvailability()
      .then((response) => setRows(response?.data?.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const calculate = async (locationId) => {
    setCalculated((prev) => ({ ...prev, [locationId]: '...' }));
    const response = await migrationApi.calculateProductAvailability(locationId);
    setCalculated((prev) => ({ ...prev, [locationId]: response?.data?.data?.count }));
  };

  const calculateAll = async () => {
    // Sequential on purpose: each calculation is an expensive query
    // eslint-disable-next-line no-restricted-syntax
    for (const row of rows) {
      // eslint-disable-next-line no-await-in-loop
      await calculate(row.locationId);
    }
  };

  const refreshLocation = async (locationId) => {
    dispatch(showSpinner());
    try {
      await migrationApi.refreshProductAvailability(locationId);
      notification(NotificationType.SUCCESS)({
        message: translate('react.migration.refresh.success.label', 'Refresh completed successfully'),
      });
      fetchRows();
    } finally {
      dispatch(hideSpinner());
    }
  };

  return (
    <PageWrapper>
      <HeaderWrapper className="align-items-center h-auto py-3">
        <span className="title">
          <Translate id="react.migration.productAvailability.label" defaultMessage="Product Availability" />
        </span>
        <div className="d-flex justify-content-end buttons align-items-center gap-8">
          <a href={MIGRATION_URL.index()}>
            <Button
              defaultLabel="Back to Migrations"
              label="react.migration.backToMigrations.label"
              variant="primary-outline"
            />
          </a>
          <Button
            defaultLabel="Fetch All"
            label="react.migration.fetchAll.label"
            variant="primary"
            onClick={calculateAll}
          />
        </div>
      </HeaderWrapper>
      <div className="p-3">
        {loading ? (
          <div className="text-center text-muted p-3">
            <Translate id="react.default.loading.label" defaultMessage="Loading..." />
          </div>
        ) : (
          <table className="table table-sm" data-testid="product-availability">
            <thead>
              <tr>
                <th aria-label={translate('react.migration.location.label', 'Location')}>
                  <Translate id="react.migration.location.label" defaultMessage="Location" />
                </th>
                <th aria-label={translate('react.migration.productAvailability.label', 'Product Availability')}>
                  <Translate id="react.migration.productAvailability.label" defaultMessage="Product Availability" />
                </th>
                <th aria-label={translate('react.migration.calculated.label', 'Calculated')}>
                  <Translate id="react.migration.calculated.label" defaultMessage="Calculated" />
                </th>
                <th aria-label={translate('react.migration.actions.label', 'Actions')}>
                  <Translate id="react.migration.actions.label" defaultMessage="Actions" />
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.locationId}>
                  <td>{row.locationName}</td>
                  <td data-testid={`product-availability-count-${row.locationId}`}>
                    {row.productAvailabilityCount}
                  </td>
                  <td data-testid={`calculated-${row.locationId}`}>
                    {calculated[row.locationId] !== undefined ? (
                      calculated[row.locationId]
                    ) : (
                      <Button
                        defaultLabel="Fetch"
                        label="react.migration.fetch.label"
                        variant="primary-outline"
                        onClick={() => calculate(row.locationId)}
                      />
                    )}
                  </td>
                  <td>
                    <div className="d-flex gap-8">
                      <a
                        className="btn btn-outline-primary"
                        href={MIGRATION_URL.compareProductAvailability(row.locationId)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Translate id="react.migration.showDiff.label" defaultMessage="Show diff" />
                      </a>
                      <a
                        className="btn btn-outline-primary"
                        href={MIGRATION_URL.compareProductAvailability(row.locationId, true)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Translate id="react.migration.showAll.label" defaultMessage="Show all" />
                      </a>
                      <Button
                        defaultLabel="Refresh"
                        label="react.migration.refresh.label"
                        variant="primary-outline"
                        onClick={() => refreshLocation(row.locationId)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </PageWrapper>
  );
};

export default MigrationProductAvailability;
