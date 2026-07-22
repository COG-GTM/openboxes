import React, { useEffect, useRef, useState } from 'react';

import adminApi from 'api/services/AdminApi';
import Button from 'components/form-elements/Button';
import notification from 'components/Layout/notifications/notification';
import Section from 'components/Layout/v2/Section';
import NotificationType from 'consts/notificationTypes';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';
import HeaderWrapper from 'wrappers/HeaderWrapper';
import PageWrapper from 'wrappers/PageWrapper';

const AdminSendMail = () => {
  useTranslation('admin', 'default');

  const translate = useTranslate();

  const [to, setTo] = useState('');
  const [from, setFrom] = useState('');
  const [subject, setSubject] = useState('Test email');
  const [includesHtml, setIncludesHtml] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    adminApi.getMailInfo().then((response) => {
      const mailInfo = response?.data?.data;
      setTo(mailInfo?.defaultTo ?? '');
      setFrom(mailInfo?.from ?? '');
    });
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      const formData = new FormData();
      formData.append('to', to);
      formData.append('subject', subject);
      formData.append('message', message);
      if (includesHtml) {
        formData.append('includesHtml', 'on');
      }
      const file = fileRef.current?.files?.[0];
      if (file) {
        formData.append('file', file);
      }
      const response = await adminApi.sendMail(formData);
      notification(NotificationType.INFO)({
        message: response?.data?.data?.message,
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <PageWrapper>
      <HeaderWrapper className="align-items-center h-auto py-3">
        <span className="title">
          <Translate id="react.admin.sendMail.label" defaultMessage="Email" />
        </span>
      </HeaderWrapper>
      <div className="p-3">
        <Section
          title={{ label: 'react.admin.sendMail.label', defaultMessage: 'Email' }}
        >
          <form onSubmit={onSubmit} data-testid="send-mail-form">
            <div className="form-group row">
              <label className="col-sm-2 col-form-label" htmlFor="send-mail-to">
                {translate('react.admin.sendMail.to.label', 'To')}
              </label>
              <div className="col-sm-8">
                <input
                  id="send-mail-to"
                  className="form-control"
                  type="text"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </div>
            </div>
            <div className="form-group row">
              <label className="col-sm-2 col-form-label" htmlFor="send-mail-from">
                {translate('react.admin.sendMail.from.label', 'From')}
              </label>
              <div className="col-sm-8">
                <input
                  id="send-mail-from"
                  className="form-control"
                  type="text"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </div>
            </div>
            <div className="form-group row">
              <label className="col-sm-2 col-form-label" htmlFor="send-mail-subject">
                {translate('react.admin.sendMail.subject.label', 'Subject')}
              </label>
              <div className="col-sm-8">
                <input
                  id="send-mail-subject"
                  className="form-control"
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
            </div>
            <div className="form-group row">
              <label className="col-sm-2 col-form-label" htmlFor="send-mail-includes-html">
                {translate('react.admin.sendMail.includesHtml.label', 'Includes HTML?')}
              </label>
              <div className="col-sm-8 d-flex align-items-center">
                <input
                  id="send-mail-includes-html"
                  type="checkbox"
                  checked={includesHtml}
                  onChange={(e) => setIncludesHtml(e.target.checked)}
                />
              </div>
            </div>
            <div className="form-group row">
              <label className="col-sm-2 col-form-label" htmlFor="send-mail-message">
                {translate('react.admin.sendMail.message.label', 'Message')}
              </label>
              <div className="col-sm-8">
                <textarea
                  id="send-mail-message"
                  className="form-control"
                  rows={10}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>
            </div>
            <div className="form-group row">
              <label className="col-sm-2 col-form-label" htmlFor="send-mail-file">
                {translate('react.admin.sendMail.file.label', 'File')}
              </label>
              <div className="col-sm-8">
                <input id="send-mail-file" type="file" ref={fileRef} />
              </div>
            </div>
            <div className="d-flex gap-8">
              <Button
                type="submit"
                defaultLabel="Send Mail"
                label="react.admin.sendMail.send.label"
                variant="primary"
                disabled={sending}
              />
            </div>
          </form>
        </Section>
      </div>
    </PageWrapper>
  );
};

export default AdminSendMail;
