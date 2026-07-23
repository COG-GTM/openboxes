import React from 'react';

import ErrorPageCard from 'components/errors/ErrorPageCard';
import useTranslation from 'hooks/useTranslation';

const AccessDeniedPage = () => {
  useTranslation('error', 'default');

  return (
    <ErrorPageCard
      titleId="react.error.accessDenied.label"
      titleDefault="Access Denied"
      messageId="react.error.accessDenied.message"
      messageDefault="Apologies, but you are not authorized to access this page or to perform this action."
    />
  );
};

export default AccessDeniedPage;
