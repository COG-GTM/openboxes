import React from 'react';

import PropTypes from 'prop-types';

import { CONTEXT_PATH } from 'consts/applicationUrls';
import Translate from 'utils/Translate';

import './ErrorPages.scss';

const ErrorPageCard = ({
  titleId, titleDefault, messageId, messageDefault, titleSuffix, children,
}) => (
  <div className="error-page">
    <div className="error-page__summary">
      <h1 className="error-page__title">
        <Translate id={titleId} defaultMessage={titleDefault} />
        {titleSuffix ? ` ${titleSuffix}` : null}
      </h1>
    </div>
    <div className="error-page__doc">
      <div className="error-page__bubble triangle-isosceles">
        <Translate id={messageId} defaultMessage={messageDefault} />
      </div>
      <div className="error-page__image">
        <img src={`${CONTEXT_PATH}/static/images/jgreenspan.png`} alt="" />
      </div>
    </div>
    {children}
  </div>
);

ErrorPageCard.defaultProps = {
  titleSuffix: null,
  children: null,
};

ErrorPageCard.propTypes = {
  titleId: PropTypes.string.isRequired,
  titleDefault: PropTypes.string.isRequired,
  messageId: PropTypes.string.isRequired,
  messageDefault: PropTypes.string.isRequired,
  titleSuffix: PropTypes.string,
  children: PropTypes.node,
};

export default ErrorPageCard;
