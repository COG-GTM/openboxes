import React, { useState } from 'react';

import mobileApi from 'api/services/MobileApi';
import { CONTEXT_PATH, MOBILE_URL } from 'consts/applicationUrls';

/**
 * Mobile login screen. Rendered without an authenticated session, so it
 * avoids translations and session state (the SPA context is unavailable
 * before login) and uses plain strings like the legacy mobile/login.gsp.
 */
const MobileLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const onSubmit = async (event) => {
    event.preventDefault();
    try {
      const response = await mobileApi.login({ username, password });
      const redirectUrl = response?.data?.data?.redirectUrl || '/dashboard/index';
      window.location.assign(redirectUrl.startsWith(CONTEXT_PATH)
        ? redirectUrl
        : `${CONTEXT_PATH}${redirectUrl}`);
    } catch (error) {
      setErrorMessage('Unable to authenticate user. Please verify your username and password and try again.');
    }
  };

  return (
    <div className="mobile-layout" data-testid="mobile-login">
      <nav className="navbar navbar-light bg-light px-3">
        <a className="navbar-brand" href={MOBILE_URL.login()}>
          <img src={MOBILE_URL.defaultLogo()} alt="logo" height="30" />
        </a>
      </nav>
      <h1 className="px-3 pt-2">Login</h1>
      <div className="container">
        {errorMessage && (
          <div className="errors alert alert-danger" role="alert" aria-label="error-message">
            {errorMessage}
          </div>
        )}
        <div className="row">
          <div className="col-sm-12">
            <form onSubmit={onSubmit}>
              <div className="mb-3 form-group">
                <label htmlFor="username" className="form-label">Email address</label>
                <input
                  className="form-control"
                  id="username"
                  name="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                />
              </div>
              <div className="mb-3 form-group">
                <label htmlFor="password" className="form-label">Password</label>
                <input
                  type="password"
                  className="form-control"
                  id="password"
                  name="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
              <div className="d-grid gap-2">
                <button type="submit" className="btn btn-outline-primary btn-block">Login</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileLogin;
