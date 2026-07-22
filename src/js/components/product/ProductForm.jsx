import React, { useEffect, useState } from 'react';

import { useHistory, useParams } from 'react-router-dom';
import Alert from 'react-s-alert';

import attributeApi from 'api/services/AttributeApi';
import categoryApi from 'api/services/CategoryApi';
import glAccountApi from 'api/services/GlAccountApi';
import productApi from 'api/services/ProductApi';
import productGroupApi from 'api/services/ProductGroupApi';
import selectOptionsApi from 'api/services/SelectOptionsApi';
import Button from 'components/form-elements/Button';
import { INVENTORY_ITEM_URL, PRODUCT_URL } from 'consts/applicationUrls';
import useSpinner from 'hooks/useSpinner';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';
import PageWrapper from 'wrappers/PageWrapper';

import './styles.scss';

const OTHER_OPTION = '_other';

const ProductForm = () => {
  useTranslation('product', 'default');
  const history = useHistory();
  const { id } = useParams();
  const spinner = useSpinner();
  const translate = useTranslate();

  const [product, setProduct] = useState(null);
  const [productTypes, setProductTypes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [productFamilies, setProductFamilies] = useState([]);
  const [glAccounts, setGlAccounts] = useState([]);
  const [attributes, setAttributes] = useState([]);
  const [attributeValues, setAttributeValues] = useState({});
  const [errors, setErrors] = useState([]);
  const [activeTab, setActiveTab] = useState('details');

  const fetchProduct = async () => {
    const { data } = await productApi.getProductDetails(id);
    const details = data?.data;
    setProduct(details);
    const values = {};
    details?.attributes?.forEach((productAttribute) => {
      values[productAttribute.attribute.id] = productAttribute.value;
    });
    setAttributeValues(values);
  };

  useEffect(() => {
    (async () => {
      spinner.show();
      try {
        const [
          productTypeResponse,
          categoryResponse,
          productFamilyResponse,
          glAccountResponse,
          attributeResponse,
        ] = await Promise.all([
          selectOptionsApi.getProductTypeOptions(),
          categoryApi.getCategoryOptions(),
          productGroupApi.getProductGroupsOptions(),
          glAccountApi.getGlAccountOptions(),
          attributeApi.searchAttributes({ params: { entityType: 'PRODUCT' } }),
        ]);
        setProductTypes(productTypeResponse.data?.data ?? []);
        setCategories(categoryResponse.data?.data ?? []);
        setProductFamilies(productFamilyResponse.data?.data ?? []);
        setGlAccounts(glAccountResponse.data?.data ?? []);
        setAttributes(attributeResponse.data?.data ?? []);
        await fetchProduct();
      } catch (error) {
        Alert.error(error.response?.data?.errorMessage
          ?? translate('react.product.notFound.message', 'Product not found'));
        history.push(PRODUCT_URL.list());
      } finally {
        spinner.hide();
      }
    })();
  }, [id]);

  const isDisplayed = (field) =>
    !product?.displayedFields || product.displayedFields.includes(field);

  const setField = (field, value) => {
    setProduct((previousProduct) => ({ ...previousProduct, [field]: value }));
  };

  const onSave = async (event) => {
    event.preventDefault();
    setErrors([]);
    const payload = {
      ...product,
      productType: product.productType?.id ? { id: product.productType.id } : null,
      category: product.category?.id ? { id: product.category.id } : null,
      productFamily: product.productFamily?.id ? { id: product.productFamily.id } : null,
      glAccount: product.glAccount?.id ? { id: product.glAccount.id } : null,
      attributes: Object.entries(attributeValues)
        .map(([attributeId, value]) => ({ attribute: { id: attributeId }, value: value || null })),
    };
    spinner.show();
    try {
      await productApi.updateProductDetails(id, payload);
      Alert.success(translate('react.product.saved.message', 'Product saved'));
      await fetchProduct();
    } catch (error) {
      const errorMessages = error.response?.data?.errorMessages
        ?? [error.response?.data?.errorMessage ?? 'Unable to save product'];
      setErrors(errorMessages);
    } finally {
      spinner.hide();
    }
  };

  const onDeleteDocument = async (documentId) => {
    spinner.show();
    try {
      await productApi.deleteDocument(id, documentId);
      Alert.success(translate('react.product.documentDeleted.message', 'Document deleted'));
      await fetchProduct();
    } catch (error) {
      Alert.error(error.response?.data?.errorMessage ?? 'Unable to delete document');
    } finally {
      spinner.hide();
    }
  };

  if (!product) {
    return <PageWrapper><div className="p-3" /></PageWrapper>;
  }

  const textField = (field, labelId, defaultLabel, productField = null) => (
    (!productField || isDisplayed(productField)) && (
      <div className="form-group row" key={field}>
        <label className="col-sm-3 col-form-label" htmlFor={field}>
          <Translate id={labelId} defaultMessage={defaultLabel} />
        </label>
        <div className="col-sm-9">
          <input
            id={field}
            type="text"
            className="form-control"
            value={product[field] ?? ''}
            onChange={(event) => setField(field, event.target.value)}
          />
        </div>
      </div>
    )
  );

  const checkboxField = (field, labelId, defaultLabel, productField = null) => (
    (!productField || isDisplayed(productField)) && (
      <div className="form-group row" key={field}>
        <span className="col-sm-3 col-form-label">
          <Translate id={labelId} defaultMessage={defaultLabel} />
        </span>
        <div className="col-sm-9 d-flex align-items-center">
          <input
            id={field}
            type="checkbox"
            checked={Boolean(product[field])}
            onChange={(event) => setField(field, event.target.checked)}
          />
        </div>
      </div>
    )
  );

  const selectField = (field, labelId, defaultLabel, options, productField = null) => (
    (!productField || isDisplayed(productField)) && (
      <div className="form-group row" key={field}>
        <label className="col-sm-3 col-form-label" htmlFor={field}>
          <Translate id={labelId} defaultMessage={defaultLabel} />
        </label>
        <div className="col-sm-9">
          <select
            id={field}
            className="form-control"
            value={product[field]?.id ?? ''}
            onChange={(event) =>
              setField(field, event.target.value ? { id: event.target.value } : null)}
          >
            <option value="" aria-label="empty" />
            {options.map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
        </div>
      </div>
    )
  );

  const tabs = [
    { id: 'details', label: 'react.product.tab.details.label', defaultLabel: 'Details' },
    { id: 'sources', label: 'react.product.tab.sources.label', defaultLabel: 'Sources' },
    { id: 'stockLevels', label: 'react.product.tab.stockLevels.label', defaultLabel: 'Stock Levels' },
    { id: 'documents', label: 'react.product.tab.documents.label', defaultLabel: 'Documents' },
    { id: 'associations', label: 'react.product.tab.associations.label', defaultLabel: 'Associations' },
    { id: 'packages', label: 'react.product.tab.packages.label', defaultLabel: 'Packages' },
    { id: 'catalogs', label: 'react.product.tab.catalogs.label', defaultLabel: 'Catalogs' },
    { id: 'groups', label: 'react.product.tab.groups.label', defaultLabel: 'Groups' },
    { id: 'synonyms', label: 'react.product.tab.synonyms.label', defaultLabel: 'Synonyms' },
  ];

  return (
    <PageWrapper>
      <div className="d-flex flex-column product-page p-3">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h3 className="mb-0" data-testid="product-edit-title">
            <Translate id="react.product.editProduct.label" defaultMessage="Edit product" />
            {` — ${product.productCode} ${product.name}`}
          </h3>
          <div className="d-flex gap-8">
            <a className="btn btn-outline-primary" href={INVENTORY_ITEM_URL.showStockCard(id)}>
              <Translate id="react.product.viewStockCard.label" defaultMessage="View stock card" />
            </a>
            <Button
              label="react.product.addDocument.label"
              defaultLabel="Add document"
              variant="primary-outline"
              onClick={() => history.push(PRODUCT_URL.addDocument(id))}
            />
          </div>
        </div>
        {errors.length > 0 && (
          <div className="alert alert-danger" role="alert" aria-label="error-message">
            <ul className="mb-0">
              {errors.map((error) => <li key={error}>{error}</li>)}
            </ul>
          </div>
        )}
        <ul className="nav nav-tabs mb-3">
          {tabs.map((tab) => (
            <li className="nav-item" key={tab.id}>
              <button
                type="button"
                className={`nav-link ${activeTab === tab.id ? 'active' : ''}`}
                data-testid={`product-tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Translate id={tab.label} defaultMessage={tab.defaultLabel} />
              </button>
            </li>
          ))}
        </ul>
        {activeTab === 'details' && (
          <form className="product-form" onSubmit={onSave} data-testid="product-form">
            {checkboxField('active', 'react.product.active.label', 'Active', 'ACTIVE')}
            {selectField('productType', 'react.product.productType.label', 'Product Type', productTypes)}
            {textField('productCode', 'react.product.productCode.label', 'Product Code', 'PRODUCT_CODE')}
            {textField('name', 'react.product.name.label', 'Product Name', 'NAME')}
            {selectField('category', 'react.product.category.label', 'Category', categories, 'CATEGORY')}
            {selectField('productFamily', 'react.product.productFamily.label', 'Product Family', productFamilies, 'PRODUCT_FAMILY')}
            {selectField('glAccount', 'react.product.glAccount.label', 'GL Account', glAccounts, 'GL_ACCOUNT')}
            {textField('unitOfMeasure', 'react.product.unitOfMeasure.label', 'Unit of Measure', 'UNIT_OF_MEASURE')}
            {textField('pricePerUnit', 'react.product.pricePerUnit.label', 'Price per unit', 'PRICE_PER_UNIT')}
            {isDisplayed('DESCRIPTION') && (
              <div className="form-group row">
                <label className="col-sm-3 col-form-label" htmlFor="description">
                  <Translate id="react.product.description.label" defaultMessage="Description" />
                </label>
                <div className="col-sm-9">
                  <textarea
                    id="description"
                    className="form-control"
                    value={product.description ?? ''}
                    onChange={(event) => setField('description', event.target.value)}
                  />
                </div>
              </div>
            )}
            {isDisplayed('TAGS') && textField('tags', 'react.product.tags.label', 'Tags')}
            {textField('abcClass', 'react.product.abcClass.label', 'ABC Class', 'ABC_CLASS')}
            {checkboxField('coldChain', 'react.product.coldChain.label', 'Cold Chain', 'COLD_CHAIN')}
            {checkboxField('controlledSubstance', 'react.product.controlledSubstance.label', 'Controlled Substance', 'CONTROLLED_SUBSTANCE')}
            {checkboxField('hazardousMaterial', 'react.product.hazardousMaterial.label', 'Hazardous Material', 'HAZARDOUS_MATERIAL')}
            {checkboxField('reconditioned', 'react.product.reconditioned.label', 'Reconditioned', 'RECONDITIONED')}
            {checkboxField('lotAndExpiryControl', 'react.product.lotAndExpiryControl.label', 'Lot and Expiry Control', 'LOT_AND_EXPIRY_CONTROL')}
            {textField('brandName', 'react.product.brandName.label', 'Brand', 'BRAND_NAME')}
            {textField('manufacturer', 'react.product.manufacturer.label', 'Manufacturer', 'MANUFACTURER')}
            {textField('manufacturerCode', 'react.product.manufacturerCode.label', 'Manufacturer Code', 'MANUFACTURER_CODE')}
            {textField('manufacturerName', 'react.product.manufacturerName.label', 'Manufacturer Name', 'MANUFACTURER_NAME')}
            {textField('modelNumber', 'react.product.modelNumber.label', 'Model Number', 'MODEL_NUMBER')}
            {textField('vendor', 'react.product.vendor.label', 'Vendor', 'VENDOR')}
            {textField('vendorCode', 'react.product.vendorCode.label', 'Vendor Code', 'VENDOR_CODE')}
            {textField('vendorName', 'react.product.vendorName.label', 'Vendor Name', 'VENDOR_NAME')}
            {textField('upc', 'react.product.upc.label', 'UPC', 'UPC')}
            {textField('ndc', 'react.product.ndc.label', 'NDC', 'NDC')}
            {attributes.length > 0 && (
              <>
                <h5><Translate id="react.product.attributes.label" defaultMessage="Attributes" /></h5>
                {attributes.map((attribute) => {
                  const value = attributeValues[attribute.id] ?? '';
                  const hasOptions = attribute.options?.length > 0;
                  const isOtherValue = hasOptions && value && !attribute.options.includes(value);
                  return (
                    <div className="form-group row" key={attribute.id}>
                      <label className="col-sm-3 col-form-label" htmlFor={`attribute-${attribute.id}`}>
                        {attribute.name}
                        {attribute.required ? ' *' : ''}
                      </label>
                      <div className="col-sm-9">
                        {hasOptions ? (
                          <>
                            <select
                              id={`attribute-${attribute.id}`}
                              className="form-control"
                              value={isOtherValue ? OTHER_OPTION : value}
                              onChange={(event) => setAttributeValues((previousValues) => ({
                                ...previousValues,
                                [attribute.id]: event.target.value === OTHER_OPTION ? ' ' : event.target.value,
                              }))}
                            >
                              <option value="" aria-label="empty" />
                              {attribute.options.map((option) => (
                                <option key={option} value={option}>{option}</option>
                              ))}
                              {attribute.allowOther && (
                                <option value={OTHER_OPTION}>
                                  {translate('react.product.attribute.other.label', 'Other')}
                                </option>
                              )}
                            </select>
                            {attribute.allowOther && isOtherValue && (
                              <input
                                type="text"
                                className="form-control mt-1"
                                value={value.trim() === '' ? '' : value}
                                onChange={(event) => setAttributeValues((previousValues) => ({
                                  ...previousValues,
                                  [attribute.id]: event.target.value || ' ',
                                }))}
                              />
                            )}
                          </>
                        ) : (
                          <input
                            id={`attribute-${attribute.id}`}
                            type="text"
                            className="form-control"
                            value={value}
                            onChange={(event) => setAttributeValues((previousValues) => ({
                              ...previousValues,
                              [attribute.id]: event.target.value,
                            }))}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
            <div className="d-flex gap-8 mt-3">
              <Button
                type="submit"
                label="react.default.button.save.label"
                defaultLabel="Save"
                variant="primary"
              />
              <Button
                label="react.default.button.cancel.label"
                defaultLabel="Cancel"
                variant="primary-outline"
                onClick={() => { window.location = INVENTORY_ITEM_URL.showStockCard(id); }}
              />
            </div>
          </form>
        )}
        {activeTab === 'sources' && (
          <table className="table table-sm" data-testid="product-sources-table">
            <thead>
              <tr>
                <th>{translate('react.product.source.code.label', 'Source Code')}</th>
                <th>{translate('react.product.source.name.label', 'Source Name')}</th>
                <th>{translate('react.product.supplier.label', 'Supplier')}</th>
                <th>{translate('react.product.supplierCode.label', 'Supplier Code')}</th>
              </tr>
            </thead>
            <tbody>
              {product.productSuppliers?.map((productSupplier) => (
                <tr key={productSupplier.id}>
                  <td>{productSupplier.code}</td>
                  <td>{productSupplier.name}</td>
                  <td>{productSupplier.supplier?.name}</td>
                  <td>{productSupplier.supplierCode}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {activeTab === 'stockLevels' && (
          <table className="table table-sm" data-testid="product-stock-levels-table">
            <thead>
              <tr>
                <th>{translate('react.product.facility.label', 'Facility')}</th>
                <th>{translate('react.product.binLocation.label', 'Bin Location')}</th>
                <th>{translate('react.product.minQuantity.label', 'Min')}</th>
                <th>{translate('react.product.reorderQuantity.label', 'Reorder')}</th>
                <th>{translate('react.product.maxQuantity.label', 'Max')}</th>
              </tr>
            </thead>
            <tbody>
              {product.inventoryLevels?.map((inventoryLevel) => (
                <tr key={inventoryLevel.id}>
                  <td>{inventoryLevel.facility}</td>
                  <td>{inventoryLevel.binLocation}</td>
                  <td>{inventoryLevel.minQuantity}</td>
                  <td>{inventoryLevel.reorderQuantity}</td>
                  <td>{inventoryLevel.maxQuantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {activeTab === 'documents' && (
          <table className="table table-sm" data-testid="product-documents-table">
            <thead>
              <tr>
                <th>{translate('react.product.document.name.label', 'Name')}</th>
                <th>{translate('react.product.document.filename.label', 'File')}</th>
                <th>{translate('react.product.document.type.label', 'Type')}</th>
                <th aria-label="actions" />
              </tr>
            </thead>
            <tbody>
              {product.documents?.map((document) => (
                <tr key={document.id}>
                  <td>{document.name}</td>
                  <td>{document.filename || document.fileUri}</td>
                  <td>{document.documentType}</td>
                  <td>
                    <Button
                      label="react.default.button.delete.label"
                      defaultLabel="Delete"
                      variant="danger"
                      onClick={() => onDeleteDocument(document.id)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {activeTab === 'associations' && (
          <table className="table table-sm" data-testid="product-associations-table">
            <thead>
              <tr>
                <th>{translate('react.product.association.type.label', 'Type')}</th>
                <th>{translate('react.product.association.product.label', 'Associated Product')}</th>
                <th>{translate('react.product.association.quantity.label', 'Quantity')}</th>
                <th>{translate('react.product.association.comments.label', 'Comments')}</th>
              </tr>
            </thead>
            <tbody>
              {product.productAssociations?.map((association) => (
                <tr key={association.id}>
                  <td>{association.code}</td>
                  <td>
                    {association.associatedProduct?.productCode}
                    {' '}
                    {association.associatedProduct?.name}
                  </td>
                  <td>{association.quantity}</td>
                  <td>{association.comments}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {activeTab === 'packages' && (
          <table className="table table-sm" data-testid="product-packages-table">
            <thead>
              <tr>
                <th>{translate('react.product.package.name.label', 'Name')}</th>
                <th>{translate('react.product.package.uom.label', 'UoM')}</th>
                <th>{translate('react.product.package.quantity.label', 'Quantity')}</th>
                <th>{translate('react.product.package.price.label', 'Price')}</th>
              </tr>
            </thead>
            <tbody>
              {product.packages?.map((productPackage) => (
                <tr key={productPackage.id}>
                  <td>{productPackage.name}</td>
                  <td>{productPackage.uom}</td>
                  <td>{productPackage.quantity}</td>
                  <td>{productPackage.price}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {activeTab === 'catalogs' && (
          <table className="table table-sm" data-testid="product-catalogs-table">
            <thead>
              <tr>
                <th>{translate('react.product.catalog.name.label', 'Catalog')}</th>
              </tr>
            </thead>
            <tbody>
              {product.catalogs?.map((catalog) => (
                <tr key={catalog.id}><td>{catalog.name}</td></tr>
              ))}
            </tbody>
          </table>
        )}
        {activeTab === 'groups' && (
          <table className="table table-sm" data-testid="product-groups-table">
            <thead>
              <tr>
                <th>{translate('react.product.group.name.label', 'Group')}</th>
              </tr>
            </thead>
            <tbody>
              {product.productGroups?.map((group) => (
                <tr key={group.id}><td>{group.name}</td></tr>
              ))}
            </tbody>
          </table>
        )}
        {activeTab === 'synonyms' && (
          <table className="table table-sm" data-testid="product-synonyms-table">
            <thead>
              <tr>
                <th>{translate('react.product.synonym.name.label', 'Synonym')}</th>
                <th>{translate('react.product.synonym.type.label', 'Type')}</th>
                <th>{translate('react.product.synonym.locale.label', 'Locale')}</th>
              </tr>
            </thead>
            <tbody>
              {product.synonyms?.map((synonym) => (
                <tr key={synonym.id}>
                  <td>{synonym.name}</td>
                  <td>{synonym.synonymTypeCode}</td>
                  <td>{synonym.locale}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </PageWrapper>
  );
};

export default ProductForm;
