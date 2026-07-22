import React, { useEffect, useState } from 'react';

import { useHistory, useParams } from 'react-router-dom';
import Alert from 'react-s-alert';

import productApi from 'api/services/ProductApi';
import selectOptionsApi from 'api/services/SelectOptionsApi';
import Button from 'components/form-elements/Button';
import { INVENTORY_ITEM_URL, PRODUCT_URL } from 'consts/applicationUrls';
import useSpinner from 'hooks/useSpinner';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';
import PageWrapper from 'wrappers/PageWrapper';

import './styles.scss';

const ProductAddDocument = () => {
  useTranslation('product', 'default');
  const history = useHistory();
  const { id } = useParams();
  const spinner = useSpinner();
  const translate = useTranslate();

  const [product, setProduct] = useState(null);
  const [documentTypes, setDocumentTypes] = useState([]);
  const [name, setName] = useState('');
  const [typeId, setTypeId] = useState('');
  const [file, setFile] = useState(null);
  const [fileUri, setFileUri] = useState('');
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    (async () => {
      spinner.show();
      try {
        const [productResponse, documentTypeResponse] = await Promise.all([
          productApi.getProductDetails(id),
          selectOptionsApi.getDocumentTypeOptions(),
        ]);
        setProduct(productResponse.data?.data);
        setDocumentTypes(documentTypeResponse.data?.data ?? []);
      } catch (error) {
        Alert.error(error.response?.data?.errorMessage
          ?? translate('react.product.notFound.message', 'Product not found'));
        history.push(PRODUCT_URL.list());
      } finally {
        spinner.hide();
      }
    })();
  }, [id]);

  const onUpload = async (event) => {
    event.preventDefault();
    setErrors([]);
    const formData = new FormData();
    if (file) {
      formData.append('fileContents', file);
    }
    formData.append('name', name);
    formData.append('typeId', typeId);
    formData.append('fileUri', fileUri);
    spinner.show();
    try {
      await productApi.uploadDocument(id, formData);
      Alert.success(translate('react.product.documentUploaded.message', 'Document uploaded'));
      window.location = INVENTORY_ITEM_URL.showStockCard(id);
    } catch (error) {
      const errorMessages = error.response?.data?.errorMessages
        ?? [error.response?.data?.errorMessage ?? 'Unable to upload document'];
      setErrors(errorMessages);
    } finally {
      spinner.hide();
    }
  };

  return (
    <PageWrapper>
      <div className="d-flex flex-column product-page p-3">
        <h3 className="mb-3" data-testid="add-document-title">
          <Translate id="react.product.addDocument.label" defaultMessage="Add document" />
          {product ? ` — ${product.productCode} ${product.name}` : ''}
        </h3>
        {errors.length > 0 && (
          <div className="alert alert-danger" role="alert" aria-label="error-message">
            <ul className="mb-0">
              {errors.map((error) => <li key={error}>{error}</li>)}
            </ul>
          </div>
        )}
        <form className="product-form" onSubmit={onUpload} data-testid="add-document-form">
          <div className="form-group row">
            <label className="col-sm-3 col-form-label" htmlFor="name">
              <Translate id="react.product.document.name.label" defaultMessage="Name" />
            </label>
            <div className="col-sm-9">
              <input
                id="name"
                type="text"
                className="form-control"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
          </div>
          <div className="form-group row">
            <label className="col-sm-3 col-form-label" htmlFor="typeId">
              <Translate id="react.product.document.type.label" defaultMessage="Type" />
            </label>
            <div className="col-sm-9">
              <select
                id="typeId"
                className="form-control"
                value={typeId}
                onChange={(event) => setTypeId(event.target.value)}
              >
                <option value="" aria-label="empty" />
                {documentTypes.map((documentType) => (
                  <option key={documentType.id} value={documentType.id}>
                    {documentType.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-group row">
            <label className="col-sm-3 col-form-label" htmlFor="fileContents">
              <Translate id="react.product.document.file.label" defaultMessage="File" />
            </label>
            <div className="col-sm-9">
              <input
                id="fileContents"
                name="fileContents"
                type="file"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </div>
          </div>
          <div className="form-group row">
            <label className="col-sm-3 col-form-label" htmlFor="fileUri">
              <Translate id="react.product.document.url.label" defaultMessage="URL" />
            </label>
            <div className="col-sm-9">
              <input
                id="fileUri"
                type="text"
                className="form-control"
                value={fileUri}
                onChange={(event) => setFileUri(event.target.value)}
              />
            </div>
          </div>
          <div className="d-flex gap-8 mt-3">
            <Button
              type="submit"
              label="react.default.button.upload.label"
              defaultLabel="Upload"
              variant="primary"
            />
            <a className="btn btn-outline-primary" href={INVENTORY_ITEM_URL.showStockCard(id)}>
              <Translate id="react.default.button.cancel.label" defaultMessage="Cancel" />
            </a>
          </div>
        </form>
      </div>
    </PageWrapper>
  );
};

export default ProductAddDocument;
