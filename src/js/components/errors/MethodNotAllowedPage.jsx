import React from 'react';

import ErrorPageCard from 'components/errors/ErrorPageCard';
import useTranslation from 'hooks/useTranslation';

const MethodNotAllowedPage = () => {
  useTranslation('error', 'default');

  return (
    <ErrorPageCard
      titleId="react.error.methodNotAllowed.label"
      titleDefault="Method Not Allowed"
      titleSuffix="(405)"
      messageId="react.error.methodNotAllowed.message"
      messageDefault="Apologies, but you are not allowed to do *that* on that page."
    />
  );
};

export default MethodNotAllowedPage;
