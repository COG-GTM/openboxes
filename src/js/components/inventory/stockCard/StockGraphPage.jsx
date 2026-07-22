import React from 'react';

import { getTranslate } from 'react-localize-redux';
import { useSelector } from 'react-redux';

import StockCardHeader from 'components/inventory/stockCard/StockCardHeader';
import useProductId from 'components/inventory/stockCard/useProductId';
import useTranslation from 'hooks/useTranslation';
import Translate, { translateWithDefaultMessage } from 'utils/Translate';
import PageWrapper from 'wrappers/PageWrapper';

import 'components/inventory/styles.scss';

// The legacy showGraph GSP rendered a hard-coded sample "Consumption" plot and
// a "not implemented yet" notice; a real consumption graph is deferred until a
// consumption API exists, so this screen faithfully preserves the placeholder
const SAMPLE_DATA = [
  { date: '2007-01-02', value: 61.05 },
  { date: '2007-01-03', value: 58.32 },
  { date: '2007-01-04', value: 57.35 },
];

const StockGraphPage = () => {
  useTranslation('stockCard', 'inventory');

  const productId = useProductId();
  const translate = useSelector(
    (state) => translateWithDefaultMessage(getTranslate(state.localize)),
  );

  return (
    <PageWrapper className="stock-graph-page">
      <StockCardHeader productId={productId} activeScreen="graph" />
      <div className="p-3">
        <h5>
          <Translate id="react.stockCard.graph.title.label" defaultMessage="Consumption" />
        </h5>
        <div className="alert alert-info">
          <Translate id="react.default.notImplementedYet.message" defaultMessage="This feature has not been implemented yet" />
        </div>
        <table className="table table-sm" style={{ maxWidth: '400px' }}>
          <thead>
            <tr>
              <th>{translate('react.stockCard.date.label', 'Date')}</th>
              <th className="text-right">{translate('react.stockCard.graph.consumption.label', 'Consumption')}</th>
            </tr>
          </thead>
          <tbody>
            {SAMPLE_DATA.map((row) => (
              <tr key={row.date}>
                <td>{row.date}</td>
                <td className="text-right">{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageWrapper>
  );
};

export default StockGraphPage;
