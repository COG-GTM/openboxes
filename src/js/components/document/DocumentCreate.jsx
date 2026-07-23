import React, { useEffect, useRef, useState } from 'react';

import { useDispatch } from 'react-redux';
import Alert from 'react-s-alert';

import { hideSpinner, showSpinner } from 'actions';
import documentApi from 'api/services/DocumentApi';
import { DOCUMENT_URL } from 'consts/applicationUrls';
import Translate from 'utils/Translate';
import PageWrapper from 'wrappers/PageWrapper';

const DocumentCreate = () => {
  const dispatch = useDispatch();
  const [documentTypes, setDocumentTypes] = useState([]);
  const [documentTypeId, setDocumentTypeId] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    documentApi.getDocumentTypeOptions()
      .then((response) => setDocumentTypes(response.data.data || []));
  }, []);

  const handleSubmit = (event) => {
    event.preventDefault();
    const formData = new FormData();
    const file = fileInputRef.current?.files?.[0];
    if (file) {
      formData.append('fileContents', file);
    }
    if (documentTypeId) {
      formData.append('documentType.id', documentTypeId);
    }
    dispatch(showSpinner());
    documentApi.createDocument(formData)
      .then((response) => {
        dispatch(hideSpinner());
        const { data } = response.data;
        if (data.message) {
          Alert.success(data.message, { timeout: 5000 });
        }
        window.location.href = DOCUMENT_URL.edit(data.id);
      })
      .catch((error) => {
        dispatch(hideSpinner());
        const messages = error?.response?.data?.errorMessages;
        if (messages?.length) {
          messages.forEach((message) => Alert.error(message, { timeout: 8000 }));
        }
      });
  };

  return (
    <PageWrapper>
      <div className="classic-form with-description">
        <div className="form-title">
          <Translate id="react.document.create.label" defaultMessage="Create Document" />
        </div>
        <form onSubmit={handleSubmit} className="p-3" style={{ maxWidth: '600px' }}>
          <div className="form-group">
            <label htmlFor="documentType">
              <Translate id="react.document.documentType.label" defaultMessage="Document Type" />
            </label>
            <select
              id="documentType"
              className="form-control"
              value={documentTypeId}
              onChange={(e) => setDocumentTypeId(e.target.value)}
            >
              <option value="" aria-label="No document type selected" />
              {documentTypes.map((documentType) => (
                <option key={documentType.id} value={documentType.id}>{documentType.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="fileContents">
              <Translate id="react.document.fileContents.label" defaultMessage="File" />
            </label>
            <input id="fileContents" name="fileContents" type="file" ref={fileInputRef} className="form-control-file" />
          </div>
          <div className="d-flex" style={{ gap: '8px' }}>
            <button type="submit" id="createButton" className="btn btn-primary">
              <Translate id="react.default.button.create.label" defaultMessage="Create" />
            </button>
            <a href={DOCUMENT_URL.list()} className="btn btn-outline-secondary">
              <Translate id="react.default.button.cancel.label" defaultMessage="Cancel" />
            </a>
          </div>
        </form>
      </div>
    </PageWrapper>
  );
};

export default DocumentCreate;
