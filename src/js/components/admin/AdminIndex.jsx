import React, { useEffect, useState } from 'react';

import adminApi from 'api/services/AdminApi';
import { CONTEXT_PATH } from 'consts/applicationUrls';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';
import HeaderWrapper from 'wrappers/HeaderWrapper';
import PageWrapper from 'wrappers/PageWrapper';

const AdminIndex = () => {
  useTranslation('admin', 'default');

  const [controllers, setControllers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getControllers()
      .then((response) => setControllers(response?.data?.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageWrapper>
      <HeaderWrapper className="align-items-center h-auto py-3">
        <span className="title">
          <Translate id="react.admin.controllers.label" defaultMessage="Controllers" />
        </span>
      </HeaderWrapper>
      <div className="p-3">
        {loading ? (
          <div className="text-center text-muted p-3">
            <Translate id="react.default.loading.label" defaultMessage="Loading..." />
          </div>
        ) : (
          <ul className="list-unstyled mb-0 row" data-testid="admin-controllers">
            {controllers.map((controller) => (
              <li key={controller.fullName} className="col-md-6 py-1">
                <a href={`${CONTEXT_PATH}${controller.uri}`}>{controller.fullName}</a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageWrapper>
  );
};

export default AdminIndex;
