import React, { useEffect, useMemo, useState } from 'react';

import { getTranslate } from 'react-localize-redux';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import Alert from 'react-s-alert';

import requisitionTemplateApi from 'api/services/RequisitionTemplateApi';
import StockListTemplateSummary from 'components/stock-list/template/StockListTemplateSummary';
import { REQUISITION_TEMPLATE_URL } from 'consts/applicationUrls';
import useTranslation from 'hooks/useTranslation';
import { debounceProductsFetch } from 'utils/option-utils';
import Select from 'utils/Select';
import Translate, { translateWithDefaultMessage } from 'utils/Translate';

const packageLabel = (pkg) => `${pkg?.uom?.code || ''}/${pkg?.quantity || ''}`;

const StockListTemplateEdit = () => {
  const { templateId } = useParams();
  const currentLocation = useSelector((state) => state.session.currentLocation);
  const [template, setTemplate] = useState(null);
  const [items, setItems] = useState([]);
  const [newProduct, setNewProduct] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useTranslation('stockListManagement', 'requisition', 'default');

  const translate = useSelector(
    (state) => translateWithDefaultMessage(getTranslate(state.localize)),
  );

  const debouncedProductsFetch = useMemo(
    () => debounceProductsFetch(500, 2, currentLocation?.id),
    [currentLocation?.id],
  );

  const isPull = template?.replenishmentTypeCode === 'PULL';

  // keepLocalEdits preserves unsaved quantity/package edits on rows that
  // still exist after an add/remove reload
  const loadTemplate = (keepLocalEdits = false) => requisitionTemplateApi.getTemplate(templateId)
    .then(({ data }) => {
      const fetched = data?.data;
      setTemplate(fetched);
      setItems((previous) => (fetched?.requisitionItems ?? []).map((item) => {
        const existing = keepLocalEdits
          ? previous.find((previousItem) => previousItem.id === item.id)
          : null;
        return {
          id: item.id,
          product: item.product,
          quantity: existing ? existing.quantity : (item.quantity ?? ''),
          productPackageId: existing
            ? existing.productPackageId : (item.productPackageId ?? null),
          monthlyDemand: item.monthlyDemand,
          totalCost: item.totalCost,
        };
      }));
    })
    .catch((err) => {
      setError(err?.response?.data?.errorMessage || 'An error occurred while loading the stock list');
    });

  useEffect(() => {
    loadTemplate();
  }, [templateId]);

  const addItem = async () => {
    if (!newProduct?.id) {
      return;
    }
    try {
      await requisitionTemplateApi.addTemplateItem(templateId, {
        productId: newProduct.id,
        quantity: 1,
        orderIndex: items.length,
      });
      setNewProduct(null);
      await loadTemplate(true);
    } catch (err) {
      const message = err?.response?.data?.errorMessage;
      if (message) {
        Alert.error(message);
      }
    }
  };

  const removeItem = async (itemId) => {
    try {
      await requisitionTemplateApi.removeTemplateItem(templateId, itemId);
      await loadTemplate(true);
    } catch (err) {
      const message = err?.response?.data?.errorMessage;
      if (message) {
        Alert.error(message);
      }
    }
  };

  const updateItem = (index, values) => {
    setItems((previous) => previous.map(
      (item, itemIndex) => (itemIndex === index ? { ...item, ...values } : item),
    ));
  };

  const save = async () => {
    setSaving(true);
    try {
      await requisitionTemplateApi.updateTemplateItems(templateId, {
        items: items.map((item) => ({
          id: item.id,
          quantity: item.quantity === '' ? null : item.quantity,
          productPackageId: item.productPackageId || null,
        })),
      });
      await loadTemplate();
      Alert.success('Stock list saved');
    } catch (err) {
      const message = err?.response?.data?.errors?.join('; ')
        || err?.response?.data?.errorMessage;
      if (message) {
        Alert.error(message);
      }
    } finally {
      setSaving(false);
    }
  };

  if (error) {
    return <div className="alert alert-danger m-3" role="alert">{error}</div>;
  }

  if (!template) {
    return null;
  }

  return (
    <div className="d-flex flex-column m-3">
      <StockListTemplateSummary template={template} currentScreen="edit" />
      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <Translate id="react.stockListTemplate.editItems.label" defaultMessage="Edit stock list items" />
          <div className="d-flex align-items-center">
            <div style={{ minWidth: '300px' }} className="mr-2">
              <Select
                async
                loadOptions={debouncedProductsFetch}
                value={newProduct}
                onChange={(value) => setNewProduct(value)}
                valueKey="id"
                labelKey="label"
                placeholder="Search product..."
                id="stocklist-template-add-product-select"
                dataTestId="stocklist-template-add-product-select"
              />
            </div>
            <button
              type="button"
              className="btn btn-sm btn-outline-primary"
              onClick={addItem}
              disabled={!newProduct?.id}
              data-testid="stocklist-template-add-item-button"
            >
              <Translate id="react.default.button.add.label" defaultMessage="Add" />
            </button>
          </div>
        </div>
        <div className="table-responsive">
          <table className="table table-sm table-striped mb-0" data-testid="stocklist-template-items-table">
            <thead>
              <tr>
                <th>{translate('react.stockListTemplate.productCode.label', 'Code')}</th>
                <th>{translate('react.default.product.label', 'Product')}</th>
                <th>{translate('react.stockListTemplate.category.label', 'Category')}</th>
                <th>{translate('react.stockListTemplate.uom.label', 'UOM')}</th>
                {!isPull && (
                  <>
                    <th className="text-right">{translate('react.stockListTemplate.maxQuantity.label', 'Quantity')}</th>
                    <th className="text-right">{translate('react.stockListTemplate.monthlyDemand.label', 'Monthly demand')}</th>
                  </>
                )}
                <th className="text-right">{translate('react.default.actions.label', 'Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id} className={item.product?.active === false ? 'table-warning' : ''}>
                  <td>{item.product?.productCode}</td>
                  <td>{item.product?.displayName || item.product?.name}</td>
                  <td>{item.product?.category}</td>
                  <td>
                    {item.product?.packages?.length ? (
                      <select
                        className="form-control form-control-sm"
                        value={item.productPackageId || ''}
                        onChange={(event) => updateItem(index, {
                          productPackageId: event.target.value || null,
                        })}
                        data-testid={`stocklist-template-item-package-${index}`}
                      >
                        <option value="">{`EA/1 -- ${item.product?.unitOfMeasure || 'EA'}`}</option>
                        {item.product.packages.map((pkg) => (
                          <option key={pkg.id} value={pkg.id}>{packageLabel(pkg)}</option>
                        ))}
                      </select>
                    ) : (item.product?.unitOfMeasure || 'EA')}
                  </td>
                  {!isPull && (
                    <>
                      <td className="text-right" style={{ maxWidth: '120px' }}>
                        <input
                          type="number"
                          min="0"
                          className="form-control form-control-sm text-right"
                          value={item.quantity ?? ''}
                          onChange={(event) => updateItem(index, {
                            quantity: event.target.value,
                          })}
                          data-testid={`stocklist-template-item-quantity-${index}`}
                        />
                      </td>
                      <td className="text-right">{item.monthlyDemand}</td>
                    </>
                  )}
                  <td className="text-right">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => removeItem(item.id)}
                      data-testid={`stocklist-template-item-delete-${index}`}
                    >
                      <Translate id="react.default.button.delete.label" defaultMessage="Delete" />
                    </button>
                  </td>
                </tr>
              ))}
              {!items.length && (
                <tr>
                  <td colSpan={isPull ? '5' : '7'} className="text-center py-3">
                    <Translate id="react.default.noResults.label" defaultMessage="No results" />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="card-footer d-flex justify-content-end">
          <a className="btn btn-outline-secondary mr-2" href={REQUISITION_TEMPLATE_URL.show(templateId)}>
            <Translate id="react.default.button.back.label" defaultMessage="Back" />
          </a>
          <button
            type="button"
            className="btn btn-primary"
            onClick={save}
            disabled={saving}
            data-testid="stocklist-template-save-items-button"
          >
            <Translate id="react.default.button.save.label" defaultMessage="Save" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default StockListTemplateEdit;
