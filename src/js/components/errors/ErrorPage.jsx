import React, { useEffect, useState } from 'react';

import { RiArrowGoBackLine, RiBugLine } from 'react-icons/ri';
import Modal from 'react-modal';

import errorsApi from 'api/services/ErrorsApi';
import Button from 'components/form-elements/Button';
import { DASHBOARD_URL, ERROR_URL } from 'consts/applicationUrls';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';

import './ErrorPages.scss';

Modal.setAppElement('#root');

const ErrorPage = () => {
  useTranslation('error', 'default');

  const [details, setDetails] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [comments, setComments] = useState('');
  const [validationError, setValidationError] = useState(false);

  useEffect(() => {
    errorsApi.getErrorDetails()
      .then((response) => setDetails(response.data.data));
  }, []);

  const error = details?.error;
  const summary = error?.exceptionClass
    ? `${error.exceptionClass}: ${error.exceptionMessage ?? ''}`
    : error?.message;

  const onReportSubmit = (event) => {
    if (!comments) {
      event.preventDefault();
      setValidationError(true);
    }
  };

  const onIgnoreError = (event) => {
    if (window.history.length > 1) {
      event.preventDefault();
      window.history.go(-1);
    }
  };

  return (
    <div className="error-page">
      <div className="error-page__actions d-flex flex-row mb-3">
        <a className="btn btn-outline-primary mr-2" href={DASHBOARD_URL.base} onClick={onIgnoreError}>
          <RiArrowGoBackLine />
          {' '}
          <Translate id="react.error.ignoreError.label" defaultMessage="Ignore Error" />
        </a>
        <Button
          defaultLabel="Report as Bug"
          label="react.error.reportAsBug.label"
          onClick={() => setIsDialogOpen(true)}
          StartIcon={<RiBugLine />}
        />
      </div>
      <div className="error-page__summary" role="alert" aria-label="error-message">
        <h1 className="error-page__title">
          <Translate id="react.error.errorOccurred.label" defaultMessage="An error has occurred" />
        </h1>
        {error?.exceptionClass && (
          <div>
            <strong>
              <Translate id="react.error.exception.label" defaultMessage="Exception" />
              :
            </strong>
            {' '}
            {error.exceptionClass}
          </div>
        )}
        {(error?.exceptionMessage || error?.message) && (
          <div>
            <strong>
              <Translate id="react.error.message.label" defaultMessage="Message" />
              :
            </strong>
            {' '}
            {error?.exceptionMessage ?? error?.message}
          </div>
        )}
        {error?.uri && (
          <div>
            <strong>
              <Translate id="react.error.path.label" defaultMessage="Path" />
              :
            </strong>
            {' '}
            {error.uri}
          </div>
        )}
        {error?.stackTrace?.length > 0 && (
          <pre className="error-page__stack-trace scrollbar">
            {error.stackTrace.join('\n')}
          </pre>
        )}
      </div>
      <Modal
        isOpen={isDialogOpen}
        onRequestClose={() => setIsDialogOpen(false)}
        portalClassName="error-page__dialog"
        contentLabel="Report a Bug"
      >
        <h2>
          <Translate id="react.error.reportABug.label" defaultMessage="Report a Bug" />
        </h2>
        {details?.mailEnabled ? (
          <form method="post" action={ERROR_URL.processError()} onSubmit={onReportSubmit}>
            {validationError && (
              <ul className="errors" role="alert">
                <li>
                  <Translate
                    id="react.error.reportCommentsRequired.message"
                    defaultMessage="Please describe your bug, including steps to reproduce and any other information you can gather."
                  />
                </li>
              </ul>
            )}
            <input type="hidden" name="reportedBy" value={details?.user?.username ?? ''} />
            <input type="hidden" name="targetUri" value={error?.uri ?? ''} />
            <input type="hidden" name="request.statusCode" value={error?.statusCode ?? ''} />
            <input type="hidden" name="request.errorMessage" value={error?.message ?? ''} />
            <input type="hidden" name="exception.message" value={error?.exceptionMessage ?? ''} />
            <input type="hidden" name="exception.class" value={error?.exceptionClass ?? ''} />
            <input type="hidden" name="exception.date" value={error?.timestamp ?? ''} />
            <input
              type="hidden"
              name="absoluteTargetUri"
              value={error?.uri ? `${window.location.origin}${error.uri}` : ''}
            />
            <input type="hidden" name="stacktrace" value={error?.stackTrace?.join('\n') ?? ''} />
            <table className="error-page__dialog-table">
              <tbody>
                <tr>
                  <td>
                    <Translate id="react.error.reportedTo.label" defaultMessage="Reported To" />
                  </td>
                  <td>
                    {details?.recipients?.length
                      ? details.recipients.join(';')
                      : 'errors@openboxes.com'}
                  </td>
                </tr>
                <tr>
                  <td>
                    <Translate id="react.error.reportedBy.label" defaultMessage="Reported By" />
                  </td>
                  <td>
                    {details?.user?.name}
                    {' '}
                    {details?.user?.email && (
                      <a href={`mailto:${details.user.email}`} target="_blank" rel="noreferrer">
                        {details.user.email}
                      </a>
                    )}
                    {' '}
                    <label htmlFor="ccMe" className="mb-0">
                      <input type="checkbox" id="ccMe" name="ccMe" value="true" defaultChecked />
                      {' '}
                      <Translate id="react.error.reportCcMe.label" defaultMessage="CC Me" />
                    </label>
                  </td>
                </tr>
                <tr>
                  <td>
                    <Translate id="react.error.summary.label" defaultMessage="Summary" />
                  </td>
                  <td>
                    <input
                      type="text"
                      name="summary"
                      className="form-control"
                      defaultValue={summary ?? ''}
                    />
                  </td>
                </tr>
                <tr>
                  <td>
                    <Translate id="react.error.details.label" defaultMessage="Details" />
                  </td>
                  <td>
                    <textarea
                      name="comments"
                      className="form-control"
                      rows={10}
                      value={comments}
                      onChange={(event) => {
                        setComments(event.target.value);
                        setValidationError(false);
                      }}
                    />
                  </td>
                </tr>
                <tr>
                  <td />
                  <td>
                    <button type="submit" className="btn btn-primary mr-2">
                      <Translate id="react.default.button.submit.label" defaultMessage="Submit" />
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      <Translate id="react.default.button.close.label" defaultMessage="Close" />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </form>
        ) : (
          <div className="text-center">
            <Translate
              id="react.error.reportDisabled.message"
              defaultMessage="Error reporting is disabled"
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ErrorPage;
