import React, { useEffect, useState } from 'react';

import { useHistory, useParams } from 'react-router-dom';
import Alert from 'react-s-alert';

import productAssociationApi from 'api/services/ProductAssociationApi';
import Button from 'components/form-elements/Button';
import { PRODUCT_ASSOCIATION_URL, PRODUCT_URL } from 'consts/applicationUrls';
import useSpinner from 'hooks/useSpinner';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';
import PageWrapper from 'wrappers/PageWrapper';

import './styles.scss';

const ProductAssociationShow = () => {
  useTranslation('product', 'default');
  const spinner = useSpinner();
  const translate = useTranslate();
  const history = useHistory();
  const { id } = useParams();

  const [association, setAssociation] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    (async () => {
      spinner.show();
      try {
        const { data } = await productAssociationApi.getProductAssociation(id);
        setAssociation(data?.data);
      } catch (error) {
        Alert.error(error.response?.data?.errorMessage ?? 'Unable to load product association');
        history.push(PRODUCT_ASSOCIATION_URL.list());
      } finally {
        spinner.hide();
      }
    })();
  }, [id]);

  const onDelete = async (mutualDelete) => {
    setErrors([]);
    spinner.show();
    try {
      await productAssociationApi.deleteProductAssociation(id, mutualDelete);
      Alert.success(translate('react.productAssociation.deleted.label', 'Product association deleted'));
      history.push(PRODUCT_ASSOCIATION_URL.list());
    } catch (error) {
      setErrors([error.response?.data?.errorMessage ?? 'Unable to delete product association']);
    } finally {
      setShowDeleteDialog(false);
      spinner.hide();
    }
  };

  const onDeleteClick = () => {
    if (association?.hasMutualAssociation) {
      setShowDeleteDialog(true);
      return;
    }
    // eslint-disable-next-line no-alert
    if (window.confirm(translate('react.default.button.delete.confirm.message', 'Are you sure?'))) {
      onDelete(null);
    }
  };

  return (
    <PageWrapper>
      <div className="d-flex flex-column product-association-page p-3">
        <h3 className="mb-3" data-testid="product-association-show-title">
          <Translate id="react.productAssociation.show.title.label" defaultMessage="Show Product Association" />
        </h3>
        <div className="d-flex mb-3 gap-8">
          <a className="btn btn-outline-primary" href={PRODUCT_ASSOCIATION_URL.list()}>
            <Translate id="react.productAssociation.list.title.label" defaultMessage="Product Associations" />
          </a>
          <a className="btn btn-outline-primary" href={PRODUCT_ASSOCIATION_URL.create()}>
            <Translate id="react.productAssociation.add.label" defaultMessage="Add association" />
          </a>
        </div>
        {errors.length > 0 && (
          <div className="alert alert-danger" data-testid="product-association-errors">
            <ul className="mb-0">
              {errors.map((errorMessage) => <li key={errorMessage}>{errorMessage}</li>)}
            </ul>
          </div>
        )}
        <table className="table table-sm w-auto" data-testid="product-association-show-table">
          <tbody>
            <tr>
              <td className="font-weight-bold pr-4">
                <Translate id="react.productAssociation.id.label" defaultMessage="Id" />
              </td>
              <td aria-label="Id">{association?.id}</td>
            </tr>
            <tr>
              <td className="font-weight-bold pr-4">
                <Translate id="react.productAssociation.code.label" defaultMessage="Code" />
              </td>
              <td aria-label="Code">{association?.code}</td>
            </tr>
            <tr>
              <td className="font-weight-bold pr-4">
                <Translate id="react.productAssociation.associatedProduct.label" defaultMessage="Associated Product" />
              </td>
              <td aria-label="Associated Product">
                {association?.associatedProduct && (
                  <a href={PRODUCT_URL.show(association.associatedProduct.id)}>
                    {association.associatedProduct.name}
                  </a>
                )}
              </td>
            </tr>
            <tr>
              <td className="font-weight-bold pr-4">
                <Translate id="react.productAssociation.quantity.label" defaultMessage="Quantity" />
              </td>
              <td aria-label="Quantity">{association?.quantity}</td>
            </tr>
            <tr>
              <td className="font-weight-bold pr-4">
                <Translate id="react.productAssociation.comments.label" defaultMessage="Comments" />
              </td>
              <td aria-label="Comments">{association?.comments}</td>
            </tr>
            <tr>
              <td className="font-weight-bold pr-4">
                <Translate id="react.productAssociation.mutualAssociation.label" defaultMessage="Two-way Association" />
              </td>
              <td aria-label="Two-way Association">
                {association && (association.hasMutualAssociation
                  ? translate('react.default.yes.label', 'Yes')
                  : translate('react.default.no.label', 'No'))}
              </td>
            </tr>
            <tr>
              <td className="font-weight-bold pr-4">
                <Translate id="react.productAssociation.dateCreated.label" defaultMessage="Date Created" />
              </td>
              <td aria-label="Date Created">{association?.dateCreated}</td>
            </tr>
            <tr>
              <td className="font-weight-bold pr-4">
                <Translate id="react.productAssociation.lastUpdated.label" defaultMessage="Last Updated" />
              </td>
              <td aria-label="Last Updated">{association?.lastUpdated}</td>
            </tr>
            <tr>
              <td className="font-weight-bold pr-4">
                <Translate id="react.productAssociation.product.label" defaultMessage="Product" />
              </td>
              <td aria-label="Product">
                {association?.product && (
                  <a href={PRODUCT_URL.show(association.product.id)}>
                    {association.product.name}
                  </a>
                )}
              </td>
            </tr>
          </tbody>
        </table>
        <div className="d-flex gap-8">
          <a className="btn btn-outline-primary" href={PRODUCT_ASSOCIATION_URL.edit(id)}>
            <Translate id="react.default.button.edit.label" defaultMessage="Edit" />
          </a>
          <Button
            type="button"
            label="react.default.button.delete.label"
            defaultLabel="Delete"
            variant="danger"
            onClick={onDeleteClick}
          />
        </div>
        {showDeleteDialog && (
          <div className="product-association-delete-dialog card p-3 mt-3" data-testid="association-delete-dialog">
            <p>
              <Translate
                id="react.productAssociation.delete.mutual.message"
                defaultMessage="This association is two-way. Do you also want to delete the mutual association?"
              />
            </p>
            <div className="d-flex gap-8">
              <Button
                type="button"
                label="react.productAssociation.delete.both.label"
                defaultLabel="Delete both associations"
                variant="danger"
                onClick={() => onDelete(true)}
              />
              <Button
                type="button"
                label="react.productAssociation.delete.onlyThis.label"
                defaultLabel="Delete only this association"
                variant="danger"
                onClick={() => onDelete(false)}
              />
              <Button
                type="button"
                label="react.default.button.cancel.label"
                defaultLabel="Cancel"
                variant="primary-outline"
                onClick={() => setShowDeleteDialog(false)}
              />
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  );
};

export default ProductAssociationShow;
