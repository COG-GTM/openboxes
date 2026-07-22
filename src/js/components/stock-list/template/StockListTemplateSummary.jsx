import React from 'react';

import PropTypes from 'prop-types';

import { REQUISITION_TEMPLATE_URL, STOCKLIST_URL } from 'consts/applicationUrls';
import Translate from 'utils/Translate';

const StockListTemplateSummary = ({ template, currentScreen }) => {
  if (!template?.id) {
    return null;
  }
  const links = [
    { key: 'show', href: REQUISITION_TEMPLATE_URL.show(template.id), label: 'Show' },
    { key: 'editHeader', href: REQUISITION_TEMPLATE_URL.editHeader(template.id), label: 'Edit header' },
    { key: 'edit', href: REQUISITION_TEMPLATE_URL.edit(template.id), label: 'Edit items' },
    { key: 'batch', href: REQUISITION_TEMPLATE_URL.batch(template.id), label: 'Import items' },
    { key: 'sendMail', href: REQUISITION_TEMPLATE_URL.sendMail(template.id), label: 'Email stock list' },
  ];
  return (
    <div className="d-flex align-items-center p-3 bg-white border rounded mb-3">
      <div className="flex-grow-1">
        <h5 className="mb-0" data-testid="stocklist-template-name">
          {template.name}
        </h5>
        <div className="small text-muted">
          {template.origin?.name}
          {template.destination ? ` → ${template.destination.name}` : ''}
          {' · '}
          {template.requisitionItemCount}
          {' '}
          <Translate id="react.stockListTemplate.items.label" defaultMessage="items" />
        </div>
      </div>
      <span className={`badge p-2 mr-3 ${template.isPublished ? 'badge-success' : 'badge-secondary'}`}>
        {template.isPublished
          ? <Translate id="react.stockListTemplate.published.label" defaultMessage="Published" />
          : <Translate id="react.stockListTemplate.draft.label" defaultMessage="Draft" />}
      </span>
      <div>
        {links.map((link) => (
          <a
            key={link.key}
            className={`btn btn-sm mr-1 ${currentScreen === link.key ? 'btn-primary' : 'btn-outline-secondary'}`}
            href={link.href}
          >
            <Translate id={`react.stockListTemplate.${link.key}.label`} defaultMessage={link.label} />
          </a>
        ))}
        <a
          className="btn btn-sm btn-outline-secondary"
          href={STOCKLIST_URL.csv(template.id)}
        >
          <Translate id="react.default.button.export.label" defaultMessage="Export" />
        </a>
      </div>
    </div>
  );
};

export default StockListTemplateSummary;

StockListTemplateSummary.propTypes = {
  template: PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string,
    isPublished: PropTypes.bool,
    requisitionItemCount: PropTypes.number,
    origin: PropTypes.shape({ name: PropTypes.string }),
    destination: PropTypes.shape({ name: PropTypes.string }),
  }),
  currentScreen: PropTypes.string,
};

StockListTemplateSummary.defaultProps = {
  template: null,
  currentScreen: null,
};
