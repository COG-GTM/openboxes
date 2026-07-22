import React, { useEffect, useMemo, useState } from 'react';

import { getTranslate } from 'react-localize-redux';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import Alert from 'react-s-alert';

import requisitionApi from 'api/services/RequisitionApi';
import RequisitionHeaderPanel from 'components/requisition/RequisitionHeaderPanel';
import RequisitionSummary from 'components/requisition/RequisitionSummary';
import { REQUISITION_URL } from 'consts/applicationUrls';
import useTranslation from 'hooks/useTranslation';
import { debounceProductsFetch } from 'utils/option-utils';
import Select from 'utils/Select';
import Translate, { translateWithDefaultMessage } from 'utils/Translate';

const RequisitionEdit = () => {
  const { requisitionId } = useParams();
  const currentLocation = useSelector((state) => state.session.currentLocation);
  const [requisition, setRequisition] = useState(null);
  const [items, setItems] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useTranslation('requisition', 'default');

  const translate = useSelector(
    (state) => translateWithDefaultMessage(getTranslate(state.localize)),
  );

  const debouncedProductsFetch = useMemo(
    () => debounceProductsFetch(500, 2, currentLocation?.id),
    [currentLocation?.id],
  );

  useEffect(() => {
    requisitionApi.editRequisition(requisitionId)
      .then(({ data }) => {
        const fetched = data?.data;
        setRequisition(fetched);
        setItems((fetched?.requisitionItems ?? []).map((item) => ({
          id: item.id,
          product: item.product ? {
            id: item.product.id,
            name: item.product.name,
            label: `${item.product.productCode} - ${item.product.name}`,
          } : null,
          quantity: item.quantity,
          status: item.status,
        })));
      })
      .catch((err) => {
        setError(err?.response?.data?.errorMessage || 'An error occurred while loading the requisition');
      });
  }, [requisitionId]);

  const addItem = () => {
    setItems((previous) => [...previous, {
      id: null, product: null, quantity: '', status: null,
    }]);
  };

  const removeItem = (index) => {
    setItems((previous) => previous.filter((item, i) => i !== index));
  };

  const updateItem = (index, values) => {
    setItems((previous) => previous.map((item, i) => (
      i === index ? { ...item, ...values } : item
    )));
  };

  const submit = async (event) => {
    event.preventDefault();
    const validItems = items.filter((item) => item.product?.id);
    setSaving(true);
    try {
      await requisitionApi.saveRequisitionItems(requisitionId, {
        requisitionItems: validItems.map((item, index) => ({
          id: item.id || null,
          productId: item.product.id,
          quantity: parseInt(item.quantity, 10) || 0,
          orderIndex: index,
        })),
      });
      window.location = REQUISITION_URL.review(requisitionId);
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

  if (!requisition) {
    return null;
  }

  return (
    <div className="d-flex flex-column m-3">
      <RequisitionSummary requisition={requisition} currentStep="edit" />
      <div className="row">
        <div className="col-md-4">
          <RequisitionHeaderPanel requisition={requisition} />
        </div>
        <div className="col-md-8">
          <div className="card">
            <div className="card-header">
              <Translate id="react.requisition.addRequisitionItems.label" defaultMessage="Add requisition items" />
            </div>
            <form className="card-body" onSubmit={submit}>
              <table className="table table-sm" data-testid="requisition-items-table">
                <thead>
                  <tr>
                    <th style={{ width: '50%' }}>
                      {translate('react.requisition.requisitionItems.label', 'Requisition items')}
                    </th>
                    <th>{translate('react.requisition.quantity.label', 'Quantity')}</th>
                    <th>{translate('react.requisition.itemStatus.label', 'Status')}</th>
                    <th>{translate('react.default.button.delete.label', 'Delete')}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    // eslint-disable-next-line react/no-array-index-key
                    <tr key={item.id || `new-${index}`}>
                      <td>
                        <Select
                          async
                          loadOptions={debouncedProductsFetch}
                          value={item.product}
                          onChange={(value) => updateItem(index, { product: value })}
                          valueKey="id"
                          labelKey="label"
                          placeholder="Search product..."
                          id={`requisition-item-product-${index}`}
                          dataTestId={`requisition-item-product-${index}`}
                        />
                      </td>
                      <td style={{ width: '120px' }}>
                        <input
                          type="number"
                          min="1"
                          className="form-control form-control-sm"
                          value={item.quantity}
                          onChange={(event) => updateItem(index, { quantity: event.target.value })}
                          data-testid={`requisition-item-quantity-${index}`}
                        />
                      </td>
                      <td>{item.status}</td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => removeItem(index)}
                          data-testid={`requisition-item-delete-${index}`}
                        >
                          <Translate id="react.default.button.delete.label" defaultMessage="Delete" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="d-flex justify-content-end mb-3">
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm"
                  onClick={addItem}
                  data-testid="requisition-add-item-button"
                >
                  <Translate id="react.requisition.addNewItem.label" defaultMessage="Add new item" />
                </button>
              </div>
              <div className="d-flex justify-content-center">
                <a className="btn btn-outline-secondary mr-2" href={REQUISITION_URL.show(requisitionId)}>
                  <Translate id="react.default.button.back.label" defaultMessage="Back" />
                </a>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                  data-testid="requisition-save-items-button"
                >
                  <Translate id="react.default.button.next.label" defaultMessage="Next" />
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RequisitionEdit;
