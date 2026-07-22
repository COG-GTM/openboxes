import React, { useEffect, useState } from 'react';

import { useParams } from 'react-router-dom';
import Alert from 'react-s-alert';

import productApi from 'api/services/ProductApi';
import { INVENTORY_ITEM_URL, PRODUCT_URL } from 'consts/applicationUrls';
import useSpinner from 'hooks/useSpinner';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';
import PageWrapper from 'wrappers/PageWrapper';

import './styles.scss';

const ProductShow = () => {
  useTranslation('product', 'default');
  const spinner = useSpinner();
  const translate = useTranslate();
  const { id } = useParams();

  const [product, setProduct] = useState(null);

  useEffect(() => {
    const fetchProduct = async () => {
      spinner.show();
      try {
        const { data } = await productApi.getProductDetails(id);
        setProduct(data?.data ?? null);
      } catch (error) {
        Alert.error(error.response?.data?.errorMessage ?? 'Unable to load product');
      } finally {
        spinner.hide();
      }
    };
    fetchProduct();
  }, [id]);

  if (!product) {
    return (
      <PageWrapper>
        <div className="d-flex flex-column product-page p-3" data-testid="product-show" />
      </PageWrapper>
    );
  }

  const rows = [
    ['react.product.productCode.label', 'Product Code', product.productCode],
    ['react.product.name.label', 'Name', product.name],
    ['react.product.description.label', 'Description', product.description],
    ['react.product.category.label', 'Category', product.category?.name],
    ['react.product.productType.label', 'Product Type', product.productType?.name],
    ['react.product.unitOfMeasure.label', 'Unit of Measure', product.unitOfMeasure],
    ['react.product.pricePerUnit.label', 'Price per unit', product.pricePerUnit],
    ['react.product.manufacturer.label', 'Manufacturer', product.manufacturer],
    ['react.product.manufacturerCode.label', 'Manufacturer Code', product.manufacturerCode],
    ['react.product.brandName.label', 'Brand', product.brandName],
    ['react.product.vendor.label', 'Vendor', product.vendor],
    ['react.product.upc.label', 'UPC', product.upc],
    ['react.product.ndc.label', 'NDC', product.ndc],
    ['react.product.tags.label', 'Tags', product.tags],
    ['react.product.active.label', 'Active', product.active ? translate('react.default.yes.label', 'Yes') : translate('react.default.no.label', 'No')],
    ['react.product.dateCreated.label', 'Date Created', product.dateCreated],
    ['react.product.lastUpdated.label', 'Last Updated', product.lastUpdated],
  ];

  return (
    <PageWrapper>
      <div className="d-flex flex-column product-page p-3" data-testid="product-show">
        <h3 className="mb-3" data-testid="product-show-title">
          {`${product.productCode} ${product.name}`}
        </h3>
        <div className="d-flex mb-3 gap-8">
          <a className="btn btn-outline-primary" href={PRODUCT_URL.edit(product.id)}>
            <Translate id="react.default.button.edit.label" defaultMessage="Edit" />
          </a>
          <a className="btn btn-outline-primary" href={INVENTORY_ITEM_URL.showStockCard(product.id)}>
            <Translate id="react.product.show.stockCard.label" defaultMessage="View stock card" />
          </a>
        </div>
        <table className="table table-sm w-auto" data-testid="product-show-table">
          <tbody>
            {rows.map(([labelId, defaultLabel, value]) => (
              <tr key={labelId}>
                <td className="font-weight-bold">{translate(labelId, defaultLabel)}</td>
                <td data-testid={`product-show-${labelId.split('.')[2]}`}>{value ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageWrapper>
  );
};

export default ProductShow;
