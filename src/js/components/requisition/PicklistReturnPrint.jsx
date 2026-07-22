import React, { useEffect, useMemo, useState } from 'react';

import PropTypes from 'prop-types';
import queryString from 'query-string';
import { getTranslate } from 'react-localize-redux';
import { useSelector } from 'react-redux';
import { useLocation, useParams } from 'react-router-dom';

import requisitionApi from 'api/services/RequisitionApi';
import { BARCODE_URL, PICKLIST_URL } from 'consts/applicationUrls';
import useTranslation from 'hooks/useTranslation';
import Translate, { translateWithDefaultMessage } from 'utils/Translate';

import 'components/requisition/PicklistPrint.scss';

const picklistItemComparator = (a, b) =>
  (a.binLocation?.name ?? '').localeCompare(b.binLocation?.name ?? '')
  || (a.sortOrder ?? 0) - (b.sortOrder ?? 0);

const ItemsTable = ({
  items, testId, translate, sorted,
}) => (
  <table className="table table-sm table-bordered picklist-items-table" data-testid={testId}>
    <thead>
      <tr>
        <th>{translate('react.picklist.product.label', 'Product')}</th>
        <th className="text-right">{translate('react.picklist.requested.label', 'Requested')}</th>
        <th>{translate('react.picklist.lotNumber.label', 'Lot')}</th>
        <th>{translate('react.picklist.expirationDate.label', 'Expires')}</th>
        <th>{translate('react.picklist.binLocation.label', 'Bin')}</th>
        <th className="text-right">{translate('react.picklist.picked.label', 'Picked')}</th>
        <th>{translate('react.picklist.comments.label', 'Comments')}</th>
      </tr>
    </thead>
    <tbody>
      {items.map((item) => {
        // matches legacy _returnPrintPage.gsp: bin-location ordering only when sorted
        const filtered = (item.picklistItems ?? [])
          .filter((picklistItem) => picklistItem.quantity > 0);
        const picklistItems = sorted ? [...filtered].sort(picklistItemComparator) : filtered;
        if (!picklistItems.length) {
          return (
            <tr key={item.id}>
              <td>
                {item.product?.productCode}
                {' '}
                {item.product?.name}
              </td>
              <td className="text-right">{item.quantity}</td>
              <td />
              <td />
              <td />
              <td className="text-right">0</td>
              <td />
            </tr>
          );
        }
        return picklistItems.map((picklistItem, index) => (
          <tr key={picklistItem.id}>
            {index === 0 && (
              <>
                <td rowSpan={picklistItems.length}>
                  {item.product?.productCode}
                  {' '}
                  {item.product?.name}
                </td>
                <td className="text-right" rowSpan={picklistItems.length}>{item.quantity}</td>
              </>
            )}
            <td>{picklistItem.lotNumber}</td>
            <td>{picklistItem.expirationDate}</td>
            <td>{picklistItem.binLocation?.name}</td>
            <td className="text-right">{picklistItem.quantity}</td>
            <td />
          </tr>
        ));
      })}
    </tbody>
  </table>
);

ItemsTable.propTypes = {
  items: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  testId: PropTypes.string.isRequired,
  translate: PropTypes.func.isRequired,
  sorted: PropTypes.bool,
};

ItemsTable.defaultProps = {
  sorted: false,
};

