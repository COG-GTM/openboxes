import React, { useEffect, useState } from 'react';

import queryString from 'query-string';
import { useLocation, useParams } from 'react-router-dom';
import Alert from 'react-s-alert';

import orderApi from 'api/services/OrderApi';
import { ORDER_URL, PURCHASE_ORDER_URL } from 'consts/applicationUrls';
import useTranslation from 'hooks/useTranslation';
import Select from 'utils/Select';
import Translate from 'utils/Translate';

const hasValue = (value) => value !== '' && value !== null && Number(value) !== 0;

const OrderEditAdjustment = () => {
  const { orderId: orderIdParam, adjustmentId } = useParams();
  const location = useLocation();
  const orderIdFromQuery = queryString.parse(location.search)['order.id'];
  const orderId = orderIdParam || orderIdFromQuery;

  const [order, setOrder] = useState(null);
  const [orderItemOptions, setOrderItemOptions] = useState([]);
  const [adjustmentTypes, setAdjustmentTypes] = useState([]);
  const [budgetCodes, setBudgetCodes] = useState([]);
  const [orderItem, setOrderItem] = useState(null);
  const [adjustmentType, setAdjustmentType] = useState(null);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [percentage, setPercentage] = useState('');
  const [comments, setComments] = useState('');
  const [budgetCode, setBudgetCode] = useState(null);
  const [saving, setSaving] = useState(false);

  useTranslation('order', 'default');

  const showError = (err) => {
    const message = err?.response?.data?.errors?.join('; ')
      || err?.response?.data?.errorMessage;
    if (message) {
      Alert.error(message);
    }
  };

  useEffect(() => {
    if (!orderId) {
      return;
    }
    orderApi.getOrder(orderId)
      .then(({ data }) => setOrder(data?.data))
      .catch(showError);
    orderApi.getOrderItemOptions(orderId)
      .then(({ data }) => setOrderItemOptions(data?.data ?? []))
      .catch(showError);
  }, [orderId]);

  useEffect(() => {
    orderApi.getOrderAdjustmentTypeOptions()
      .then(({ data }) => setAdjustmentTypes(data?.data ?? []))
      .catch(showError);
    orderApi.getBudgetCodeOptions()
      .then(({ data }) => setBudgetCodes(data?.data ?? []))
      .catch(showError);
  }, []);

  useEffect(() => {
    if (!orderId || !adjustmentId) {
      return;
    }
    orderApi.getAdjustment(orderId, adjustmentId)
      .then(({ data }) => {
        const adjustment = data?.data;
        if (!adjustment) {
          return;
        }
        const item = adjustment.orderItem;
        setOrderItem(item ? { id: item.id, value: item.id, label: item.label } : null);
        const type = adjustment.orderAdjustmentType;
        setAdjustmentType(type ? { id: type.id, value: type.id, label: type.name } : null);
        setDescription(adjustment.description ?? '');
        setAmount(adjustment.amount ?? '');
        setPercentage(adjustment.percentage ?? '');
        setComments(adjustment.comments ?? '');
        const budget = adjustment.budgetCode;
        setBudgetCode(budget ? { id: budget.id, value: budget.id, label: budget.code } : null);
      })
      .catch(showError);
  }, [orderId, adjustmentId]);

  const submit = async (event) => {
    event.preventDefault();
    if (!description) {
      Alert.error('Please enter a description');
      return;
    }
    setSaving(true);
    const payload = {
      orderItem: orderItem ? { id: orderItem.id } : null,
      orderAdjustmentType: adjustmentType ? { id: adjustmentType.id } : null,
      description,
      amount: amount === '' ? null : amount,
      percentage: percentage === '' ? null : percentage,
      comments,
      budgetCode: budgetCode ? { id: budgetCode.id } : null,
    };
    try {
      if (adjustmentId) {
        await orderApi.updateAdjustment(orderId, adjustmentId, payload);
      } else {
        await orderApi.createAdjustment(orderId, payload);
      }
      window.location = `${PURCHASE_ORDER_URL.addItems(orderId)}?skipTo=adjustments`;
    } catch (error) {
      showError(error);
      setSaving(false);
    }
  };

  return (
    <div className="d-flex flex-column m-3">
      <div className="card">
        <div className="card-header">
          {adjustmentId
            ? <Translate id="react.order.editAdjustment.label" defaultMessage="Edit Adjustment" />
            : <Translate id="react.order.addAdjustment.label" defaultMessage="Add Adjustment" />}
          {order?.orderNumber && ` · ${order.orderNumber}`}
          {order?.name && ` · ${order.name}`}
        </div>
        <form className="card-body" onSubmit={submit}>
          <div className="form-group row">
            <label className="col-sm-3 col-form-label" htmlFor="adjustment-order-item-select">
              <Translate id="react.order.adjustment.orderItem.label" defaultMessage="Order item" />
            </label>
            <div className="col-sm-6">
              <Select
                options={orderItemOptions}
                value={orderItem}
                onChange={(value) => setOrderItem(value)}
                id="adjustment-order-item-select"
              />
            </div>
          </div>
          <div className="form-group row">
            <label className="col-sm-3 col-form-label" htmlFor="adjustment-type-select">
              <Translate id="react.order.adjustment.type.label" defaultMessage="Adjustment type" />
            </label>
            <div className="col-sm-6">
              <Select
                options={adjustmentTypes}
                value={adjustmentType}
                onChange={(value) => setAdjustmentType(value)}
                id="adjustment-type-select"
              />
            </div>
          </div>
          <div className="form-group row">
            <label className="col-sm-3 col-form-label" htmlFor="adjustment-description-input">
              <Translate id="react.order.adjustment.description.label" defaultMessage="Description" />
            </label>
            <div className="col-sm-6">
              <input
                type="text"
                id="adjustment-description-input"
                className="form-control"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                data-testid="adjustment-description-input"
              />
            </div>
          </div>
          <div className="form-group row">
            <label className="col-sm-3 col-form-label" htmlFor="adjustment-amount-input">
              <Translate id="react.order.adjustment.amount.label" defaultMessage="Amount" />
            </label>
            <div className="col-sm-6">
              <input
                type="number"
                step="any"
                id="adjustment-amount-input"
                className="form-control"
                value={amount}
                disabled={hasValue(percentage)}
                onChange={(event) => setAmount(event.target.value)}
                data-testid="adjustment-amount-input"
              />
            </div>
          </div>
          <div className="form-group row">
            <label className="col-sm-3 col-form-label" htmlFor="adjustment-percentage-input">
              <Translate id="react.order.adjustment.percentage.label" defaultMessage="Percentage" />
            </label>
            <div className="col-sm-6">
              <input
                type="number"
                step="any"
                id="adjustment-percentage-input"
                className="form-control"
                value={percentage}
                disabled={hasValue(amount)}
                onChange={(event) => setPercentage(event.target.value)}
                data-testid="adjustment-percentage-input"
              />
            </div>
          </div>
          <div className="form-group row">
            <label className="col-sm-3 col-form-label" htmlFor="adjustment-comments-input">
              <Translate id="react.order.adjustment.comments.label" defaultMessage="Comments" />
            </label>
            <div className="col-sm-6">
              <textarea
                id="adjustment-comments-input"
                className="form-control"
                rows={3}
                value={comments}
                onChange={(event) => setComments(event.target.value)}
                data-testid="adjustment-comments-input"
              />
            </div>
          </div>
          <div className="form-group row">
            <label className="col-sm-3 col-form-label" htmlFor="adjustment-budget-code-select">
              <Translate id="react.order.adjustment.budgetCode.label" defaultMessage="Budget code" />
            </label>
            <div className="col-sm-6">
              <Select
                options={budgetCodes}
                value={budgetCode}
                onChange={(value) => setBudgetCode(value)}
                id="adjustment-budget-code-select"
              />
            </div>
          </div>
          <div className="d-flex justify-content-center">
            <button type="submit" className="btn btn-primary mr-2" disabled={saving} data-testid="adjustment-save-button">
              <Translate id="react.default.button.save.label" defaultMessage="Save" />
            </button>
            <a className="btn btn-outline-secondary" href={ORDER_URL.show(orderId)}>
              <Translate id="react.default.button.cancel.label" defaultMessage="Cancel" />
            </a>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OrderEditAdjustment;
