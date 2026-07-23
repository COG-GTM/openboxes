import React, { useEffect, useState } from 'react';

import queryString from 'query-string';
import { RiErrorWarningLine } from 'react-icons/ri';
import { useLocation, useParams } from 'react-router-dom';

import { ERROR_DETAILS_API } from 'api/urls';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import apiClient from 'utils/apiClient';
import Translate from 'utils/Translate';
import HeaderWrapper from 'wrappers/HeaderWrapper';
import PageWrapper from 'wrappers/PageWrapper';

const NotFoundPage = () => {
  useTranslation('notFound', 'errors', 'default');

  const translate = useTranslate();
  const { search } = useLocation();
  const params = useParams();
  // The Grails redirect passes the record id as a path segment
  // (/errors/handleNotFound/{id}); support a query param as a fallback.
  const id = params.id || queryString.parse(search).id;

  const [details, setDetails] = useState(null);

  useEffect(() => {
    apiClient.get(ERROR_DETAILS_API)
      .then((response) => setDetails(response?.data?.data))
      .catch(() => setDetails(null));
  }, []);

  return (
    <PageWrapper>
      <HeaderWrapper className="align-items-center h-auto py-3">
        <span className="title">
          <Translate id="react.notFound.label" defaultMessage="Page Not Found" />
        </span>
      </HeaderWrapper>
      <div className="p-3">
        <div className="alert alert-danger d-flex align-items-center" role="alert" data-testid="not-found-summary">
          <RiErrorWarningLine className="mr-2" size="1.5em" />
          {id
            ? (translate('react.notFound.resourceWithIdNotFound.label', 'Sorry, a resource with ID {0} could not be found.') ?? '').replace('{0}', id)
            : `${translate('react.notFound.resourceNotFound.label', 'Resource Not Found') ?? ''} (404)`}
        </div>
        <div data-testid="not-found-message">
          {details?.errorMessage && (
            <p>{details.errorMessage}</p>
          )}
          <p>
            <Translate
              id="react.notFound.resourceNotFound.message"
              defaultMessage="Sorry, that resource could not be found."
            />
          </p>
        </div>
      </div>
    </PageWrapper>
  );
};

export default NotFoundPage;
