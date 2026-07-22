import React, { useEffect, useState } from 'react';

import adminApi from 'api/services/AdminApi';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';
import HeaderWrapper from 'wrappers/HeaderWrapper';
import PageWrapper from 'wrappers/PageWrapper';

const AdminPlugins = () => {
  useTranslation('admin', 'default');

  const [plugins, setPlugins] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getPlugins()
      .then((response) => setPlugins(response?.data?.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageWrapper>
      <HeaderWrapper className="align-items-center h-auto py-3">
        <span className="title">
          <Translate id="react.admin.plugins.label" defaultMessage="Installed Plug-ins" />
        </span>
      </HeaderWrapper>
      <div className="p-3">
        {loading ? (
          <div className="text-center text-muted p-3">
            <Translate id="react.default.loading.label" defaultMessage="Loading..." />
          </div>
        ) : (
          <ul className="list-unstyled mb-0" data-testid="admin-plugins">
            {plugins.map((plugin) => (
              <li key={plugin.name}>
                {plugin.name}
                {' - '}
                {plugin.version}
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageWrapper>
  );
};

export default AdminPlugins;
