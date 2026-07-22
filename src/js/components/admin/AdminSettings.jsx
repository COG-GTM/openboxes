import React, { useEffect, useState } from 'react';

import PropTypes from 'prop-types';

import adminApi from 'api/services/AdminApi';
import Button from 'components/form-elements/Button';
import notification from 'components/Layout/notifications/notification';
import { ADMIN_URL, CONTEXT_PATH } from 'consts/applicationUrls';
import NotificationType from 'consts/notificationTypes';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import apiClient from 'utils/apiClient';
import Translate from 'utils/Translate';
import HeaderWrapper from 'wrappers/HeaderWrapper';
import PageWrapper from 'wrappers/PageWrapper';

const TABS = [
  { id: 'general', label: 'react.admin.settings.general.label', defaultLabel: 'General settings' },
  { id: 'email', label: 'react.admin.settings.email.label', defaultLabel: 'Email settings' },
  { id: 'externalConfig', label: 'react.admin.settings.externalConfig.label', defaultLabel: 'External application configuration' },
  { id: 'systemProperties', label: 'react.admin.settings.systemProperties.label', defaultLabel: 'System properties' },
  { id: 'printers', label: 'react.admin.settings.printers.label', defaultLabel: 'Printers' },
  { id: 'backgroundJobs', label: 'react.admin.settings.backgroundJobs.label', defaultLabel: 'Background jobs' },
  { id: 'caches', label: 'react.admin.settings.caches.label', defaultLabel: 'Caches' },
];

