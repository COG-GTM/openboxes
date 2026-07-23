import React, { useEffect, useState } from 'react';

import errorsApi from 'api/services/ErrorsApi';
import ErrorPageCard from 'components/errors/ErrorPageCard';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';

const DataAccessErrorPage = () => {
  useTranslation('error', 'default');

  const [errorDetails, setErrorDetails] = useState(null);

  useEffect(() => {
    errorsApi.getErrorDetails()
      .then((response) => setErrorDetails(response.data.data?.error));
  }, []);

  return (
    <ErrorPageCard
      titleId="react.error.dataAccess.label"
      titleDefault="Data Access Error"
      messageId="react.error.dataAccess.message"
      messageDefault="Apologies, but you just tried to do something unspeakable to the database."
    >
      {errorDetails && (
        <div className="error-page__details">
          <h2>
            <Translate id="react.error.errorDetails.label" defaultMessage="Error Details" />
          </h2>
          <div className="error-page__details-box">
            {errorDetails.statusCode && (
              <div>
                <strong>Error:</strong>
                {' '}
                {errorDetails.statusCode}
              </div>
            )}
            {errorDetails.message && (
              <div>
                <strong>Message:</strong>
                {' '}
                {errorDetails.message}
              </div>
            )}
            {errorDetails.uri && (
              <div>
                <strong>URI:</strong>
                {' '}
                {errorDetails.uri}
              </div>
            )}
            {errorDetails.exceptionClass && (
              <div>
                <strong>Class:</strong>
                {' '}
                {errorDetails.exceptionClass}
              </div>
            )}
            {errorDetails.exceptionMessage && (
              <div>
                <strong>Exception Message:</strong>
                {' '}
                {errorDetails.exceptionMessage}
              </div>
            )}
          </div>
          {errorDetails.stackTrace?.length > 0 && (
            <>
              <h2>
                <Translate id="react.error.stackTrace.label" defaultMessage="Stack Trace" />
              </h2>
              <pre className="error-page__stack-trace scrollbar">
                {errorDetails.stackTrace.join('\n')}
              </pre>
            </>
          )}
        </div>
      )}
    </ErrorPageCard>
  );
};

export default DataAccessErrorPage;
