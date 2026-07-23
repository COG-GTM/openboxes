import React from 'react';

import PropTypes from 'prop-types';
import { useHistory } from 'react-router-dom';

import { MIGRATION_URL } from 'consts/applicationUrls';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';
import HeaderWrapper from 'wrappers/HeaderWrapper';
import PageWrapper from 'wrappers/PageWrapper';

/**
 * Shared shell for the migration admin dashboard screens. The Materialized
 * Views and Product Availability tabs have not been migrated yet and link to
 * the legacy tabbed GSP dashboard (/migration/legacy).
 */
const MigrationTabs = ({ activeTab, children }) => {
  useTranslation('migration', 'default');

  const history = useHistory();
  const translate = useTranslate();

  const reactTabs = [
    ['dataQuality', translate('react.migration.tab.dataQuality.label', 'Quality'), MIGRATION_URL.dataQuality()],
    ['dataMigration', translate('react.migration.tab.dataMigration.label', 'Migration'), MIGRATION_URL.dataMigration()],
    ['dimensionTables', translate('react.migration.tab.dimensionTables.label', 'Dimensions'), MIGRATION_URL.dimensionTables()],
    ['factTables', translate('react.migration.tab.factTables.label', 'Facts'), MIGRATION_URL.factTables()],
  ];

  const legacyTabs = [
    ['materializedViews', translate('react.migration.tab.materializedViews.label', 'Materialized Views')],
    ['productAvailability', translate('react.migration.tab.productAvailability.label', 'Product Availability')],
  ];

  return (
    <PageWrapper>
      <HeaderWrapper className="align-items-center h-auto py-3">
        <span className="title">
          <Translate id="react.migration.header.label" defaultMessage="Data Migration" />
        </span>
      </HeaderWrapper>
      <div className="p-3">
        <ul className="nav nav-tabs" data-testid="migration-tabs">
          {reactTabs.map(([tab, label, href]) => (
            <li className="nav-item" key={tab}>
              <button
                type="button"
                className={`nav-link btn btn-link ${activeTab === tab ? 'active' : ''}`}
                onClick={() => history.push(href)}
                data-testid={`migration-tab-${tab}`}
              >
                {label}
              </button>
            </li>
          ))}
          {legacyTabs.map(([tab, label]) => (
            <li className="nav-item" key={tab}>
              <button
                type="button"
                className="nav-link btn btn-link"
                onClick={() => { window.location.href = MIGRATION_URL.legacy(); }}
                data-testid={`migration-tab-${tab}`}
              >
                {label}
              </button>
            </li>
          ))}
        </ul>
        <div className="border border-top-0 p-3 bg-white">
          {children}
        </div>
      </div>
    </PageWrapper>
  );
};

export default MigrationTabs;

MigrationTabs.propTypes = {
  activeTab: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};