const PicklistReturnPrint = () => {
  const { orderId } = useParams();
  const location = useLocation();
  const sorted = queryString.parse(location.search)?.sorted;
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const translate = useSelector(
    (state) => translateWithDefaultMessage(getTranslate(state.localize)),
  );

  useTranslation('picklist', 'default');

  useEffect(() => {
    requisitionApi.getPicklistReturnPrint(orderId)
      .then((response) => {
        setData(response.data?.data);
      })
      .catch((err) => {
        setError(err?.response?.data?.errorMessage
          || translate('react.default.errors.error.label', 'An error occurred'));
      });
  }, [orderId]);

  const groups = useMemo(() => {
    if (!data) {
      return null;
    }
    const items = data.orderItems;
    return {
      coldChain: items.filter((item) => item.product?.coldChain),
      controlledSubstance: items.filter(
        (item) => !item.product?.coldChain && item.product?.controlledSubstance,
      ),
      hazardousMaterial: items.filter(
        (item) => !item.product?.coldChain && !item.product?.controlledSubstance
          && item.product?.hazardousMaterial,
      ),
      general: items.filter(
        (item) => !item.product?.coldChain && !item.product?.controlledSubstance
          && !item.product?.hazardousMaterial,
      ),
    };
  }, [data]);

  if (error) {
    return <div className="alert alert-danger m-3" role="alert">{error}</div>;
  }

  if (!data) {
    return null;
  }

  const { order, picklist } = data;

  return (
    <div className="picklist-print m-3">
      <div className="d-flex mb-3 d-print-none">
        <button type="button" className="btn btn-primary mr-2" onClick={() => window.print()}>
          <Translate id="react.default.button.print.label" defaultMessage="Print" />
        </button>
        <a className="btn btn-outline-primary mr-2" href={PICKLIST_URL.returnPdf(orderId)} target="_blank" rel="noopener noreferrer">
          <Translate id="react.default.button.download.label" defaultMessage="Download PDF" />
        </a>
        <button type="button" className="btn btn-outline-secondary" onClick={() => window.close()}>
          <Translate id="react.default.button.close.label" defaultMessage="Close" />
        </button>
      </div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3>
          <Translate id="react.picklist.returnPrint.title.label" defaultMessage="Return pick list" />
          {' '}
          {order.orderNumber}
        </h3>
        {order.orderNumber && (
          <div className="text-center">
            <img src={BARCODE_URL.render(order.orderNumber)} alt={order.orderNumber} />
            <div className="small">{order.orderNumber}</div>
          </div>
        )}
      </div>
      <table className="table table-sm table-bordered w-auto" data-testid="picklist-return-print-summary">
        <tbody>
          <tr>
            <th>{translate('react.picklist.description.label', 'Description')}</th>
            <td>{order.name}</td>
          </tr>
          <tr>
            <th>{translate('react.picklist.origin.label', 'Origin')}</th>
            <td>{order.origin?.name}</td>
          </tr>
          <tr>
            <th>{translate('react.picklist.destination.label', 'Destination')}</th>
            <td>{order.destination?.name}</td>
          </tr>
          <tr>
            <th>{translate('react.picklist.orderedBy.label', 'Ordered by')}</th>
            <td>
              {order.orderedBy?.name}
              {' '}
              {order.dateOrdered}
            </td>
          </tr>
        </tbody>
      </table>
      {groups.coldChain.length > 0 && (
        <>
          <h5><Translate id="react.picklist.coldChain.label" defaultMessage="Cold chain" /></h5>
          <ItemsTable items={groups.coldChain} testId="picklist-cold-chain-items" translate={translate} sorted={!!sorted} />
        </>
      )}
      {groups.controlledSubstance.length > 0 && (
        <>
          <h5><Translate id="react.picklist.controlledSubstance.label" defaultMessage="Controlled substance" /></h5>
          <ItemsTable items={groups.controlledSubstance} testId="picklist-controlled-substance-items" translate={translate} sorted={!!sorted} />
        </>
      )}
      {groups.hazardousMaterial.length > 0 && (
        <>
          <h5><Translate id="react.picklist.hazardousMaterial.label" defaultMessage="Hazardous material" /></h5>
          <ItemsTable items={groups.hazardousMaterial} testId="picklist-hazardous-material-items" translate={translate} sorted={!!sorted} />
        </>
      )}
      {groups.general.length > 0 && (
        <>
          <h5><Translate id="react.picklist.general.label" defaultMessage="General" /></h5>
          <ItemsTable items={groups.general} testId="picklist-general-items" translate={translate} sorted={!!sorted} />
        </>
      )}
      <table className="table table-sm table-bordered mt-4 signature-table" data-testid="picklist-signature-table">
        <thead>
          <tr>
            <th aria-label="empty" />
            <th>{translate('react.picklist.signature.name.label', 'Name')}</th>
            <th>{translate('react.picklist.signature.signature.label', 'Signature')}</th>
            <th>{translate('react.picklist.signature.date.label', 'Date')}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th>{translate('react.picklist.signature.pickedBy.label', 'Picked by')}</th>
            <td>{picklist?.picker?.name}</td>
            <td />
            <td>{picklist?.datePicked}</td>
          </tr>
          <tr>
            <th>{translate('react.picklist.signature.checkedBy.label', 'Checked by')}</th>
            <td />
            <td />
            <td />
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default PicklistReturnPrint;
