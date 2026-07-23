import React, { useEffect, useState } from 'react';

import adminApi from 'api/services/AdminApi';
import { CONTEXT_PATH } from 'consts/applicationUrls';
import Translate from 'utils/Translate';
import PageWrapper from 'wrappers/PageWrapper';

const AdminStatus = () => {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    adminApi.getStatus().then((response) => setStatus(response.data.data));
  }, []);

  if (!status) {
    return null;
  }

  return (
    <PageWrapper>
      <div className="classic-form with-description">
        <div className="form-title">
          <Translate id="react.admin.status.label" defaultMessage="Application Status" />
        </div>
        <div className="p-3">
          <h2><Translate id="react.admin.status.application.label" defaultMessage="Application Status" /></h2>
          <ul id="application-status">
            <li>
              App version:
              {' '}
              {status.appVersion}
            </li>
            <li>
              Grails version:
              {' '}
              {status.grailsVersion}
            </li>
            <li>
              JVM version:
              {' '}
              {status.jvmVersion}
            </li>
            <li>
              Controllers:
              {' '}
              {status.controllerCount}
            </li>
            <li>
              Domains:
              {' '}
              {status.domainCount}
            </li>
            <li>
              Services:
              {' '}
              {status.serviceCount}
            </li>
            <li>
              Tag Libraries:
              {' '}
              {status.tagLibCount}
            </li>
          </ul>
          <h2><Translate id="react.admin.status.installedPlugins.label" defaultMessage="Installed Plugins" /></h2>
          <ul id="installed-plugins">
            {status.plugins.map((plugin) => (
              <li key={plugin.name}>
                {plugin.name}
                {' '}
                -
                {' '}
                {plugin.version}
              </li>
            ))}
          </ul>
          <h2><Translate id="react.admin.status.availableControllers.label" defaultMessage="Available Controllers" /></h2>
          <ul id="available-controllers">
            {status.controllers.map((controller) => (
              <li key={controller.className} className="controller">
                <a href={`${CONTEXT_PATH}/${controller.logicalName}`}>{controller.className}</a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </PageWrapper>
  );
};

export default AdminStatus;
