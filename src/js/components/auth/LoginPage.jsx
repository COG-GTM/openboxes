import React, { useState } from 'react';

import queryString from 'query-string';
import { useLocation } from 'react-router-dom';

import authApi from 'api/services/AuthApi';
import { AUTH_URL, CONTEXT_PATH } from 'consts/applicationUrls';
import Translate from 'utils/Translate';

const LoginPage = () => {
  const { search } = useLocation();
  const { targetUri, username: initialUsername } = queryString.parse(search);

  const [username, setUsername] = useState(initialUsername || '');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);
    let browserTimezone = null;
    try {
      browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (e) {
      browserTimezone = null;
    }
    authApi.login({
      username, password, browserTimezone, targetUri,
    })
      .then((response) => {
        const redirectUrl = response?.data?.data?.redirectUrl || '/dashboard/index';
        window.location.href = redirectUrl.startsWith(CONTEXT_PATH)
          ? redirectUrl
          : `${CONTEXT_PATH}${redirectUrl}`;
      })
      .catch((error) => {
        setSubmitting(false);
        setErrorMessage(error?.response?.data?.errorMessage
          || 'Unable to authenticate user. Please try again.');
      });
  };

  return (
    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <div
        className="classic-form"
        style={{
          width: '420px', backgroundColor: '#fff', padding: '24px', borderRadius: '4px', boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
        }}
      >
        <div className="form-title text-center">
          <Translate id="react.auth.login.label" defaultMessage="Login" />
        </div>
        {errorMessage && (
          <div className="alert alert-danger" role="alert">
            {errorMessage}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">
              <Translate id="react.auth.usernameOrEmail.label" defaultMessage="Username or email address" />
            </label>
            <input
              id="username"
              name="username"
              type="text"
              className="form-control"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">
              <Translate id="react.auth.password.label" defaultMessage="Password" />
            </label>
            <input
              id="password"
              name="password"
              type="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button
            type="submit"
            id="loginButton"
            className="btn btn-primary btn-block"
            disabled={submitting}
          >
            <Translate id="react.auth.login.label" defaultMessage="Login" />
          </button>
        </form>
        <div className="text-center mt-3">
          <a href={AUTH_URL.signup()}>
            <Translate id="react.auth.signup.label" defaultMessage="Signup" />
          </a>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
