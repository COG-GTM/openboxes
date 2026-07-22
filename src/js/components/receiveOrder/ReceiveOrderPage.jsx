import React, { useEffect, useMemo, useState } from 'react';

import moment from 'moment';
import { shallowEqual, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import Alert from 'react-s-alert';

import genericApi from 'api/services/GenericApi';
import receiveOrderApi from 'api/services/ReceiveOrderApi';
import Button from 'components/form-elements/Button';
import DateField from 'components/form-elements/v2/DateField';
import SelectField from 'components/form-elements/v2/SelectField';
import TextInput from 'components/form-elements/v2/TextInput';
import { ORDER_URL } from 'consts/applicationUrls';
import { DateFormat } from 'consts/timeFormat';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import { debouncePeopleFetch, debounceProductsFetch } from 'utils/option-utils';
import Translate from 'utils/Translate';

const STEPS = ['enterShipmentDetails', 'processOrderItems', 'confirmOrderReceipt'];

const formatDate = (value) => (value ? moment(value).format('MMM DD, YYYY') : '');

const toIsoDate = (value) => (value ? moment(value, DateFormat.MMM_DD_YYYY).format('YYYY-MM-DD') : null);

// Order summary box shown on every step (mirrors the legacy /order/summary
// template rendered by the receive order webflow screens).
const OrderSummary = ({ order, step, translate }) => (
  <div className="card mb-3" data-testid="receive-order-summary">
    <div className="card-body py-2">
      <div className="d-flex flex-wrap justify-content-between align-items-center">
        <div>
          <h5 className="mb-1" data-testid="receive-order-summary-order-number">
            {translate('react.receiveOrder.order.label', 'Order')}
            {' '}
            {order.orderNumber}
            {order.name ? ` - ${order.name}` : ''}
          </h5>
          <div className="text-muted">
            {order.origin?.name}
            {' → '}
            {order.destination?.name}
            {order.dateOrdered && ` | ${translate('react.receiveOrder.dateOrdered.label', 'Date ordered')}: ${formatDate(order.dateOrdered)}`}
            {order.orderedBy && ` | ${translate('react.receiveOrder.orderedBy.label', 'Ordered by')}: ${order.orderedBy.name}`}
          </div>
        </div>
        <ol className="d-flex list-unstyled mb-0" data-testid="receive-order-progress">
          {STEPS.map((s, idx) => (
            <li
              key={s}
              className={`px-2 ${s === step ? 'font-weight-bold text-primary' : 'text-muted'}`}
            >
              {idx + 1}
              {'. '}
              {translate(`react.receiveOrder.${s}.label`, s)}
            </li>
          ))}
        </ol>
      </div>
    </div>
  </div>
);

const ReceiveOrderPage = () => {
  const { orderId } = useParams();
  const queryId = useMemo(
    () => new URLSearchParams(window.location.search).get('id'),
    [],
  );
  const id = orderId || queryId;

  useTranslation('receiveOrder', 'default');
  const translate = useTranslate();

  const { currentLocation, debounceTime, minSearchLength } = useSelector((state) => ({
    currentLocation: state.session.currentLocation,
    debounceTime: state.session.searchConfig.debounceTime,
    minSearchLength: state.session.searchConfig.minSearchLength,
  }), shallowEqual);

  const debouncedPeopleFetch = useMemo(
    () => debouncePeopleFetch(debounceTime, minSearchLength),
    [debounceTime, minSearchLength],
  );
  const debouncedProductsFetch = useMemo(
    () => debounceProductsFetch(debounceTime, minSearchLength, currentLocation?.id),
    [debounceTime, minSearchLength, currentLocation?.id],
  );

  const [order, setOrder] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [step, setStep] = useState('enterShipmentDetails');
  const [shipmentTypes, setShipmentTypes] = useState([]);
  const [shipmentType, setShipmentType] = useState(null);
  const [recipient, setRecipient] = useState(null);
  const [shippedOn, setShippedOn] = useState(null);
  const [deliveredOn, setDeliveredOn] = useState(null);
  const [rows, setRows] = useState([]);
  const [errors, setErrors] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    genericApi.getShipmentTypes()
      .then(({ data }) => setShipmentTypes((data?.data ?? []).map((type) => ({
        ...type,
        value: type.id,
        label: type.name?.split('|')[0],
      }))))
      .catch(() => setShipmentTypes([]));
  }, []);

  useEffect(() => {
    if (!id) {
      setLoadError(translate('react.receiveOrder.noOrder.label', 'Unable to locate order'));
      return;
    }
    receiveOrderApi.getReceiveOrderData(id)
      .then(({ data }) => {
        const fetchedOrder = data?.data;
        setOrder(fetchedOrder);
        if (fetchedOrder?.defaultRecipient) {
          setRecipient((prev) => prev ?? {
            id: fetchedOrder.defaultRecipient.id,
            value: fetchedOrder.defaultRecipient.id,
            label: fetchedOrder.defaultRecipient.name,
            name: fetchedOrder.defaultRecipient.name,
          });
        }
        setRows((fetchedOrder?.orderItems ?? []).map((item, index) => ({
          key: `${item.id}-${index}`,
          orderItemId: item.id,
          primary: true,
          type: item.type,
          description: item.description,
          productCode: item.product?.productCode,
          productName: item.product?.name || item.description,
          unitOfMeasure: item.product?.unitOfMeasure,
          quantityOrdered: item.quantityOrdered,
          quantityRemaining: Math.max(0, item.quantityOrdered - item.quantityFulfilled),
          isCompletelyFulfilled: item.isCompletelyFulfilled,
          productReceived: item.product ? {
            id: item.product.id,
            value: item.product.id,
            label: `${item.product.productCode} - ${item.product.name}`,
          } : null,
          lotNumber: '',
          expirationDate: null,
          quantityReceived: '',
        })));
      })
      .catch((err) => {
        const message = err?.response?.data?.errorMessage;
        setLoadError(message || 'Unable to load order');
        if (message) {
          Alert.error(message);
        }
      });
  }, [id]);

  const updateRow = (key, values) => {
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...values } : row)));
  };

  const splitRow = (key) => {
    setRows((prev) => {
      const index = prev.findIndex((row) => row.key === key);
      const source = prev[index];
      const newRow = {
        ...source,
        key: `${source.orderItemId}-${Date.now()}`,
        primary: false,
        lotNumber: '',
        expirationDate: null,
        quantityReceived: '',
      };
      return [...prev.slice(0, index + 1), newRow, ...prev.slice(index + 1)];
    });
  };

  const deleteRow = (key) => {
    setRows((prev) => prev.filter((row) => (row.key !== key)));
  };

  const validateShipmentDetails = () => {
    const validationErrors = [];
    if (!shipmentType) {
      validationErrors.push(translate('react.receiveOrder.error.shipmentTypeRequired.label', 'Shipment type is required'));
    }
    if (!recipient) {
      validationErrors.push(translate('react.receiveOrder.error.recipientRequired.label', 'Recipient is required'));
    }
    if (!shippedOn) {
      validationErrors.push(translate('react.receiveOrder.error.shippedOnRequired.label', 'Shipped on date is required'));
    }
    if (!deliveredOn) {
      validationErrors.push(translate('react.receiveOrder.error.deliveredOnRequired.label', 'Delivered on date is required'));
    }
    if (shippedOn && moment(shippedOn, DateFormat.MMM_DD_YYYY).isAfter(moment(), 'day')) {
      validationErrors.push(translate('react.receiveOrder.error.shippedOnInFuture.label', 'Shipped on date must occur on or before today'));
    }
    if (deliveredOn && moment(deliveredOn, DateFormat.MMM_DD_YYYY).isAfter(moment(), 'day')) {
      validationErrors.push(translate('react.receiveOrder.error.deliveredOnInFuture.label', 'Delivered on date must occur on or before today'));
    }
    if (shippedOn && deliveredOn
      && moment(deliveredOn, DateFormat.MMM_DD_YYYY).isBefore(moment(shippedOn, DateFormat.MMM_DD_YYYY), 'day')) {
      validationErrors.push(translate('react.receiveOrder.error.deliveredBeforeShipped.label', 'Delivered on date must occur on or after the shipped on date'));
    }
    return validationErrors;
  };

  const validateOrderItems = () => {
    const validationErrors = [];
    rows.forEach((row) => {
      if (Number(row.quantityReceived) > 0 && !row.productReceived) {
        validationErrors.push(translate('react.receiveOrder.error.productRequired.label', 'Product is required for received items'));
      }
    });
    return validationErrors;
  };

  const goToStep = (nextStep, validate) => {
    const validationErrors = validate ? [...new Set(validate())] : [];
    setErrors(validationErrors);
    if (!validationErrors.length) {
      setStep(nextStep);
    }
  };

  const onSubmit = async () => {
    setSubmitting(true);
    setErrors([]);
    try {
      const payload = {
        shipmentType: shipmentType ? { id: shipmentType.id } : null,
        recipient: recipient ? { id: recipient.id } : null,
        shippedOn: toIsoDate(shippedOn),
        deliveredOn: toIsoDate(deliveredOn),
        orderItems: rows
          .filter((row) => Number(row.quantityReceived) > 0 && row.productReceived)
          .map((row) => ({
            orderItem: { id: row.orderItemId },
            primary: row.primary,
            productReceived: { id: row.productReceived.id },
            lotNumber: row.lotNumber || null,
            expirationDate: toIsoDate(row.expirationDate),
            quantityReceived: Number(row.quantityReceived),
          })),
      };
      const { data } = await receiveOrderApi.receiveOrder(id, payload);
      window.location.href = ORDER_URL.show(data?.data?.orderId ?? id);
    } catch (err) {
      const responseErrors = err?.response?.data?.errorMessages
        ?? (err?.response?.data?.errorMessage ? [err.response.data.errorMessage] : []);
      setErrors([...new Set(responseErrors.length ? responseErrors : [translate('react.receiveOrder.error.system.label', 'An error occurred while receiving the order')])]);
      if (err?.response?.status !== 400) {
        setStep('handleError');
      }
      setSubmitting(false);
    }
  };

  if (loadError) {
    return (
      <div className="d-flex flex-column m-3" data-testid="receive-order-error">
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

  const receivedRows = rows.filter((row) => Number(row.quantityReceived) > 0);

  return (
    <div className="d-flex flex-column m-3" data-testid="receive-order-page">
      <OrderSummary order={order} step={step === 'handleError' ? '' : step} translate={translate} />
      {errors.length > 0 && (
        <div className="alert alert-danger" data-testid="receive-order-errors">
          <ul className="mb-0">
            {errors.map((error) => <li key={error}>{error}</li>)}
          </ul>
        </div>
      )}

      {step === 'enterShipmentDetails' && (
        <div className="card" data-testid="receive-order-shipment-details">
          <div className="card-body">
            <h5><Translate id="react.receiveOrder.enterShipmentDetails.heading.label" defaultMessage="Enter shipment details" /></h5>
            <div className="row">
              <div className="col-lg-4 col-md-6 px-2 pt-2">
                <TextInput
                  title={{ id: 'react.receiveOrder.origin.label', defaultMessage: 'Origin' }}
                  disabled
                  value={order.origin?.name ?? ''}
                  onChange={() => {}}
                />
              </div>
              <div className="col-lg-4 col-md-6 px-2 pt-2" data-testid="receive-order-shipment-type">
                <SelectField
                  title={{ id: 'react.receiveOrder.shipmentType.label', defaultMessage: 'Shipment type' }}
                  required
                  options={shipmentTypes}
                  defaultValue={shipmentType}
                  onChange={setShipmentType}
                />
              </div>
              <div className="col-lg-4 col-md-6 px-2 pt-2">
                <TextInput
                  title={{ id: 'react.receiveOrder.destination.label', defaultMessage: 'Destination' }}
                  disabled
                  value={order.destination?.name ?? ''}
                  onChange={() => {}}
                />
              </div>
              <div className="col-lg-4 col-md-6 px-2 pt-2" data-testid="receive-order-recipient">
                <SelectField
                  key={`recipient-${order?.defaultRecipient?.id ?? ''}`}
                  title={{ id: 'react.receiveOrder.recipient.label', defaultMessage: 'Recipient' }}
                  required
                  async
                  loadOptions={debouncedPeopleFetch}
                  defaultValue={recipient}
                  onChange={setRecipient}
                  placeholder={translate('react.receiveOrder.searchPeople.label', 'Search people...')}
                />
              </div>
              <div className="col-lg-4 col-md-6 px-2 pt-2">
                <TextInput
                  title={{ id: 'react.receiveOrder.dateOrdered.label', defaultMessage: 'Date ordered' }}
                  disabled
                  value={formatDate(order.dateOrdered)}
                  onChange={() => {}}
                />
              </div>
              <div className="col-lg-4 col-md-6 px-2 pt-2" data-testid="receive-order-shipped-on">
                <DateField
                  title={{ id: 'react.receiveOrder.shippedOn.label', defaultMessage: 'Shipped on' }}
                  required
                  value={shippedOn}
                  onChange={setShippedOn}
                />
              </div>
              <div className="col-lg-4 col-md-6 px-2 pt-2" data-testid="receive-order-delivered-on">
                <DateField
                  title={{ id: 'react.receiveOrder.deliveredOn.label', defaultMessage: 'Delivered on' }}
                  required
                  value={deliveredOn}
                  onChange={setDeliveredOn}
                />
              </div>
            </div>
            <div className="d-flex gap-8 pt-3 border-top mt-3">
              <span data-testid="receive-order-next-button">
                <Button
                  defaultLabel="Next"
                  label="react.default.button.next.label"
                  variant="primary"
                  onClick={() => goToStep('processOrderItems', validateShipmentDetails)}
                />
              </span>
            </div>
          </div>
        </div>
      )}

      {step === 'processOrderItems' && (
        <div className="card" data-testid="receive-order-process-items">
          <div className="card-body">
            <h5><Translate id="react.receiveOrder.receiveItems.heading.label" defaultMessage="Receive order items" /></h5>
            {rows.length === 0 && (
              <div className="text-muted">
                <Translate id="react.default.noItems.label" defaultMessage="No items" />
              </div>
            )}
            {rows.length > 0 && (
              <table className="table table-sm table-bordered" data-testid="receive-order-items-table">
                <thead>
                  <tr>
                    <th colSpan={6} className="text-center">
                      <Translate id="react.receiveOrder.itemsOrdered.label" defaultMessage="Items ordered" />
                    </th>
                    <th colSpan={5} className="text-center border-left">
                      <Translate id="react.receiveOrder.itemsReceived.label" defaultMessage="Items received" />
                    </th>
                  </tr>
                  <tr>
                    <th>{translate('react.receiveOrder.type.label', 'Type')}</th>
                    <th>{translate('react.receiveOrder.productCode.label', 'Code')}</th>
                    <th>{translate('react.receiveOrder.productName.label', 'Name')}</th>
                    <th>{translate('react.receiveOrder.uom.label', 'UOM')}</th>
                    <th className="text-center">{translate('react.receiveOrder.ordered.label', 'Ordered')}</th>
                    <th className="text-center">{translate('react.receiveOrder.remaining.label', 'Remaining')}</th>
                    <th className="text-center border-left">{translate('react.receiveOrder.received.label', 'Received')}</th>
                    <th>{translate('react.receiveOrder.product.label', 'Product')}</th>
                    <th>{translate('react.receiveOrder.lotNumber.label', 'Lot number')}</th>
                    <th>{translate('react.receiveOrder.expires.label', 'Expires')}</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.key} data-testid="receive-order-item-row">
                      <td>{row.primary ? row.type : ''}</td>
                      <td>{row.primary ? row.productCode : ''}</td>
                      <td>{row.primary ? row.productName : ''}</td>
                      <td>{row.primary ? (row.unitOfMeasure || translate('react.default.each.label', 'each')) : ''}</td>
                      <td className="text-center">{row.primary ? row.quantityOrdered : ''}</td>
                      <td className="text-center">{row.primary ? row.quantityRemaining : ''}</td>
                      {row.isCompletelyFulfilled ? (
                        <td colSpan={5} className="text-center text-muted border-left">
                          <Translate id="react.receiveOrder.itemAlreadyReceived.label" defaultMessage="This order item has already been received" />
                        </td>
                      ) : (
                        <>
                          <td className="border-left" style={{ width: '90px' }} data-testid="receive-order-quantity-input">
                            <TextInput
                              type="number"
                              value={row.quantityReceived}
                              onChange={(quantity) => updateRow(
                                row.key,
                                { quantityReceived: quantity ?? '' },
                              )}
                              ariaLabel={{ id: 'react.receiveOrder.received.label', defaultMessage: 'Received' }}
                            />
                          </td>
                          <td style={{ minWidth: '220px' }} data-testid="receive-order-product-select">
                            <SelectField
                              async
                              productSelect
                              loadOptions={debouncedProductsFetch}
                              defaultValue={row.productReceived}
                              onChange={(product) => updateRow(
                                row.key,
                                { productReceived: product },
                              )}
                              ariaLabel="Product received"
                              hideErrorMessageWrapper
                            />
                          </td>
                          <td style={{ width: '140px' }} data-testid="receive-order-lot-input">
                            <TextInput
                              value={row.lotNumber}
                              onChange={(e) => updateRow(row.key, { lotNumber: e.target.value })}
                              ariaLabel={{ id: 'react.receiveOrder.lotNumber.label', defaultMessage: 'Lot number' }}
                            />
                          </td>
                          <td style={{ minWidth: '150px' }}>
                            <DateField
                              value={row.expirationDate}
                              onChange={(date) => updateRow(row.key, { expirationDate: date })}
                              hideErrorMessageWrapper
                            />
                          </td>
                          <td className="text-center align-middle">
                            {row.primary ? (
                              <Button
                                defaultLabel="Split item"
                                label="react.receiveOrder.splitItem.label"
                                variant="secondary"
                                onClick={() => splitRow(row.key)}
                              />
                            ) : (
                              <Button
                                defaultLabel="Delete item"
                                label="react.receiveOrder.deleteItem.label"
                                variant="danger"
                                onClick={() => deleteRow(row.key)}
                              />
                            )}
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="d-flex gap-8 pt-3 border-top mt-3">
              <Button
                defaultLabel="Back"
                label="react.default.button.back.label"
                variant="primary-outline"
                onClick={() => goToStep('enterShipmentDetails', null)}
              />
              <span data-testid="receive-order-next-button">
                <Button
                  defaultLabel="Next"
                  label="react.default.button.next.label"
                  variant="primary"
                  onClick={() => goToStep('confirmOrderReceipt', validateOrderItems)}
                />
              </span>
            </div>
          </div>
        </div>
      )}

      {step === 'confirmOrderReceipt' && (
        <div className="card" data-testid="receive-order-confirm">
          <div className="card-body">
            <h5><Translate id="react.receiveOrder.confirmOrderReceipt.heading.label" defaultMessage="Confirm order receipt" /></h5>
            <p data-testid="receive-order-confirm-summary">
              {translate('react.receiveOrder.aboutToCreateShipment.label', 'You are about to create a new shipment')}
              {`: ${shipmentType?.label ?? ''} | ${order.origin?.name ?? ''} → ${order.destination?.name ?? ''} | ${deliveredOn ?? ''}`}
            </p>
            <table className="table table-sm table-borderless w-auto">
              <tbody>
                <tr>
                  <td className="font-weight-bold">
                    {translate('react.receiveOrder.orderNumber.label', 'Order number')}
                    :
                  </td>
                  <td>{order.orderNumber}</td>
                </tr>
                <tr>
                  <td className="font-weight-bold">
                    {translate('react.receiveOrder.orderFrom.label', 'Order from')}
                    :
                  </td>
                  <td>{order.origin?.name}</td>
                </tr>
                <tr>
                  <td className="font-weight-bold">
                    {translate('react.receiveOrder.destination.label', 'Destination')}
                    :
                  </td>
                  <td>{order.destination?.name}</td>
                </tr>
                <tr>
                  <td className="font-weight-bold">
                    {translate('react.receiveOrder.shipmentType.label', 'Shipment type')}
                    :
                  </td>
                  <td>{shipmentType?.label}</td>
                </tr>
                <tr>
                  <td className="font-weight-bold">
                    {translate('react.receiveOrder.shippedOn.label', 'Shipped on')}
                    :
                  </td>
                  <td>{shippedOn}</td>
                </tr>
                <tr>
                  <td className="font-weight-bold">
                    {translate('react.receiveOrder.deliveredOn.label', 'Delivered on')}
                    :
                  </td>
                  <td>{deliveredOn}</td>
                </tr>
              </tbody>
            </table>
            {receivedRows.length > 0 ? (
              <table className="table table-sm table-bordered" data-testid="receive-order-confirm-items-table">
                <thead>
                  <tr>
                    <th>{translate('react.receiveOrder.productCode.label', 'Code')}</th>
                    <th>{translate('react.receiveOrder.productName.label', 'Name')}</th>
                    <th>{translate('react.receiveOrder.uom.label', 'UOM')}</th>
                    <th>{translate('react.receiveOrder.lotNumber.label', 'Lot number')}</th>
                    <th>{translate('react.receiveOrder.expirationDate.label', 'Expiration date')}</th>
                    <th className="text-center">{translate('react.receiveOrder.ordered.label', 'Ordered')}</th>
                    <th className="text-center">{translate('react.receiveOrder.received.label', 'Received')}</th>
                  </tr>
                </thead>
                <tbody>
                  {receivedRows.map((row) => (
                    <tr key={row.key} data-testid="receive-order-confirm-item-row">
                      <td>{row.productReceived?.productCode ?? row.productCode}</td>
                      <td>{row.productReceived?.name ?? row.productName}</td>
                      <td>{row.unitOfMeasure || translate('react.default.each.label', 'each')}</td>
                      <td>{row.lotNumber}</td>
                      <td>{row.expirationDate ?? ''}</td>
                      <td className="text-center">{row.quantityOrdered}</td>
                      <td className="text-center">{row.quantityReceived}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-muted">
                <Translate id="react.receiveOrder.noItems.label" defaultMessage="No items to receive" />
              </div>
            )}
            <div className="d-flex gap-8 pt-3 border-top mt-3">
              <Button
                defaultLabel="Back"
                label="react.default.button.back.label"
                variant="primary-outline"
                onClick={() => goToStep('processOrderItems', null)}
              />
              <span data-testid="receive-order-finish-button">
                <Button
                  defaultLabel="Finish"
                  label="react.default.button.finish.label"
                  variant="primary"
                  disabled={submitting}
                  onClick={onSubmit}
                />
              </span>
            </div>
          </div>
        </div>
      )}

      {step === 'handleError' && (
        <div className="card" data-testid="receive-order-handle-error">
          <div className="card-body">
            <h5><Translate id="react.receiveOrder.systemError.heading.label" defaultMessage="System error" /></h5>
            <p>
              <Translate
                id="react.receiveOrder.systemError.message.label"
                defaultMessage="An error occurred while receiving the order. Please correct the errors above and try again."
              />
            </p>
            <div className="d-flex gap-8 pt-3 border-top mt-3">
              <Button
                defaultLabel="Back"
                label="react.default.button.back.label"
                variant="primary-outline"
                onClick={() => goToStep('confirmOrderReceipt', null)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReceiveOrderPage;
