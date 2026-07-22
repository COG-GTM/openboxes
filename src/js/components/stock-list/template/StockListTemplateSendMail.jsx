import React, { useEffect, useMemo, useState } from 'react';

import { useParams } from 'react-router-dom';
import Alert from 'react-s-alert';

import requisitionTemplateApi from 'api/services/RequisitionTemplateApi';
import StockListTemplateSummary from 'components/stock-list/template/StockListTemplateSummary';
import { REQUISITION_TEMPLATE_URL } from 'consts/applicationUrls';
import useTranslation from 'hooks/useTranslation';
import { debouncePeopleFetch } from 'utils/option-utils';
import Select from 'utils/Select';
import Translate from 'utils/Translate';

const StockListTemplateSendMail = () => {
  const { templateId } = useParams();
  const [template, setTemplate] = useState(null);
  const [recipients, setRecipients] = useState([]);
  const [subject, setSubject] = useState('STOCK LIST UPDATE');
  const [text, setText] = useState('Please find attached a new version of your stock list reflecting recent'
    + ' updates. Please use this version for your next replenishment request.');
  const [includePdf, setIncludePdf] = useState(true);
  const [includeXls, setIncludeXls] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  useTranslation('stockListManagement', 'requisition', 'default');

  const debouncedPeopleFetch = useMemo(() => debouncePeopleFetch(500, 2), []);

  useEffect(() => {
    requisitionTemplateApi.getTemplate(templateId)
      .then(({ data }) => {
        const fetched = data?.data;
        setTemplate(fetched);
        if (fetched?.requestedBy) {
          setRecipients([{
            ...fetched.requestedBy,
            value: fetched.requestedBy.id,
            label: fetched.requestedBy.name,
          }]);
        }
      })
      .catch((err) => {
        setError(err?.response?.data?.errorMessage || 'An error occurred while loading the stock list');
      });
  }, [templateId]);

  const send = async (event) => {
    event.preventDefault();
    setSending(true);
    try {
      await requisitionTemplateApi.sendMail(templateId, {
        subject,
        text,
        recipients: recipients.map((recipient) => recipient.email).filter(Boolean),
        includePdf,
        includeXls,
      });
      Alert.success('Email sent successfully');
      window.location = REQUISITION_TEMPLATE_URL.show(templateId);
    } catch (err) {
      const message = err?.response?.data?.errorMessage;
      if (message) {
        Alert.error(message);
      }
      setSending(false);
    }
  };

  if (error) {
    return <div className="alert alert-danger m-3" role="alert">{error}</div>;
  }

  if (!template) {
    return null;
  }

  if (!template.requestedBy) {
    return (
      <div className="alert alert-warning m-3" role="alert">
        <Translate
          id="react.stockListTemplate.noManagerAssociated.label"
          defaultMessage="There is no manager associated with this stock list. Please assign one before sending an email."
        />
        {' '}
        <a href={REQUISITION_TEMPLATE_URL.editHeader(templateId)}>
          <Translate id="react.stockListTemplate.editHeader.label" defaultMessage="Edit header" />
        </a>
      </div>
    );
  }

  return (
    <div className="d-flex flex-column m-3">
      <StockListTemplateSummary template={template} currentScreen="sendMail" />
      <div className="card">
        <div className="card-header">
          <Translate id="react.stockListTemplate.sendMail.label" defaultMessage="Email stock list" />
        </div>
        <form className="card-body" onSubmit={send}>
          <div className="form-group row">
            <label className="col-sm-3 col-form-label" htmlFor="stocklist-template-recipients-select">
              <Translate id="react.stockListManagement.recipients.label" defaultMessage="Recipients" />
            </label>
            <div className="col-sm-6">
              <Select
                async
                multi
                loadOptions={debouncedPeopleFetch}
                value={recipients}
                onChange={(value) => setRecipients(value || [])}
                valueKey="id"
                labelKey="name"
                id="stocklist-template-recipients-select"
              />
            </div>
          </div>
          <div className="form-group row">
            <label className="col-sm-3 col-form-label" htmlFor="stocklist-template-subject">
              <Translate id="react.stockListManagement.subject.label" defaultMessage="Subject" />
            </label>
            <div className="col-sm-6">
              <input
                id="stocklist-template-subject"
                className="form-control"
                required
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                data-testid="stocklist-template-subject"
              />
            </div>
          </div>
          <div className="form-group row">
            <label className="col-sm-3 col-form-label" htmlFor="stocklist-template-message">
              <Translate id="react.stockListManagement.message.label" defaultMessage="Message" />
            </label>
            <div className="col-sm-6">
              <textarea
                id="stocklist-template-message"
                className="form-control"
                rows="6"
                required
                value={text}
                onChange={(event) => setText(event.target.value)}
                data-testid="stocklist-template-message"
              />
            </div>
          </div>
          <div className="form-group row">
            <div className="col-sm-6 offset-sm-3">
              <div className="form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="stocklist-template-include-pdf"
                  checked={includePdf}
                  onChange={(event) => setIncludePdf(event.target.checked)}
                  data-testid="stocklist-template-include-pdf"
                />
                <label className="form-check-label" htmlFor="stocklist-template-include-pdf">
                  <Translate id="react.stockListManagement.includePdf.label" defaultMessage="Include PDF document" />
                </label>
              </div>
              <div className="form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="stocklist-template-include-xls"
                  checked={includeXls}
                  onChange={(event) => setIncludeXls(event.target.checked)}
                  data-testid="stocklist-template-include-xls"
                />
                <label className="form-check-label" htmlFor="stocklist-template-include-xls">
                  <Translate id="react.stockListManagement.includeXls.label" defaultMessage="Include XLS document" />
                </label>
              </div>
            </div>
          </div>
          <div className="d-flex justify-content-center">
            <a className="btn btn-outline-secondary mr-2" href={REQUISITION_TEMPLATE_URL.show(templateId)}>
              <Translate id="react.default.button.cancel.label" defaultMessage="Cancel" />
            </a>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={sending || !recipients.length}
              data-testid="stocklist-template-send-button"
            >
              <Translate id="react.default.button.send.label" defaultMessage="Send" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StockListTemplateSendMail;