const PropertiesTable = ({ properties, testId }) => (
  <table className="table table-sm" data-testid={testId}>
    <tbody>
      {Object.entries(properties ?? {}).map(([key, value]) => (
        <tr key={key}>
          <td style={{ wordBreak: 'break-all' }}>{key}</td>
          <td style={{ wordBreak: 'break-all' }}>{value}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

PropertiesTable.propTypes = {
  properties: PropTypes.objectOf(PropTypes.string),
  testId: PropTypes.string.isRequired,
};

PropertiesTable.defaultProps = {
  properties: {},
};

const AdminSettings = () => {
  useTranslation('admin', 'default');

  const translate = useTranslate();

  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('general');
  const [jobStatus, setJobStatus] = useState('');

  useEffect(() => {
    adminApi.getSettings()
      .then((response) => setSettings(response?.data?.data))
      .finally(() => setLoading(false));
  }, []);

  const callJsonEndpoint = async (action, updateStatus) => {
    const response = await apiClient.get(`${CONTEXT_PATH}/json/${action}`);
    if (updateStatus) {
      setJobStatus(typeof response?.data === 'string' ? response.data : JSON.stringify(response?.data));
    }
  };

  const triggerStockAlerts = async () => {
    const response = await adminApi.triggerStockAlerts();
    notification(NotificationType.INFO)({
      message: response?.data?.data?.message,
    });
  };

  if (loading) {
    return (
      <PageWrapper>
        <div className="text-center text-muted p-3">
          <Translate id="react.default.loading.label" defaultMessage="Loading..." />
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <HeaderWrapper className="align-items-center h-auto py-3">
        <span className="title">
          <Translate id="react.admin.settings.label" defaultMessage="Settings" />
        </span>
      </HeaderWrapper>
      <div className="p-3">
        <ul className="nav nav-tabs" data-testid="settings-tabs">
          {TABS.map((tab) => (
            <li className="nav-item" key={tab.id}>
              <button
                type="button"
                className={`nav-link btn btn-link ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {translate(tab.label, tab.defaultLabel)}
              </button>
            </li>
          ))}
          <li className="nav-item">
            <a className="nav-link" href={ADMIN_URL.showDatabaseStatus()}>
              {translate('react.admin.settings.databaseStatus.label', 'Database Status')}
            </a>
          </li>
          <li className="nav-item">
            <a className="nav-link" href={ADMIN_URL.showDatabaseProcessList()}>
              {translate('react.admin.settings.databaseProcessList.label', 'Database Process List')}
            </a>
          </li>
        </ul>
        <div className="pt-3">
          {activeTab === 'general' && (
            <table className="table table-sm" data-testid="settings-general">
              <tbody>
                <tr>
                  <td>{translate('react.admin.settings.environment.label', 'Environment')}</td>
                  <td>{settings?.environment}</td>
                </tr>
                <tr>
                  <td>{translate('react.admin.settings.appVersion.label', 'Version')}</td>
                  <td>
                    {settings?.appVersion}
                    {' '}
                    <a href={ADMIN_URL.showUpgrade()}>
                      {translate('react.admin.settings.upgrade.label', 'Upgrade')}
                    </a>
                  </td>
                </tr>
                <tr>
                  <td>{translate('react.admin.settings.buildNumber.label', 'Build Number')}</td>
                  <td>{settings?.buildNumber}</td>
                </tr>
                <tr>
                  <td>{translate('react.admin.settings.buildDate.label', 'Build Date')}</td>
                  <td>
                    {settings?.buildDate
                      ?? translate('react.admin.settings.realTimeBuild.label', 'Real-time build')}
                  </td>
                </tr>
                <tr>
                  <td>{translate('react.admin.settings.branchName.label', 'Branch Name')}</td>
                  <td>{settings?.branchName}</td>
                </tr>
                <tr>
                  <td>{translate('react.admin.settings.grailsVersion.label', 'Grails Version')}</td>
                  <td>{settings?.grailsVersion}</td>
                </tr>
                <tr>
                  <td>{translate('react.admin.settings.date.label', 'Date')}</td>
                  <td>{settings?.currentDate}</td>
                </tr>
                <tr>
                  <td>{translate('react.admin.settings.locale.label', 'Locale')}</td>
                  <td>
                    <ul className="list-unstyled mb-0">
                      {(settings?.locales ?? []).map((locale) => (
                        <li key={locale.code}>
                          {locale.displayName}
                          {locale.current
                            && ` (${translate('react.admin.settings.currentLocale.label', 'current')})`}
                        </li>
                      ))}
                    </ul>
                  </td>
                </tr>
                <tr>
                  <td>{translate('react.admin.settings.defaultCharset.label', 'Default Charset')}</td>
                  <td>{settings?.defaultCharset}</td>
                </tr>
              </tbody>
            </table>
          )}
          {activeTab === 'email' && (
            <PropertiesTable properties={settings?.mailSettings} testId="settings-email" />
          )}
          {activeTab === 'externalConfig' && (
            <>
              <table className="table table-sm">
                <tbody>
                  <tr>
                    <td>{translate('react.admin.settings.externalConfigFile.label', 'External config file')}</td>
                    <td style={{ wordBreak: 'break-all' }}>{settings?.externalConfigFile}</td>
                  </tr>
                </tbody>
              </table>
              <PropertiesTable properties={settings?.configProperties} testId="settings-external-config" />
            </>
          )}
          {activeTab === 'systemProperties' && (
            <PropertiesTable properties={settings?.systemProperties} testId="settings-system-properties" />
          )}
          {activeTab === 'printers' && (
            <table className="table table-sm" data-testid="settings-printers">
              <thead>
                <tr>
                  <th>{translate('react.admin.settings.printers.name.label', 'Name')}</th>
                  <th>{translate('react.admin.settings.printers.attributes.label', 'Attributes')}</th>
                  <th>{translate('react.admin.settings.printers.docFlavors.label', 'Doc Flavors')}</th>
                  <th>{translate('react.admin.settings.printers.attributeCategories.label', 'Attribute Categories')}</th>
                </tr>
              </thead>
              <tbody>
                {(settings?.printers ?? []).map((printer) => (
                  <tr key={printer.name}>
                    <td>{printer.name}</td>
                    <td>
                      <ul className="list-unstyled mb-0">
                        {(printer.attributes ?? []).map((attribute) => (
                          <li key={attribute.name}>
                            {attribute.name}
                            {': '}
                            {attribute.value}
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td>
                      <div style={{ overflow: 'auto', maxHeight: '200px' }}>
                        <ul className="list-unstyled mb-0">
                          {(printer.docFlavors ?? []).map((mimeType) => (
                            <li key={mimeType}>{mimeType}</li>
                          ))}
                        </ul>
                      </div>
                    </td>
                    <td>
                      <div style={{ overflow: 'auto', maxHeight: '200px' }}>
                        <ul className="list-unstyled mb-0">
                          {(printer.attributeCategories ?? []).map((category) => (
                            <li key={category.name}>
                              {category.name}
                              {category.defaultValue != null && `: ${category.defaultValue}`}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </td>
                  </tr>
                ))}
                {(settings?.printers ?? []).length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center text-muted">
                      <Translate id="react.admin.settings.printers.empty.label" defaultMessage="No printers found" />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
          {activeTab === 'backgroundJobs' && (
            <div data-testid="settings-background-jobs">
              <h5>
                {settings?.quartz?.schedulerName}
                {' '}
                {settings?.quartz?.schedulerInstanceId}
              </h5>
              <table className="table table-sm">
                <tbody>
                  <tr>
                    <td>{translate('react.admin.settings.schedulerMetadata.label', 'Scheduler Metadata')}</td>
                    <td>
                      <pre className="mb-0">{settings?.quartz?.metaData}</pre>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      {translate('react.admin.settings.calculateHistoricalQuantityJob.label', 'Calculate Historical Quantity Job Status')}
                    </td>
                    <td>
                      <span className="pr-2" data-testid="job-status">{jobStatus}</span>
                      <div className="d-flex gap-8">
                        <Button
                          defaultLabel="Show Status"
                          label="react.admin.settings.showStatus.label"
                          variant="secondary"
                          onClick={() => callJsonEndpoint('statusCalculateHistoricalQuantityJob', true)}
                        />
                        <Button
                          defaultLabel="Enable"
                          label="react.admin.settings.enable.label"
                          variant="secondary"
                          onClick={() => callJsonEndpoint('enableCalculateHistoricalQuantityJob')}
                        />
                        <Button
                          defaultLabel="Disable"
                          label="react.admin.settings.disable.label"
                          variant="secondary"
                          onClick={() => callJsonEndpoint('disableCalculateHistoricalQuantityJob')}
                        />
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td>{translate('react.admin.settings.sendStockAlertsJob.label', 'Send Stock Alerts Job')}</td>
                    <td>
                      <Button
                        defaultLabel="Trigger"
                        label="react.admin.settings.trigger.label"
                        variant="secondary"
                        onClick={triggerStockAlerts}
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
              <PropertiesTable properties={settings?.quartz?.jobsProperties} testId="settings-jobs-properties" />
              <a href={`${CONTEXT_PATH}/quartz/list`}>
                <Button
                  defaultLabel="Background Jobs"
                  label="react.admin.settings.backgroundJobs.label"
                  variant="secondary"
                />
              </a>
            </div>
          )}
          {activeTab === 'caches' && (
            <table className="table table-sm" data-testid="settings-caches">
              <thead>
                <tr>
                  <th>name</th>
                  <th>status</th>
                  <th>eternal</th>
                  <th>overflowToDisk</th>
                  <th>maxElementsInMemory</th>
                  <th>maxElementsOnDisk</th>
                  <th>memoryStoreEvictionPolicy</th>
                  <th>timeToLiveSeconds</th>
                  <th>timeToIdleSeconds</th>
                  <th>diskPersistent</th>
                  <th>diskExpiryThreadIntervalSeconds</th>
                </tr>
              </thead>
              <tbody />
            </table>
          )}
        </div>
      </div>
    </PageWrapper>
  );
};

export default AdminSettings;
