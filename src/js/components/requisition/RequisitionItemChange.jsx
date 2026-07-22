import React, { useEffect, useMemo, useState } from 'react';

import { getTranslate } from 'react-localize-redux';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import Alert from 'react-s-alert';

import requisitionApi from 'api/services/RequisitionApi';
import { REQUISITION_URL } from 'consts/applicationUrls';
import useTranslation from 'hooks/useTranslation';
import { debounceProductsFetch } from 'utils/option-utils';
import Select from 'utils/Select';
import Translate, { translateWithDefaultMessage } from 'utils/Translate';

// same reason codes the legacy requisitionItem/change GSP hardcoded
const REASON_CODES = ['Package size', 'Stock out', 'Substituted', 'Damaged', 'Expired', 'Reserved',
  'Cancelled by requestor', 'Clinical adjustment', 'Other'];

const TABS = ['change', 'substitute', 'cancel'];

const RequisitionItemChange = () => {
  const { requisitionItemId } = useParams();
  const [item, setItem] = useState(null);
  const [activeTab, setActiveTab] = useState('change');
  const [quantity, setQuantity] = useState('');
  const [productPackageId, setProductPackageId] = useState(null);
  const [substituteProduct, setSubstituteProduct] = useState(null);
  const [substituteQuantity, setSubstituteQuantity] = useState('');
  const [reasonCode, setReasonCode] = useState('');
  const [comments, setComments] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const translate = useSelector(
    (state) => translateWithDefaultMessage(getTranslate(state.localize)),
  );
  const currentLocation = useSelector((state) => state.session.currentLocation);

  useTranslation('requisition', 'default');

  const debouncedProductsFetch = useMemo(
    () => debounceProductsFetch(500, 2, currentLocation?.id),
    [currentLocation?.id],
  );

  useEffect(() => {
    requisitionApi.getRequisitionItem(requisitionItemId)
      .then(({ data }) => {
        const fetched = data?.data;
        setItem(fetched);
        setQuantity(fetched?.quantity ?? '');
        setReasonCode(fetched?.cancelReasonCode ?? '');
      })
      .catch((err) => {
        setError(err?.response?.data?.errorMessage
          || translate('react.default.errors.error.label', 'An error occurred'));
      });
  }, [requisitionItemId]);

  const redirectToReview = () => {
    window.location.assign(REQUISITION_URL.review(item?.requisition?.id));
  };

  const handleError = (err) => {
    const body = err?.response?.data;
    const message = body?.errors?.join(' ') || body?.errorMessage;
    if (message) {
      Alert.error(message);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      if (activeTab === 'change') {
        await requisitionApi.changeRequisitionItemQuantity(requisitionItemId, {
          quantity: parseInt(quantity, 10),
          productPackageId: productPackageId || null,
          reasonCode: reasonCode || null,
          comments: comments || null,
        });
      } else if (activeTab === 'substitute') {
        await requisitionApi.substituteRequisitionItem(requisitionItemId, {
          productId: substituteProduct?.id || null,
          quantity: parseInt(substituteQuantity, 10),
          reasonCode: reasonCode || null,
          comments: comments || null,
        });
      } else {
        await requisitionApi.cancelRequisitionItem(requisitionItemId, {
          reasonCode: reasonCode || null,
          comments: comments || null,
        });
      }
      redirectToReview();
    } catch (err) {
      handleError(err);
      setSaving(false);
    }
  };

  if (error) {
    return <div className="alert alert-danger m-3" role="alert">{error}</div>;
  }

  if (!item) {
    return null;
  }

  return (
    <div className="d-flex flex-column m-3">
      <div className="card mb-3">
        <div className="card-header">
          {item.requisition?.requestNumber}
          {' '}
          {item.requisition?.name}
        </div>
        <div className="card-body" data-testid="requisition-item-change-summary">
          <h5>
            {item.product?.productCode}
            {' '}
            {item.product?.name}
          </h5>
          <div className="row">
            <div className="col-sm-3">
              <Translate id="react.requisition.item.requested.label" defaultMessage="Requested" />
              {': '}
              <span data-testid="requisition-item-quantity-requested">{item.quantity}</span>
            </div>
            <div className="col-sm-3">
              <Translate id="react.requisition.item.canceled.label" defaultMessage="Canceled" />
              {': '}
              {item.quantityCanceled}
            </div>
            <div className="col-sm-3">
              <Translate id="react.requisition.item.quantityOnHand.label" defaultMessage="On hand" />
              {': '}
              <span data-testid="requisition-item-quantity-on-hand">{item.quantityOnHand}</span>
            </div>
          </div>
        </div>
      </div>
      <div className="card">
        <div className="card-header p-0">
          <ul className="nav nav-tabs card-header-tabs m-0">
            {TABS.map((tab) => (
              <li className="nav-item" key={tab}>
                <button
                  type="button"
                  className={`nav-link btn btn-link ${activeTab === tab ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab)}
                  data-testid={`requisition-item-tab-${tab}`}
                >
                  <Translate id={`react.requisitionItem.tab.${tab}.label`} defaultMessage={tab} />
                </button>
              </li>
            ))}
          </ul>
        </div>
        <form className="card-body" onSubmit={submit}>
          {activeTab === 'change' && (
            <>
              <div className="form-group row">
                <label className="col-sm-3 col-form-label" htmlFor="requisition-item-quantity">
                  <Translate id="react.default.quantity.label" defaultMessage="Quantity" />
                </label>
                <div className="col-sm-6">
                  <input
                    type="number"
                    min="0"
                    id="requisition-item-quantity"
                    className="form-control"
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                    data-testid="requisition-item-quantity"
                  />
                </div>
              </div>
              {item.productPackages?.length > 0 && (
                <div className="form-group row">
                  <label className="col-sm-3 col-form-label" htmlFor="requisition-item-product-package">
                    <Translate id="react.requisitionItem.productPackage.label" defaultMessage="Package" />
                  </label>
                  <div className="col-sm-6">
                    <select
                      id="requisition-item-product-package"
                      className="form-control"
                      value={productPackageId || ''}
                      onChange={(event) => setProductPackageId(event.target.value || null)}
                    >
                      <option value="">{translate('react.default.none.label', 'None')}</option>
                      {item.productPackages.map((productPackage) => (
                        <option key={productPackage.id} value={productPackage.id}>
                          {`${productPackage.uomCode}/${productPackage.quantity}`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </>
          )}
          {activeTab === 'substitute' && (
            <>
              <div className="form-group row">
                <label className="col-sm-3 col-form-label" htmlFor="requisition-item-substitute-product">
                  <Translate id="react.requisitionItem.substituteProduct.label" defaultMessage="Substitute product" />
                </label>
                <div className="col-sm-6">
                  <Select
                    async
                    loadOptions={debouncedProductsFetch}
                    value={substituteProduct}
                    onChange={(value) => setSubstituteProduct(value)}
                    valueKey="id"
                    labelKey="label"
                    placeholder="Search product..."
                    id="requisition-item-substitute-product"
                  />
                </div>
              </div>
              <div className="form-group row">
                <label className="col-sm-3 col-form-label" htmlFor="requisition-item-substitute-quantity">
                  <Translate id="react.default.quantity.label" defaultMessage="Quantity" />
                </label>
                <div className="col-sm-6">
                  <input
                    type="number"
                    min="0"
                    id="requisition-item-substitute-quantity"
                    className="form-control"
                    value={substituteQuantity}
                    onChange={(event) => setSubstituteQuantity(event.target.value)}
                  />
                </div>
              </div>
            </>
          )}
          <div className="form-group row">
            <label className="col-sm-3 col-form-label" htmlFor="requisition-item-reason-code">
              <Translate id="react.requisition.item.reasonCode.label" defaultMessage="Reason code" />
            </label>
            <div className="col-sm-6">
              <select
                id="requisition-item-reason-code"
                className="form-control"
                value={reasonCode || ''}
                onChange={(event) => setReasonCode(event.target.value)}
                data-testid="requisition-item-reason-code"
              >
                <option value="" aria-label="empty" />
                {REASON_CODES.map((code) => (
                  <option key={code} value={code}>{code}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-group row">
            <label className="col-sm-3 col-form-label" htmlFor="requisition-item-comments">
              <Translate id="react.requisition.comments.label" defaultMessage="Comments" />
            </label>
            <div className="col-sm-6">
              <textarea
                id="requisition-item-comments"
                className="form-control"
                value={comments}
                onChange={(event) => setComments(event.target.value)}
              />
            </div>
          </div>
          <div className="d-flex justify-content-center">
            <a className="btn btn-outline-secondary mr-2" href={REQUISITION_URL.review(item.requisition?.id)}>
              <Translate id="react.default.button.back.label" defaultMessage="Back" />
            </a>
            <button type="submit" className="btn btn-primary" disabled={saving} data-testid="requisition-item-save-button">
              <Translate id="react.default.button.save.label" defaultMessage="Save" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RequisitionItemChange;
