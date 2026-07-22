import React, { useEffect, useMemo, useState } from 'react';

import moment from 'moment';
import queryString from 'query-string';
import { getTranslate } from 'react-localize-redux';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import Alert from 'react-s-alert';

import requisitionApi from 'api/services/RequisitionApi';
import { REQUISITION_URL } from 'consts/applicationUrls';
import useTranslation from 'hooks/useTranslation';
import { debounceLocationsFetch, debouncePeopleFetch } from 'utils/option-utils';
import Select from 'utils/Select';
import Translate, { translateWithDefaultMessage } from 'utils/Translate';

const RequisitionCreateStock = () => {
  const location = useLocation();
  const templateId = queryString.parse(location.search)?.templateId;
  const currentLocation = useSelector((state) => state.session.currentLocation);

  const [template, setTemplate] = useState(null);
  const [destination, setDestination] = useState(null);
  const [requestedBy, setRequestedBy] = useState(null);
  // Legacy createStockFromTemplate defaults the requested date to today
  const [dateRequested, setDateRequested] = useState(moment().format('YYYY-MM-DD'));
  const [description, setDescription] = useState('');
  const [items, setItems] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useTranslation('requisition', 'default');

  const translate = useSelector(
    (state) => translateWithDefaultMessage(getTranslate(state.localize)),
  );

  const debouncedPeopleFetch = useMemo(() => debouncePeopleFetch(500, 2), []);
  const debouncedLocationsFetch = useMemo(() => debounceLocationsFetch(500, 2, null, true), []);

  useEffect(() => {
    if (!templateId) {
      return;
    }
    requisitionApi.getRequisition(templateId)
      .then(({ data }) => {
        const fetched = data?.data;
        setTemplate(fetched);
        setDestination(fetched?.destination ?? null);
        setItems((fetched?.requisitionItems ?? []).map((item, index) => ({
          templateItemId: item.id,
          productId: item.product?.id,
          productCode: item.product?.productCode,
          productName: item.product?.name,
          maxQuantity: item.quantity,
          quantity: item.quantity,
          orderIndex: item.orderIndex ?? index,
        })));
      })
      .catch((err) => {
        setError(err?.response?.data?.errorMessage
          || 'Could not find requisition template');
      });
  }, [templateId]);

  const setQuantity = (index, quantity) => {
    setItems((previous) => previous.map((item, i) => (
      i === index ? { ...item, quantity } : item
    )));
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const { data } = await requisitionApi.createRequisition({
        type: 'STOCK',
        originId: template?.origin?.id ?? currentLocation?.id,
        destinationId: destination?.id || null,
        requestedById: requestedBy?.id || null,
        commodityClass: template?.commodityClass || null,
        dateRequested: dateRequested || null,
        description: description || null,
        requisitionItems: items.map((item) => ({
          templateItemId: item.templateItemId,
          productId: item.productId,
          quantity: parseInt(item.quantity, 10) || 0,
          orderIndex: item.orderIndex,
        })),
      });
      window.location = REQUISITION_URL.edit(data?.data?.id);
    } catch (err) {
      const message = err?.response?.data?.errors?.join('; ')
        || err?.response?.data?.errorMessage;
      if (message) {
        Alert.error(message);
      }
      setSaving(false);
    }
  };

  if (error) {
    return <div className="alert alert-danger m-3" role="alert">{error}</div>;
  }

  return (
    <div className="d-flex flex-column m-3">
      <div className="card">
        <div className="card-header">
          <Translate id="react.requisition.details.label" defaultMessage="Requisition details" />
        </div>
        <form className="card-body" onSubmit={submit}>
          <div className="form-group row">
            <span className="col-sm-3 col-form-label font-weight-bold">
              <Translate id="react.requisition.requisitionType.label" defaultMessage="Requisition type" />
            </span>
            <div className="col-sm-6 col-form-label">STOCK</div>
          </div>
          <div className="form-group row">
            <span className="col-sm-3 col-form-label font-weight-bold">
              <Translate id="react.requisition.origin.label" defaultMessage="Origin" />
            </span>
            <div className="col-sm-6 col-form-label">
              {template?.origin?.name ?? currentLocation?.name}
            </div>
          </div>
          <div className="form-group row">
            <label className="col-sm-3 col-form-label" htmlFor="requisition-destination-select">
              <Translate id="react.requisition.destination.label" defaultMessage="Destination" />
            </label>
            <div className="col-sm-6">
              <Select
                async
                loadOptions={debouncedLocationsFetch}
                value={destination}
                onChange={(value) => setDestination(value)}
                valueKey="id"
                labelKey="name"
                placeholder="Select destination"
                id="requisition-destination-select"
                dataTestId="requisition-destination-select"
              />
            </div>
          </div>
          <div className="form-group row">
            <span className="col-sm-3 col-form-label font-weight-bold">
              <Translate id="react.requisition.commodityClass.label" defaultMessage="Commodity class" />
            </span>
            <div className="col-sm-6 col-form-label">{template?.commodityClass}</div>
          </div>
          <div className="form-group row">
            <label className="col-sm-3 col-form-label" htmlFor="requisition-requested-by-select">
              <Translate id="react.requisition.requestedBy.label" defaultMessage="Requested by" />
            </label>
            <div className="col-sm-6">
              <Select
                async
                loadOptions={debouncedPeopleFetch}
                value={requestedBy}
                onChange={(value) => setRequestedBy(value)}
                valueKey="id"
                labelKey="name"
                placeholder="Search person..."
                id="requisition-requested-by-select"
                dataTestId="requisition-requested-by-select"
              />
            </div>
          </div>
          <div className="form-group row">
            <label className="col-sm-3 col-form-label" htmlFor="requisition-date-requested">
              <Translate id="react.requisition.dateRequested.label" defaultMessage="Date requested" />
            </label>
            <div className="col-sm-6">
              <input
                type="date"
                id="requisition-date-requested"
                className="form-control"
                value={dateRequested}
                onChange={(event) => setDateRequested(event.target.value)}
                data-testid="requisition-date-requested"
              />
            </div>
          </div>
          <div className="form-group row">
            <label className="col-sm-3 col-form-label" htmlFor="requisition-description">
              <Translate id="react.requisition.description.label" defaultMessage="Description" />
            </label>
            <div className="col-sm-6">
              <textarea
                id="requisition-description"
                className="form-control"
                rows="2"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                data-testid="requisition-description"
              />
            </div>
          </div>
          {items.length > 0 && (
            <div className="form-group">
              <div className="font-weight-bold mb-1">
                <Translate id="react.requisition.requisitionItems.label" defaultMessage="Requisition items" />
              </div>
              <table className="table table-sm table-striped" data-testid="requisition-template-items-table">
                <thead>
                  <tr>
                    <th>{translate('react.product.productCode.label', 'Code')}</th>
                    <th>{translate('react.product.label', 'Product')}</th>
                    <th>{translate('react.requisition.maxQuantity.label', 'Max quantity')}</th>
                    <th>{translate('react.requisition.quantity.label', 'Quantity')}</th>
                    <th>{translate('react.requisition.orderIndex.label', 'Sort order')}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={item.templateItemId}>
                      <td>{item.productCode}</td>
                      <td>{item.productName}</td>
                      <td>{item.maxQuantity}</td>
                      <td style={{ width: '120px' }}>
                        <input
                          type="number"
                          min="0"
                          className="form-control form-control-sm"
                          value={item.quantity}
                          onChange={(event) => setQuantity(index, event.target.value)}
                          data-testid={`requisition-item-quantity-${index}`}
                        />
                      </td>
                      <td>{item.orderIndex}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="d-flex justify-content-center">
            <a className="btn btn-outline-secondary mr-2" href={REQUISITION_URL.chooseTemplate()}>
              <Translate id="react.default.button.back.label" defaultMessage="Back" />
            </a>
            <button type="submit" className="btn btn-primary" disabled={saving} data-testid="requisition-save-button">
              <Translate id="react.default.button.next.label" defaultMessage="Next" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RequisitionCreateStock;
