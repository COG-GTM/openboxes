import React from 'react';

import Translate from 'utils/Translate';

const PrintButtons = () => (
  <div className="d-flex mb-3 d-print-none">
    <button type="button" className="btn btn-primary mr-2" onClick={() => window.print()}>
      <Translate id="react.default.button.print.label" defaultMessage="Print" />
    </button>
    <button type="button" className="btn btn-outline-secondary" onClick={() => window.close()}>
      <Translate id="react.default.button.close.label" defaultMessage="Close" />
    </button>
  </div>
);

export default PrintButtons;
