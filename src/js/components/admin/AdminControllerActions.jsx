import React, { useEffect, useState } from 'react';

import adminApi from 'api/services/AdminApi';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';
import HeaderWrapper from 'wrappers/HeaderWrapper';
import PageWrapper from 'wrappers/PageWrapper';

const AdminControllerActions = () => {
  useTranslation('admin', 'default');

  const [actionNames, setActionNames] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getControllerActions()
      .then((response) => setActionNames(response?.data?.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageWrapper>
      <HeaderWrapper className="align-items-center h-auto py-3">
        <span className="title">
          <Translate id="react.admin.controllerActions.label" defaultMessage="Controller Actions" />
        </span>
      </HeaderWrapper>
      <div className="p-3">
        {loading ? (
          <div className="text-center text-muted p-3">
            <Translate id="react.default.loading.label" defaultMessage="Loading..." />
          </div>
        ) : (
          <ul className="list-unstyled mb-0" data-testid="admin-controller-actions">
            {actionNames.map((actionName) => (
              <li key={actionName}>{actionName}</li>
            ))}
          </ul>
        )}
        {!loading && actionNames.length === 0 && (
          <div className="text-center text-muted p-3">
            <Translate id="react.admin.controllerActions.empty.label" defaultMessage="No controller actions found" />
          </div>
        )}
      </div>
    </PageWrapper>
  );
};

export default AdminControllerActions;
