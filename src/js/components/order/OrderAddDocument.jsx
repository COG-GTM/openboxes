import React, { useEffect, useRef, useState } from 'react';

import { useParams } from 'react-router-dom';
import Alert from 'react-s-alert';

import orderApi from 'api/services/OrderApi';
import { ORDER_URL } from 'consts/applicationUrls';
import useTranslation from 'hooks/useTranslation';
import Select from 'utils/Select';
import Translate from 'utils/Translate';

const OrderAddDocument = () => {
  const { orderId } = useParams();
  const fileInputRef = useRef(null);
  const [order, setOrder] = useState(null);
  const [documentTypes, setDocumentTypes] = useState([]);
  const [documentType, setDocumentType] = useState(null);
  const [name, setName] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [fileUri, setFileUri] = useState('');
  const [uploading, setUploading] = useState(false);

  useTranslation('order', 'default');

  useEffect(() => {
    orderApi.getOrder(orderId)
      .then(({ data }) => {
        setOrder(data?.data);
      })
      .catch((err) => {
        const message = err?.response?.data?.errorMessage;
        if (message) {
          Alert.error(message);
        }
      });
    orderApi.getDocumentTypeOptions()
      .then(({ data }) => {
        setDocumentTypes(data?.data ?? []);
      })
      .catch((err) => {
        const message = err?.response?.data?.errorMessage;
        if (message) {
          Alert.error(message);
        }
      });
  }, [orderId]);

  const submit = async (event) => {
    event.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file && !fileUri) {
      Alert.error('Please select a file to upload or provide a URL');
      return;
    }
    setUploading(true);
    const formData = new FormData();
    if (file) formData.append('fileContents', file);
    if (name) formData.append('name', name);
    if (documentNumber) formData.append('documentNumber', documentNumber);
    if (documentType?.id) formData.append('typeId', documentType.id);
    if (fileUri) formData.append('fileUri', fileUri);
    try {
      await orderApi.uploadDocument(orderId, formData);
      window.location = ORDER_URL.show(orderId);
    } catch (error) {
      const message = error?.response?.data?.errors?.join('; ')
        || error?.response?.data?.errorMessage;
      if (message) {
        Alert.error(message);
      }
      setUploading(false);
    }
  };

  return (
    <div className="d-flex flex-column m-3">
      <div className="card">
        <div className="card-header">
          <Translate id="react.order.addDocument.label" defaultMessage="Add Document" />
          {order?.orderNumber && ` · ${order.orderNumber}`}
          {order?.name && ` · ${order.name}`}
        </div>
        <form className="card-body" onSubmit={submit}>
          <div className="form-group row">
            <label className="col-sm-3 col-form-label" htmlFor="document-file-input">
              <Translate id="react.order.document.file.label" defaultMessage="File" />
            </label>
            <div className="col-sm-6">
              <input type="file" id="document-file-input" name="fileContents" ref={fileInputRef} data-testid="document-file-input" />
            </div>
          </div>
          <div className="form-group row">
            <label className="col-sm-3 col-form-label" htmlFor="document-name-input">
              <Translate id="react.order.document.name.label" defaultMessage="Name" />
            </label>
            <div className="col-sm-6">
              <input
                type="text"
                id="document-name-input"
                className="form-control"
                value={name}
                onChange={(event) => setName(event.target.value)}
                data-testid="document-name-input"
              />
            </div>
          </div>
          <div className="form-group row">
            <label className="col-sm-3 col-form-label" htmlFor="document-type-select">
              <Translate id="react.order.document.type.label" defaultMessage="Document type" />
            </label>
            <div className="col-sm-6">
              <Select
                options={documentTypes}
                value={documentType}
                onChange={(value) => setDocumentType(value)}
                id="document-type-select"
              />
            </div>
          </div>
          <div className="form-group row">
            <label className="col-sm-3 col-form-label" htmlFor="document-number-input">
              <Translate id="react.order.document.number.label" defaultMessage="Document number" />
            </label>
            <div className="col-sm-6">
              <input
                type="text"
                id="document-number-input"
                className="form-control"
                value={documentNumber}
                onChange={(event) => setDocumentNumber(event.target.value)}
                data-testid="document-number-input"
              />
            </div>
          </div>
          <div className="form-group row">
            <label className="col-sm-3 col-form-label" htmlFor="document-url-input">
              <Translate id="react.order.document.url.label" defaultMessage="URL" />
            </label>
            <div className="col-sm-6">
              <input
                type="text"
                id="document-url-input"
                className="form-control"
                value={fileUri}
                onChange={(event) => setFileUri(event.target.value)}
                data-testid="document-url-input"
              />
            </div>
          </div>
          <div className="d-flex justify-content-center">
            <button type="submit" className="btn btn-primary mr-2" disabled={uploading} data-testid="document-upload-button">
              <Translate id="react.default.button.upload.label" defaultMessage="Upload" />
            </button>
            <a className="btn btn-outline-secondary" href={ORDER_URL.show(orderId)}>
              <Translate id="react.default.button.cancel.label" defaultMessage="Cancel" />
            </a>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OrderAddDocument;
