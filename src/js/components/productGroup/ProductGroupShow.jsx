import React, { useEffect, useState } from 'react';

import { confirmAlert } from 'react-confirm-alert';
import { useDispatch } from 'react-redux';
import { useHistory, useParams } from 'react-router-dom';

import { hideSpinner, showSpinner } from 'actions';
import productGroupApi from 'api/services/ProductGroupApi';
import Button from 'components/form-elements/Button';
import notification from 'components/Layout/notifications/notification';
import Section from 'components/Layout/v2/Section';
import { INVENTORY_ITEM_URL, PRODUCT_GROUP_URL } from 'consts/applicationUrls';
import NotificationType from 'consts/notificationTypes';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';
import HeaderWrapper from 'wrappers/HeaderWrapper';
import PageWrapper from 'wrappers/PageWrapper';

const formatDate = (value) => (value ? new Date(value).toLocaleString() : '');

const ProductGroupShow = () => {
  useTranslation('productGroup', 'default');

  const { productGroupId } = useParams();
  const history = useHistory();
  const dispatch = useDispatch();
  const translate = useTranslate();

  const [productGroup, setProductGroup] = useState(null);

  useEffect(() => {
    productGroupApi.getProductGroup(productGroupId)
      .then((response) => setProductGroup(response?.data?.data));
  }, [productGroupId]);

  const deleteProductGroup = async () => {
    dispatch(showSpinner());
    try {
      const { status } = await productGroupApi.deleteProductGroup(productGroupId);
      if (status === 204) {
        notification(NotificationType.SUCCESS)({
          message: translate('react.productGroup.delete.success.label', 'Product group has been deleted successfully'),
        });
        history.push(PRODUCT_GROUP_URL.list());
      }
    } finally {
      dispatch(hideSpinner());
    }
  };

  const onDelete = () => {
    confirmAlert({
      title: translate('react.default.areYouSure.label', 'Are you sure?'),
      message: translate(
        'react.productGroup.delete.confirm.label',
        'Are you sure you want to delete this product group?',
      ),
      buttons: [
        {
          label: translate('react.default.yes.label', 'Yes'),
          onClick: deleteProductGroup,
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
          <Translate id="react.productGroup.show.label" defaultMessage="View Product Group" />
          {productGroup?.name ? ` - ${productGroup.name}` : ''}
        </span>
      </HeaderWrapper>
      <div className="p-3">
        <Section
          title={{ label: 'react.productGroup.detailsSection.label', defaultMessage: 'Product Group Details' }}
        >
          <table className="table table-sm w-auto" data-testid="product-group-details">
            <tbody>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.productGroup.id.label" defaultMessage="Id" />
                </td>
                <td aria-label="Id">{productGroup?.id}</td>
              </tr>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.productGroup.name.label" defaultMessage="Name" />
                </td>
                <td aria-label="Name">{productGroup?.name}</td>
              </tr>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.productGroup.dateCreated.label" defaultMessage="Date Created" />
                </td>
                <td aria-label="Date Created">{formatDate(productGroup?.dateCreated)}</td>
              </tr>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.productGroup.lastUpdated.label" defaultMessage="Last Updated" />
                </td>
                <td aria-label="Last Updated">{formatDate(productGroup?.lastUpdated)}</td>
              </tr>
            </tbody>
          </table>
        </Section>
        <Section
          title={{ label: 'react.productGroup.productsSection.label', defaultMessage: 'Products' }}
        >
          <ul aria-label="Products" data-testid="product-group-products">
            {(productGroup?.products ?? []).map((product) => (
              <li key={product.id}>
                <a href={INVENTORY_ITEM_URL.showStockCard(product.id)}>
                  {product.productCode}
                  {' '}
                  {product.name}
                </a>
              </li>
            ))}
          </ul>
        </Section>
        <div className="d-flex gap-8 pt-3">
          <Button
            defaultLabel="Edit"
            label="react.default.button.edit.label"
            variant="primary"
            onClick={() => history.push(PRODUCT_GROUP_URL.edit(productGroupId))}
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
            onClick={() => history.push(PRODUCT_GROUP_URL.list())}
          />
        </div>
      </div>
    </PageWrapper>
  );
};

export default ProductGroupShow;
