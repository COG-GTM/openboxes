import React, { useEffect, useState } from 'react';

import authApi from 'api/services/AuthApi';
import { AUTH_URL } from 'consts/applicationUrls';
import Translate from 'utils/Translate';

const SignupPage = () => {
  const [config, setConfig] = useState(null);
  const [values, setValues] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    passwordConfirm: '',
    locale: '',
    timezone: '',
    additionalQuestions: {},
    comments: '',
  });
  const [errorMessages, setErrorMessages] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    authApi.getSignupConfig().then((response) => setConfig(response.data.data));
  }, []);

  // Load the reCAPTCHA v2 widget when it is enabled (parity with the GSP screen)
  useEffect(() => {
    if (config?.recaptchaEnabled && !window.grecaptcha) {
      const script = document.createElement('script');
      script.src = 'https://www.google.com/recaptcha/api.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, [config?.recaptchaEnabled]);

  const setValue = (name, value) => setValues((prev) => ({ ...prev, [name]: value }));

  const handleSubmit = (event) => {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessages([]);
    const payload = {
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      password: values.password,
      passwordConfirm: values.passwordConfirm,
      locale: values.locale || null,
      timezone: values.timezone || null,
      additionalQuestions: {
        ...values.additionalQuestions,
        comments: values.comments,
      },
    };
    if (config?.recaptchaEnabled && window.grecaptcha) {
      payload['g-recaptcha-response'] = window.grecaptcha.getResponse();
    }
    authApi.signup(payload)
      .then((response) => {
        setSuccessMessage(response?.data?.data?.message
          || 'Your account has been created and is under review.');
        setSubmitting(false);
        setTimeout(() => {
          window.location.href = AUTH_URL.login();
        }, 3000);
      })
      .catch((error) => {
        setSubmitting(false);
        const messages = error?.response?.data?.errorMessages
          || [error?.response?.data?.errorMessage || 'Unable to create account. Please try again.'];
        setErrorMessages(messages);
      });
  };

  let timezones = [];
  try {
    timezones = Intl.supportedValuesOf('timeZone');
  } catch (e) {
    timezones = [];
  }

  return (
    <div className="d-flex justify-content-center align-items-center py-4" style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <div
        className="classic-form"
        style={{
          width: '520px', backgroundColor: '#fff', padding: '24px', borderRadius: '4px', boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
        }}
      >
        <div className="form-title text-center">
          <Translate id="react.auth.signup.label" defaultMessage="Signup" />
        </div>
        {successMessage && (
          <div className="alert alert-success" role="alert">{successMessage}</div>
        )}
        {errorMessages.length > 0 && (
          <div className="alert alert-danger" role="alert">
            <ul className="mb-0">
              {errorMessages.map((message) => <li key={message}>{message}</li>)}
            </ul>
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="firstName">
              <span className="text-danger">* </span>
              <Translate id="react.auth.firstName.label" defaultMessage="First name" />
            </label>
            <input id="firstName" type="text" className="form-control" value={values.firstName} onChange={(e) => setValue('firstName', e.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="lastName">
              <span className="text-danger">* </span>
              <Translate id="react.auth.lastName.label" defaultMessage="Last name" />
            </label>
            <input id="lastName" type="text" className="form-control" value={values.lastName} onChange={(e) => setValue('lastName', e.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="email">
              <span className="text-danger">* </span>
              <Translate id="react.auth.email.label" defaultMessage="Email" />
            </label>
            <input id="email" type="text" className="form-control" autoComplete="off" value={values.email} onChange={(e) => setValue('email', e.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="password">
              <span className="text-danger">* </span>
              <Translate id="react.auth.password.label" defaultMessage="Password" />
            </label>
            <input id="password" type="password" className="form-control" autoComplete="off" value={values.password} onChange={(e) => setValue('password', e.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="passwordConfirm">
              <span className="text-danger">* </span>
              <Translate id="react.auth.confirmPassword.label" defaultMessage="Confirm Password" />
            </label>
            <input id="passwordConfirm" type="password" className="form-control" value={values.passwordConfirm} onChange={(e) => setValue('passwordConfirm', e.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="locale">
              <Translate id="react.auth.locale.label" defaultMessage="Locale" />
            </label>
            <select id="locale" className="form-control" value={values.locale} onChange={(e) => setValue('locale', e.target.value)}>
              <option value="" aria-label="No locale selected" />
              {(config?.supportedLocales || []).map((locale) => (
                <option key={locale.code} value={locale.code}>{locale.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="timezone">
              <Translate id="react.auth.timezone.label" defaultMessage="Timezone" />
            </label>
            <select id="timezone" className="form-control" value={values.timezone} onChange={(e) => setValue('timezone', e.target.value)}>
              <option value="" aria-label="No timezone selected" />
              {timezones.map((timezone) => (
                <option key={timezone} value={timezone}>{timezone}</option>
              ))}
            </select>
          </div>
          {config?.additionalQuestionsEnabled
            && (config?.additionalQuestions || []).map((question) => (
              <div className="form-group" key={question.id}>
                <label htmlFor={`additionalQuestions-${question.id}`}>{question.label}</label>
                {question.options ? (
                  <select
                    id={`additionalQuestions-${question.id}`}
                    className="form-control"
                    value={values.additionalQuestions[question.id] || ''}
                    onChange={(e) => setValue('additionalQuestions', {
                      ...values.additionalQuestions,
                      [question.id]: e.target.value,
                    })}
                  >
                    <option value="" aria-label="No option selected" />
                    {question.options.map((option) => (
                      <option key={option.key} value={option.key}>{option.value}</option>
                    ))}
                  </select>
                ) : null}
              </div>
            ))}
          <div className="form-group">
            <label htmlFor="comments">
              <Translate id="react.auth.comments.label" defaultMessage="Comments" />
            </label>
            <textarea
              id="comments"
              rows="4"
              className="form-control"
              placeholder="Tell us more about yourself. What features are important to you? Do you need help getting started?"
              value={values.comments}
              onChange={(e) => setValue('comments', e.target.value)}
            />
          </div>
          {config?.recaptchaEnabled && config?.recaptchaSiteKey && (
            <div className="form-group">
              <div className="g-recaptcha" data-sitekey={config.recaptchaSiteKey} />
            </div>
          )}
          <button type="submit" id="signupButton" className="btn btn-primary btn-block" disabled={submitting}>
            <Translate id="react.auth.signup.label" defaultMessage="Signup" />
          </button>
        </form>
        <div className="d-flex justify-content-between mt-3">
          <a href={AUTH_URL.login()}>
            <Translate id="react.auth.login.label" defaultMessage="Login" />
          </a>
          <span className="text-muted">
            <span className="text-danger">* </span>
            <Translate id="react.auth.requiredFields.label" defaultMessage="Required fields" />
          </span>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
