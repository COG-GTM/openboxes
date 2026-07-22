import React, { useEffect, useState } from 'react';

import { confirmAlert } from 'react-confirm-alert';
import { useDispatch } from 'react-redux';
import { useHistory, useParams } from 'react-router-dom';

import { hideSpinner, showSpinner } from 'actions';
import productSupplierApi from 'api/services/ProductSupplierApi';
import Button from 'components/form-elements/Button';
import notification from 'components/Layout/notifications/notification';
import Section from 'components/Layout/v2/Section';
import { INVENTORY_ITEM_URL, PRODUCT_SUPPLIER_URL } from 'consts/applicationUrls';
import NotificationType from 'consts/notificationTypes';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';
import HeaderWrapper from 'wrappers/HeaderWrapper';
import PageWrapper from 'wrappers/PageWrapper';

const ProductSupplierShow = () => {
  useTranslation('productSupplier', 'default');

  const { productSupplierId } = useParams();
  const history = useHistory();
  const dispatch = useDispatch();
  const translate = useTranslate();

  const [productSupplier, setProductSupplier] = useState(null);

  useEffect(() => {
    productSupplierApi.getProductSupplierDetails(productSupplierId)
      .then((response) => setProductSupplier(response?.data?.data));
  }, [productSupplierId]);

  const deleteProductSupplier = async () => {
    dispatch(showSpinner());
    try {
      const { status } = await productSupplierApi.deleteProductSupplier(productSupplierId);
      if (status === 204) {
        notification(NotificationType.SUCCESS)({
          message: translate('react.productSupplier.delete.success.label', 'Product source has been deleted successfully'),
        });
        history.push(PRODUCT_SUPPLIER_URL.list());
      }
    } finally {
      dispatch(hideSpinner());
    }
  };

  const onDelete = () => {
    confirmAlert({
      title: translate('react.default.areYouSure.label', 'Are you sure?'),
      message: translate(
        'react.productSupplier.delete.confirm.label',
        'Are you sure you want to delete this product source?',
      ),
      buttons: [
        {
          label: translate('react.default.yes.label', 'Yes'),
          onClick: deleteProductSupplier,
        },
        {
          label: translate('react.default.no.label', 'No'),
        },
      ],
    });
  };

  const rows = [
    {
      labelId: 'react.productSupplier.id.label',
      defaultLabel: 'Id',
      ariaLabel: 'Id',
      value: productSupplier?.id,
    },
    {
      labelId: 'react.productSupplier.product.label',
      defaultLabel: 'Product',
      ariaLabel: 'Product',
      value: productSupplier?.product ? (
        <a href={INVENTORY_ITEM_URL.showStockCard(productSupplier.product.id)}>
          {productSupplier.product.productCode}
          {' '}
          {productSupplier.product.name}
        </a>
      ) : null,
    },
    {
      labelId: 'react.productSupplier.code.label',
      defaultLabel: 'Code',
      ariaLabel: 'Code',
      value: productSupplier?.code,
    },
    {
      labelId: 'react.productSupplier.name.label',
      defaultLabel: 'Name',
      ariaLabel: 'Name',
      value: productSupplier?.name,
    },
    {
      labelId: 'react.productSupplier.productCode.label',
      defaultLabel: 'Product Code',
      ariaLabel: 'Product Code',
      value: productSupplier?.productCode,
    },
    {
      labelId: 'react.productSupplier.upc.label',
      defaultLabel: 'UPC',
      ariaLabel: 'UPC',
      value: productSupplier?.upc,
    },
    {
      labelId: 'react.productSupplier.ndc.label',
      defaultLabel: 'NDC',
      ariaLabel: 'NDC',
      value: productSupplier?.ndc,
    },
    {
      labelId: 'react.productSupplier.supplier.label',
      defaultLabel: 'Supplier',
      ariaLabel: 'Supplier',
      value: productSupplier?.supplier?.name,
    },
    {
      labelId: 'react.productSupplier.supplierCode.label',
      defaultLabel: 'Supplier Code',
      ariaLabel: 'Supplier Code',
      value: productSupplier?.supplierCode,
    },
    {
      labelId: 'react.productSupplier.supplierName.label',
      defaultLabel: 'Supplier Product Name',
      ariaLabel: 'Supplier Product Name',
      value: productSupplier?.supplierName,
    },
    {
      labelId: 'react.productSupplier.modelNumber.label',
      defaultLabel: 'Model Number',
      ariaLabel: 'Model Number',
      value: productSupplier?.modelNumber,
    },
    {
      labelId: 'react.productSupplier.brandName.label',
      defaultLabel: 'Brand Name',
      ariaLabel: 'Brand Name',
      value: productSupplier?.brandName,
    },
    {
      labelId: 'react.productSupplier.manufacturer.label',
      defaultLabel: 'Manufacturer',
      ariaLabel: 'Manufacturer',
      value: productSupplier?.manufacturer?.name,
    },
    {
      labelId: 'react.productSupplier.manufacturerCode.label',
      defaultLabel: 'Manufacturer Code',
      ariaLabel: 'Manufacturer Code',
      value: productSupplier?.manufacturerCode,
    },
    {
      labelId: 'react.productSupplier.manufacturerName.label',
      defaultLabel: 'Manufacturer Product Name',
      ariaLabel: 'Manufacturer Product Name',
      value: productSupplier?.manufacturerName,
    },
    {
      labelId: 'react.productSupplier.standardLeadTimeDays.label',
      defaultLabel: 'Standard Lead Time (Days)',
      ariaLabel: 'Standard Lead Time (Days)',
      value: productSupplier?.standardLeadTimeDays,
    },
    {
      labelId: 'react.productSupplier.minOrderQuantity.label',
      defaultLabel: 'Minimum Order Quantity',
      ariaLabel: 'Minimum Order Quantity',
      value: productSupplier?.minOrderQuantity,
    },
    {
      labelId: 'react.productSupplier.ratingTypeCode.label',
      defaultLabel: 'Rating Type',
      ariaLabel: 'Rating Type',
      value: productSupplier?.ratingTypeCode,
    },
    {
      labelId: 'react.productSupplier.comments.label',
      defaultLabel: 'Comments',
      ariaLabel: 'Comments',
      value: productSupplier?.comments,
    },
  ];

  return (
    <PageWrapper>
      <HeaderWrapper className="align-items-center h-auto py-3">
        <span className="title">
          <Translate id="react.productSupplier.show.label" defaultMessage="View Product Source" />
          {productSupplier?.code ? ` - ${productSupplier.code}` : ''}
        </span>
      </HeaderWrapper>
      <div className="p-3">
        <Section
          title={{ label: 'react.productSupplier.detailsSection.label', defaultMessage: 'Product Source Details' }}
        >
          <table className="table table-sm w-auto" data-testid="product-supplier-details">
            <tbody>
              {rows.map((row) => (
                <tr key={row.labelId}>
                  <td className="font-weight-bold pr-4">
                    <Translate id={row.labelId} defaultMessage={row.defaultLabel} />
                  </td>
                  <td aria-label={row.ariaLabel}>{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
        <div className="d-flex gap-8 pt-3">
          <Button
            defaultLabel="Edit"
            label="react.default.button.edit.label"
            variant="primary"
            onClick={() => history.push(PRODUCT_SUPPLIER_URL.edit(productSupplierId))}
          />
          <Button
            defaultLabel="Delete"
            label="react.default.button.delete.label"
            variant="danger-outline"
            onClick={onDelete}
          />
          <Button
            defaultLabel="Cancel"
            label="react.default.button.cancel.label"
            variant="primary-outline"
            onClick={() => history.push(PRODUCT_SUPPLIER_URL.list())}
          />
        </div>
      </div>
    </PageWrapper>
  );
};

export default ProductSupplierShow;
