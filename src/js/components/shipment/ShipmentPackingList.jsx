import React, { useEffect, useState } from 'react';

import { getTranslate } from 'react-localize-redux';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';

import shipmentApi from 'api/services/ShipmentApi';
import { SHIPMENT_SHOW_URL } from 'consts/applicationUrls';
import useTranslation from 'hooks/useTranslation';
import Translate, { translateWithDefaultMessage } from 'utils/Translate';

// React version of the legacy shipment/showPackingList GSP: shipment items
// grouped by container with container dimensions and weight.
const ShipmentPackingList = () => {
  const { shipmentId } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const translate = useSelector(
    (state) => translateWithDefaultMessage(getTranslate(state.localize)),
  );

  useTranslation('shipment', 'default');

  useEffect(() => {
    shipmentApi.getPackingList(shipmentId)
      .then((response) => setData(response.data?.data))
      .catch((err) => {
        setError(err?.response?.data?.errorMessage
          || translate('react.default.errors.error.label', 'An error occurred'));
      });
  }, [shipmentId]);

  if (error) {
    return <div className="alert alert-danger m-3" role="alert">{error}</div>;
  }

  if (!data) {
    return null;
  }

  const shipmentItems = data.shipmentItems ?? [];

  return (
    <div className="d-flex flex-column m-3" data-testid="shipment-packing-list">
      <h4>
        <Translate id="react.shipment.packingList.label" defaultMessage="Packing list" />
        {' '}
        <small className="text-muted" data-testid="shipment-packing-list-number">{data.shipmentNumber}</small>
      </h4>
      <div className="mb-2">
        <a href={SHIPMENT_SHOW_URL.show(data.id)} className="btn btn-outline-secondary btn-sm">
          <Translate id="react.shipment.showDetails.label" defaultMessage="Show details" />
        </a>
      </div>
      <table className="table table-sm table-bordered bg-white" data-testid="shipment-packing-list-table">
        <thead>
          <tr>
            <th>{translate('react.shipment.container.label', 'Container')}</th>
            <th>{translate('react.shipment.item.product.label', 'Product')}</th>
            <th>{translate('react.shipment.item.lotNumber.label', 'Lot/Serial No.')}</th>
            <th>{translate('react.shipment.item.expirationDate.label', 'Expires')}</th>
            <th className="text-right">{translate('react.shipment.item.quantityShipped.label', 'Shipped')}</th>
            {data.wasReceived && (
              <th className="text-right">{translate('react.shipment.item.quantityReceived.label', 'Received')}</th>
            )}
            <th>{translate('react.shipment.recipient.label', 'Recipient')}</th>
          </tr>
        </thead>
        <tbody>
          {!shipmentItems.length && (
            <tr>
              <td colSpan={data.wasReceived ? 7 : 6} className="text-center text-muted">
                {translate('react.default.none.label', 'None')}
              </td>
            </tr>
          )}
          {shipmentItems.map((item) => (
            <tr key={item.id} data-testid="shipment-packing-list-row">
              <td>
                {item.containerDetails?.name || translate('react.shipment.unpacked.label', 'Unpacked')}
                {item.containerDetails?.weight ? (
                  <small className="text-muted d-block">
                    {item.containerDetails.weight}
                    {' '}
                    {item.containerDetails.weightUnits}
                  </small>
                ) : null}
              </td>
              <td>
                {item.product?.productCode}
                {' '}
                {item.product?.name}
              </td>
              <td>{item.inventoryItem?.lotNumber ?? item.lotNumber}</td>
              <td>{item.inventoryItem?.expirationDate ?? item.expirationDate}</td>
              <td className="text-right">{item.quantity}</td>
              {data.wasReceived && <td className="text-right">{item.quantityReceived}</td>}
              <td>{item.recipient?.name}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ShipmentPackingList;
