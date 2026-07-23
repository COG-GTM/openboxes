import React, { useEffect, useState } from 'react';

import migrationApi from 'api/services/MigrationApi';
import MigrationTabs from 'components/migration/MigrationTabs';
import { REPORT_URL } from 'consts/applicationUrls';
import useTranslate from 'hooks/useTranslate';
import Translate from 'utils/Translate';

const MigrationDimensionTables = () => {
  const translate = useTranslate();

  const [counts, setCounts] = useState(null);

  useEffect(() => {
    migrationApi.getDimensionTables()
      .then((response) => setCounts(response?.data?.data));
  }, []);

  const rows = [
    ['dateDimensionCount', 'Date Dimension'],
    ['locationDimensionCount', 'Location Dimension'],
    ['lotDimensionCount', 'Lot Dimension'],
    ['productDimensionCount', 'Product Dimension'],
  ];

  return (
    <MigrationTabs activeTab="dimensionTables">
      <h2 className="font-weight-bold">
        <Translate id="react.migration.dimensionTables.label" defaultMessage="Dimension" />
      </h2>
      <table className="table table-sm" data-testid="dimension-tables-table">
        <thead>
          <tr>
            <th>{translate('react.migration.column.table.label', 'Table')}</th>
            <th>{translate('react.migration.column.count.label', 'Count')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([key, label]) => (
            <tr key={key}>
              <td>{label}</td>
              <td aria-label={label} data-testid={`${key}`}>{counts?.[key] ?? '...'}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td aria-label="No actions" />
            <td>
              <div className="d-flex gap-8">
                <a className="btn btn-outline-danger btn-sm" href={`${REPORT_URL.base}/truncateDimensions`}>Truncate</a>
                <a className="btn btn-outline-primary btn-sm" href={`${REPORT_URL.base}/buildDimensions`}>Build</a>
              </div>
            </td>
          </tr>
        </tfoot>
      </table>
    </MigrationTabs>
  );
};

export default MigrationDimensionTables;
