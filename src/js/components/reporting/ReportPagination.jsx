import React from 'react';

import PropTypes from 'prop-types';

import useTranslate from 'hooks/useTranslate';

const ReportPagination = ({
  page, pageSize, total, onPageChange,
}) => {
  const translate = useTranslate();
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const first = total ? (page * pageSize) + 1 : 0;
  const last = Math.min((page + 1) * pageSize, total);

  return (
    <div className="d-flex justify-content-between align-items-center py-2" data-testid="report-pagination">
      <div>
        {`${translate('react.default.showing.label', 'Showing')} ${first} - ${last} ${translate('react.default.of.label', 'of')} ${total} ${translate('react.default.entries.label', 'entries')}`}
      </div>
      <div>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary mr-2"
          disabled={page === 0}
          onClick={() => onPageChange(page - 1)}
        >
          {translate('react.default.button.previous.label', 'Previous')}
        </button>
        <span className="mr-2">{`${page + 1} / ${pageCount}`}</span>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          disabled={page >= pageCount - 1}
          onClick={() => onPageChange(page + 1)}
        >
          {translate('react.default.button.next.label', 'Next')}
        </button>
      </div>
    </div>
  );
};

ReportPagination.propTypes = {
  page: PropTypes.number.isRequired,
  pageSize: PropTypes.number.isRequired,
  total: PropTypes.number.isRequired,
  onPageChange: PropTypes.func.isRequired,
};

export default ReportPagination;
