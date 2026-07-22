import React, { useEffect, useState } from 'react';

import { useParams } from 'react-router-dom';
import Alert from 'react-s-alert';

import orderApi from 'api/services/OrderApi';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';

const formatCurrency = (value, currencyCode) => {
  if (value === null || value === undefined) {
    return '';
  }
  return `${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currencyCode ?? ''}`;
};

const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : '');

const Address = ({ address }) => {
  if (!address) {
    return null;
  }
  return (
    <div>
      {address.address && <div>{address.address}</div>}
      {address.address2 && <div>{address.address2}</div>}
      {(address.city || address.stateOrProvince || address.postalCode) && (
        <div>
          {[address.city, address.stateOrProvince, address.postalCode].filter(Boolean).join(', ')}
        </div>
      )}
      {address.country && <div>{address.country}</div>}
    </div>
  );
};

const OrderPrint = () => {
  const { orderId } = useParams();

  useTranslation('order', 'default');

  const translate = useTranslate();

  const [order, setOrder] = useState(null);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    if (!orderId) {
      return;
    }
    setOrder(null);
    setLoadError(null);
    orderApi.getOrderPrintData(orderId)
      .then(({ data }) => setOrder(data?.data))
      .catch((err) => {
        const message = err?.response?.data?.errorMessage;
        setLoadError(message || 'Unable to load order');
        if (message) {
          Alert.error(message);
        }
      });
  }, [orderId]);

  if (loadError) {
    return (
      <div className="d-flex flex-column m-3" data-testid="order-print-error">
        <div className="alert alert-danger">{loadError}</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="d-flex flex-column m-3">
        <Translate id="react.default.loading.label" defaultMessage="Loading..." />
      </div>
    );
  }

  const { currencyCode } = order;
  const columnCount = 8
    + (order.hasSupplierCode ? 1 : 0)
    + (order.hasManufacturerName ? 1 : 0)
    + (order.hasManufacturerCode ? 1 : 0);

  return (
    <div className="d-flex flex-column m-3" data-testid="order-print-page">
      <div className="d-flex justify-content-end mb-2 d-print-none">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => window.print()}
          data-testid="order-print-button"
        >
          <Translate id="react.default.button.print.label" defaultMessage="Print" />
        </button>
      </div>
      <div className="card">
        <div className="card-body">
          <div className="row mb-3">
            <div className="col-6">
              <h4 data-testid="order-print-destination-party">{order.destinationParty?.displayName}</h4>
              <Address address={order.destinationParty?.address} />
            </div>
            <div className="col-6 text-right">
              <h4>
                {order.orderType?.name}
                {' '}
                <span data-testid="order-print-order-number">{order.orderNumber}</span>
              </h4>
              {order.orderedBy && (
                <div>
                  <Translate id="react.order.show.orderedBy.label" defaultMessage="Ordered by" />
                  {': '}
                  {order.orderedBy.name}
                </div>
              )}
              {order.paymentTerm && (
                <div>
                  <Translate id="react.order.show.paymentTerms.label" defaultMessage="Payment terms" />
                  {': '}
                  {order.paymentTerm}
                </div>
              )}
              {order.paymentMethodType && (
                <div>
                  <Translate id="react.order.show.paymentMethod.label" defaultMessage="Payment method" />
                  {': '}
                  {order.paymentMethodType}
                </div>
              )}
            </div>
          </div>
          <div className="row mb-3">
            <div className="col-6">
              <h6><Translate id="react.order.print.supplier.label" defaultMessage="Supplier" /></h6>
              <div data-testid="order-print-origin">{order.origin?.name}</div>
              <Address address={order.origin?.address} />
            </div>
            <div className="col-6">
              <h6><Translate id="react.order.print.shipTo.label" defaultMessage="Ship to" /></h6>
              <div data-testid="order-print-destination">{order.destination?.name}</div>
              <Address address={order.destination?.address} />
            </div>
          </div>
          <table className="table table-sm table-bordered" data-testid="order-print-items-table">
            <thead>
              <tr>
                <th>{translate('react.order.print.number.label', '#')}</th>
                <th>{translate('react.order.show.column.productCode.label', 'Code')}</th>
                <th>{translate('react.order.show.column.product.label', 'Product')}</th>
                {order.hasSupplierCode && <th>{translate('react.order.show.column.supplierCode.label', 'Supplier code')}</th>}
                {order.hasManufacturerName && <th>{translate('react.order.show.column.manufacturer.label', 'Manufacturer')}</th>}
                {order.hasManufacturerCode && <th>{translate('react.order.show.column.manufacturerCode.label', 'Manufacturer code')}</th>}
                <th>{translate('react.order.show.column.quantity.label', 'Quantity')}</th>
                <th>{translate('react.order.show.column.uom.label', 'UOM')}</th>
                <th>{translate('react.order.show.column.unitPrice.label', 'Unit price')}</th>
                <th>{translate('react.order.show.subtotal.label', 'Subtotal')}</th>
                <th>{translate('react.order.show.column.totalPrice.label', 'Total price')}</th>
              </tr>
            </thead>
            <tbody>
              {(order.orderItems ?? []).length === 0 && (
                <tr>
                  <td colSpan={columnCount} className="text-center">
                    <Translate id="react.default.noResults.label" defaultMessage="No results" />
                  </td>
                </tr>
              )}
              {(order.orderItems ?? []).map((item, index) => (
                <tr key={item.id}>
                  <td>{index + 1}</td>
                  <td>{item.productCode}</td>
                  <td>{item.productName}</td>
                  {order.hasSupplierCode && <td>{item.supplierCode}</td>}
                  {order.hasManufacturerName && <td>{item.manufacturerName}</td>}
                  {order.hasManufacturerCode && <td>{item.manufacturerCode}</td>}
                  <td>{item.quantity}</td>
                  <td>{item.unitOfMeasure}</td>
                  <td>{formatCurrency(item.unitPrice, currencyCode)}</td>
                  <td>{formatCurrency(item.subtotal, currencyCode)}</td>
                  <td>{formatCurrency(item.total, currencyCode)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={columnCount - 1} className="text-right">
                  <strong><Translate id="react.order.show.subtotal.label" defaultMessage="Subtotal" /></strong>
                </td>
                <td data-testid="order-print-subtotal">{formatCurrency(order.subtotal, currencyCode)}</td>
              </tr>
              {(order.orderAdjustments ?? []).map((adjustment) => (
                <tr key={adjustment.id}>
                  <td colSpan={columnCount - 1} className="text-right">
                    {adjustment.description || (
                      <>
                        {adjustment.orderAdjustmentType}
                        {adjustment.percentage ? ` (${adjustment.percentage}%)` : ''}
                      </>
                    )}
                  </td>
                  <td>{formatCurrency(adjustment.totalAdjustments, currencyCode)}</td>
                </tr>
              ))}
              <tr>
                <td colSpan={columnCount - 1} className="text-right">
                  <strong><Translate id="react.order.show.total.label" defaultMessage="Total" /></strong>
                </td>
                <td data-testid="order-print-total">
                  <strong>{formatCurrency(order.total, currencyCode)}</strong>
                </td>
              </tr>
            </tfoot>
          </table>
          <div className="text-muted small">
            <Translate id="react.order.print.generatedOn.label" defaultMessage="Generated on" />
            {' '}
            {formatDate(new Date().toISOString())}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderPrint;
