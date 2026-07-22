import React, { useEffect, useState } from 'react';

import { confirmAlert } from 'react-confirm-alert';
import { useDispatch } from 'react-redux';
import { useHistory, useParams } from 'react-router-dom';

import { hideSpinner, showSpinner } from 'actions';
import productTypeApi from 'api/services/ProductTypeApi';
import Button from 'components/form-elements/Button';
import notification from 'components/Layout/notifications/notification';
import Section from 'components/Layout/v2/Section';
import { PRODUCT_TYPE_URL } from 'consts/applicationUrls';
import NotificationType from 'consts/notificationTypes';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';
import HeaderWrapper from 'wrappers/HeaderWrapper';
import PageWrapper from 'wrappers/PageWrapper';

const formatDate = (value) => (value ? new Date(value).toLocaleString() : '');

const ProductTypeShow = () => {
  useTranslation('productType', 'default');

  const { productTypeId } = useParams();
  const history = useHistory();
  const dispatch = useDispatch();
  const translate = useTranslate();

  const [productType, setProductType] = useState(null);

  useEffect(() => {
    productTypeApi.getProductType(productTypeId)
      .then((response) => setProductType(response?.data?.data));
  }, [productTypeId]);

  const deleteProductType = async () => {
    dispatch(showSpinner());
    try {
      const { status } = await productTypeApi.deleteProductType(productTypeId);
      if (status === 204) {
        notification(NotificationType.SUCCESS)({
          message: translate('react.productType.delete.success.label', 'Product type has been deleted successfully'),
        });
        history.push(PRODUCT_TYPE_URL.list());
      }
    } finally {
      dispatch(hideSpinner());
    }
  };

  const onDelete = () => {
    confirmAlert({
      title: translate('react.default.areYouSure.label', 'Are you sure?'),
      message: translate(
        'react.productType.delete.confirm.label',
        'Are you sure you want to delete this product type?',
      ),
      buttons: [
        {
          label: translate('react.default.yes.label', 'Yes'),
          onClick: deleteProductType,
        },
        {
          label: translate('react.default.no.label', 'No'),
        },
      ],
    });
  };

  return (
    <PageWrapper>
      <HeaderWrapper className="align-items-center h-auto py-3">
        <span className="title">
          <Translate id="react.productType.show.label" defaultMessage="View Product Type" />
          {productType?.name ? ` - ${productType.name}` : ''}
        </span>
      </HeaderWrapper>
      <div className="p-3">
        <Section
          title={{ label: 'react.productType.detailsSection.label', defaultMessage: 'Product Type Details' }}
        >
          <table className="table table-sm w-auto" data-testid="product-type-details">
            <tbody>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.productType.id.label" defaultMessage="Id" />
                </td>
                <td aria-label="Id">{productType?.id}</td>
              </tr>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.productType.name.label" defaultMessage="Name" />
                </td>
                <td aria-label="Name">{productType?.name}</td>
              </tr>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.productType.productTypeCode.label" defaultMessage="Product Type Code" />
                </td>
                <td aria-label="Product Type Code">{productType?.productTypeCode}</td>
              </tr>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.productType.productIdentifierFormat.label" defaultMessage="Product Identifier Format" />
                </td>
                <td aria-label="Product Identifier Format">{productType?.productIdentifierFormat}</td>
              </tr>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.productType.supportedActivities.label" defaultMessage="Supported Activities" />
                </td>
                <td aria-label="Supported Activities">{(productType?.supportedActivities ?? []).join(', ')}</td>
              </tr>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.productType.requiredFields.label" defaultMessage="Required Fields" />
                </td>
                <td aria-label="Required Fields">{(productType?.requiredFields ?? []).join(', ')}</td>
              </tr>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.productType.displayedFields.label" defaultMessage="Displayed Fields" />
                </td>
                <td aria-label="Displayed Fields">{(productType?.displayedFields ?? []).join(', ')}</td>
              </tr>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.productType.dateCreated.label" defaultMessage="Date Created" />
                </td>
                <td aria-label="Date Created">{formatDate(productType?.dateCreated)}</td>
              </tr>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.productType.lastUpdated.label" defaultMessage="Last Updated" />
                </td>
                <td aria-label="Last Updated">{formatDate(productType?.lastUpdated)}</td>
              </tr>
            </tbody>
          </table>
        </Section>
        <div className="d-flex gap-8 pt-3">
          <Button
            defaultLabel="Edit"
            label="react.default.button.edit.label"
            variant="primary"
            onClick={() => history.push(PRODUCT_TYPE_URL.edit(productTypeId))}
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
            onClick={() => history.push(PRODUCT_TYPE_URL.list())}
          />
        </div>
      </div>
    </PageWrapper>
  );
};

export default ProductTypeShow;
