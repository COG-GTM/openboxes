import React, { useEffect, useRef, useState } from 'react';

import { useParams } from 'react-router-dom';
import Alert from 'react-s-alert';

import invoiceApi from 'api/services/InvoiceApi';
import { INVOICE_URL } from 'consts/applicationUrls';
import useTranslation from 'hooks/useTranslation';
import Select from 'utils/Select';
import Translate from 'utils/Translate';

const InvoiceAddDocument = () => {
  const { invoiceId } = useParams();
  const fileInputRef = useRef(null);
  const [documentTypes, setDocumentTypes] = useState([]);
  const [documentType, setDocumentType] = useState(null);
  const [name, setName] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [fileUri, setFileUri] = useState('');
  const [uploading, setUploading] = useState(false);

  useTranslation('invoice', 'default');

  useEffect(() => {
    invoiceApi.getDocumentTypeOptions()
      .then(({ data }) => {
        setDocumentTypes(data?.data ?? []);
      })
      .catch((err) => {
        const message = err?.response?.data?.errorMessage;
        if (message) {
          Alert.error(message);
        }
      });
  }, []);

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
      await invoiceApi.uploadDocument(invoiceId, formData);
      window.location = INVOICE_URL.show(invoiceId);
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
          <Translate id="react.invoice.addDocument.label" defaultMessage="Add Document" />
        </div>
        <form className="card-body" onSubmit={submit}>
          <div className="form-group row">
            <label className="col-sm-3 col-form-label" htmlFor="document-file-input">
              <Translate id="react.invoice.document.file.label" defaultMessage="File" />
            </label>
            <div className="col-sm-6">
              <input type="file" id="document-file-input" name="fileContents" ref={fileInputRef} data-testid="document-file-input" />
            </div>
          </div>
          <div className="form-group row">
            <label className="col-sm-3 col-form-label" htmlFor="document-name-input">
              <Translate id="react.invoice.document.name.label" defaultMessage="Name" />
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
              <Translate id="react.invoice.document.type.label" defaultMessage="Document type" />
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
              <Translate id="react.invoice.document.number.label" defaultMessage="Document number" />
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
              <Translate id="react.invoice.document.url.label" defaultMessage="URL" />
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
            <a className="btn btn-outline-secondary" href={INVOICE_URL.show(invoiceId)}>
              <Translate id="react.default.button.cancel.label" defaultMessage="Cancel" />
            </a>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InvoiceAddDocument;
