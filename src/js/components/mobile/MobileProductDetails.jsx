import React, { useEffect, useState } from 'react';

import PropTypes from 'prop-types';

import mobileApi from 'api/services/MobileApi';
import MobileLayout from 'components/mobile/MobileLayout';
import { BARCODE_URL, MOBILE_URL } from 'consts/applicationUrls';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';

const MobileProductDetails = ({ match }) => {
  useTranslation('mobile', 'default');

  const translate = useTranslate();
  const [productSummary, setProductSummary] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      const response = await mobileApi.getProductSummary(match.params.productId);
      if (response?.data?.data) {
        setProductSummary(response.data.data);
      } else {
        setErrorMessage(response?.data?.errorMessage
          ?? translate('react.mobile.productNotAvailable.label', 'Product is not available in this location'));
      }
    };
    fetchData();
  }, [match.params.productId]);

  const product = productSummary?.product;
  const quantityOnHand = Math.round(productSummary?.quantityOnHand ?? 0);

  return (
    <MobileLayout title={translate('react.mobile.product.label', 'Product')}>
      <div data-testid="mobile-product-details">
        <div className="row">
          <a href={MOBILE_URL.productList()} className="nav nav-link">
            <i className="fa fa-chevron-left" />
            {' '}
            {translate('react.default.button.back.label', 'Back')}
          </a>
        </div>
        {errorMessage && (
          <div className="alert alert-warning" role="status" aria-label="message">
            {errorMessage}
          </div>
        )}
        {product && (
          <div className="card">
            <div className="card-body">
              <h5 className="display-5">
                <small className="text-small">{product.productCode}</small>
                {' '}
                {product.name}
              </h5>
              <picture>
                <img
                  src={product.thumbnailId
                    ? MOBILE_URL.productImage(product.thumbnailId)
                    : MOBILE_URL.defaultProductImage()}
                  alt={product.name}
                  className="img-fluid"
                />
              </picture>
              <h3 className="display-3">
                {translate('react.mobile.description.label', 'Description')}
              </h3>
              {product.description && <p>{product.description}</p>}
              <h3 className="display-3">
                {translate('react.mobile.details.label', 'Details')}
              </h3>
              <ul className="list-group">
                <li className="list-group-item d-flex justify-content-between align-items-center">
                  {translate('react.mobile.status.label', 'Status')}
                  {(productSummary?.quantityOnHand ?? 0) > 0
                    ? <div className="text-success">{translate('react.mobile.inStock.label', 'In Stock')}</div>
                    : <div className="text-danger">{translate('react.mobile.outOfStock.label', 'Out of Stock')}</div>}
                </li>
                <li className="list-group-item d-flex justify-content-between align-items-center">
                  <div className="label">{translate('react.mobile.qoh.label', 'QoH')}</div>
                  <span className="badge badge-primary badge-pill text-secondary">
                    {quantityOnHand.toLocaleString()}
                    {' '}
                    {product.unitOfMeasure || 'EA'}
                  </span>
                </li>
                {(product.attributes ?? []).map((attribute, index) => (
                  <li
                    className="list-group-item d-flex justify-content-between align-items-center"
                    key={attribute.name ?? index}
                  >
                    {attribute.name}
                    <span className="badge badge-primary badge-pill text-secondary">
                      {attribute.value ?? 0}
                      {' '}
                      {attribute.unitOfMeasure}
                    </span>
                  </li>
                ))}
                <li className="list-group-item d-flex justify-content-between align-items-center">
                  {translate('react.mobile.barcode.label', 'Barcode')}
                  <img src={BARCODE_URL.render(product.productCode)} alt={product.productCode} height="20" />
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </MobileLayout>
  );
};

export default MobileProductDetails;

MobileProductDetails.propTypes = {
  match: PropTypes.shape({
    params: PropTypes.shape({
      productId: PropTypes.string.isRequired,
    }).isRequired,
  }).isRequired,
};
