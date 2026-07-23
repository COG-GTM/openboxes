import React from 'react';

import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';

import { MOBILE_URL } from 'consts/applicationUrls';

/**
 * Lightweight mobile chrome mirroring the legacy layouts/mobile.gsp +
 * mobile/menu.gsp navbar (location logo when logged in, OpenBoxes logo
 * otherwise) with the page title below.
 */
const MobileLayout = ({ title, children }) => {
  const logoUrl = useSelector((state) => state.session.logoUrl);
  const currentLocation = useSelector((state) => state.session.currentLocation);

  return (
    <div className="mobile-layout" data-testid="mobile-layout">
      <nav className="navbar navbar-light bg-light px-3">
        <a className="navbar-brand" href={MOBILE_URL.index()}>
          <img
            src={currentLocation?.id && logoUrl ? logoUrl : MOBILE_URL.defaultLogo()}
            alt="logo"
            height="30"
          />
        </a>
      </nav>
      <h1 className="px-3 pt-2">{title}</h1>
      <div className="px-3 pb-3">
        {children}
      </div>
    </div>
  );
};

export default MobileLayout;

MobileLayout.propTypes = {
  title: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};
