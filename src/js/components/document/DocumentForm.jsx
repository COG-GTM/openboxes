import React, { useEffect, useRef, useState } from 'react';

import { confirmAlert } from 'react-confirm-alert';
import { Controller, useForm } from 'react-hook-form';
import { useDispatch } from 'react-redux';
import { useHistory, useParams } from 'react-router-dom';

import { hideSpinner, showSpinner } from 'actions';
import documentApi from 'api/services/DocumentApi';
import Button from 'components/form-elements/Button';
import SelectField from 'components/form-elements/v2/SelectField';
import TextInput from 'components/form-elements/v2/TextInput';
import notification from 'components/Layout/notifications/notification';
import Section from 'components/Layout/v2/Section';
import { DOCUMENT_URL } from 'consts/applicationUrls';
import NotificationType from 'consts/notificationTypes';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';
import HeaderWrapper from 'wrappers/HeaderWrapper';
import PageWrapper from 'wrappers/PageWrapper';

const DocumentForm = () => {
  useTranslation('document', 'default');

  const { documentId } = useParams();
  const history = useHistory();
  const dispatch = useDispatch();
  const translate = useTranslate();
  const fileInputRef = useRef(null);

  const [documentTypeOptions, setDocumentTypeOptions] = useState([]);
  const [documentDetails, setDocumentDetails] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    documentApi.getDocumentTypeOptions({ params: { includeTemplates: true } })
      .then((response) => {
        setDocumentTypeOptions(response?.data?.data?.map((option) => ({
          id: option.id,
          value: option.id,
          label: option.label,
        })) ?? []);
      });
  }, []);

  const toFormValues = (document) => ({
    name: document?.name ?? '',
    documentType: document?.documentType
      ? {
        id: document.documentType.id,
        value: document.documentType.id,
        label: document.documentType.name,
      }
      : null,
    extension: document?.extension ?? '',
    contentType: document?.contentType ?? '',
    fileUri: document?.fileUri ?? '',
    documentNumber: document?.documentNumber ?? '',
  });

  const getDocument = async () => {
    try {
      const response = await documentApi.getDocument(documentId);
      const document = response?.data?.data;
      setDocumentDetails(document);
      return toFormValues(document);
    } catch (error) {
      // Like the legacy edit action: not-found redirects back to the list.
      history.push(DOCUMENT_URL.list());
      return toFormValues(null);
    }
  };

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    mode: 'onBlur',
    defaultValues: getDocument,
  });

  const onSubmit = async (values) => {
    const payload = {
      name: values.name,
      documentType: values.documentType?.id ? { id: values.documentType.id } : null,
      extension: values.extension,
      contentType: values.contentType,
      fileUri: values.fileUri,
      documentNumber: values.documentNumber,
    };
    await documentApi.updateDocument(documentId, payload);
    notification(NotificationType.SUCCESS)({
      message: translate('react.document.update.success.label', 'Document has been updated successfully'),
    });
    history.push(DOCUMENT_URL.list());
  };

  const deleteDocument = async () => {
    dispatch(showSpinner());
    try {
      const { status } = await documentApi.deleteDocument(documentId);
      if (status === 204) {
        notification(NotificationType.SUCCESS)({
          message: translate('react.document.delete.success.label', 'Document has been deleted successfully'),
        });
        history.push(DOCUMENT_URL.list());
      }
    } catch (error) {
      // Error feedback is surfaced by the global apiClient interceptor.
    } finally {
      dispatch(hideSpinner());
    }
  };

  const onDelete = () => {
    confirmAlert({
      title: translate('react.default.areYouSure.label', 'Are you sure?'),
      message: translate(
        'react.document.delete.confirm.label',
        'Are you sure you want to delete this document?',
      ),
      buttons: [
        {
          label: translate('react.default.yes.label', 'Yes'),
          onClick: deleteDocument,
        },
        {
          label: translate('react.default.no.label', 'No'),
        },
      ],
    });
  };

  const onUploadFile = async (event) => {
    event.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      notification(NotificationType.ERROR_OUTLINED)({
        message: translate('react.document.fileCannotBeEmpty.label', 'Please select a file to upload'),
      });
      return;
    }
    setUploading(true);
    const formData = new FormData();
    formData.append('fileContents', file);
    try {
      const response = await documentApi.uploadDocumentContent(documentId, formData);
      const updatedDocument = response?.data?.data;
      setDocumentDetails(updatedDocument);
      reset(toFormValues(updatedDocument));
      notification(NotificationType.SUCCESS)({
        message: translate('react.document.upload.success.label', 'File has been uploaded successfully'),
      });
    } catch (error) {
      // Error feedback is surfaced by the global apiClient interceptor.
    } finally {
      setUploading(false);
    }
  };

  return (
    <PageWrapper>
      <HeaderWrapper className="align-items-center h-auto py-3">
        <span className="title">
          <Translate id="react.document.edit.label" defaultMessage="Edit Document" />
        </span>
      </HeaderWrapper>
      <form onSubmit={handleSubmit(onSubmit)} className="p-3">
        <Section
          title={{ label: 'react.document.detailsSection.label', defaultMessage: 'Document Details' }}
        >
          <div className="row">
            <div className="col-lg-4 col-md-6 px-2 pt-2">
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <TextInput
                    title={{ id: 'react.document.name.label', defaultMessage: 'Name' }}
                    errorMessage={errors.name?.message}
                    {...field}
                  />
                )}
              />
            </div>
            <div className="col-lg-4 col-md-6 px-2 pt-2">
              <Controller
                name="documentType"
                control={control}
                render={({ field }) => (
                  <SelectField
                    title={{ id: 'react.document.documentType.label', defaultMessage: 'Document Type' }}
                    options={documentTypeOptions}
                    {...field}
                  />
                )}
              />
            </div>
            <div className="col-lg-4 col-md-6 px-2 pt-2">
              <Controller
                name="extension"
                control={control}
                render={({ field }) => (
                  <TextInput
                    title={{ id: 'react.document.extension.label', defaultMessage: 'Extension' }}
                    {...field}
                  />
                )}
              />
            </div>
            <div className="col-lg-4 col-md-6 px-2 pt-2">
              <Controller
                name="contentType"
                control={control}
                render={({ field }) => (
                  <TextInput
                    title={{ id: 'react.document.contentType.label', defaultMessage: 'Content Type' }}
                    {...field}
                  />
                )}
              />
            </div>
            <div className="col-lg-4 col-md-6 px-2 pt-2">
              <Controller
                name="fileUri"
                control={control}
                render={({ field }) => (
                  <TextInput
                    title={{ id: 'react.document.fileUri.label', defaultMessage: 'File Uri' }}
                    {...field}
                  />
                )}
              />
            </div>
            <div className="col-lg-4 col-md-6 px-2 pt-2">
              <Controller
                name="documentNumber"
                control={control}
                render={({ field }) => (
                  <TextInput
                    title={{ id: 'react.document.documentNumber.label', defaultMessage: 'Document Number' }}
                    {...field}
                  />
                )}
              />
            </div>
          </div>
          <div className="d-flex gap-8 pt-3">
            <Button
              type="submit"
              defaultLabel="Update"
              label="react.default.button.update.label"
              variant="primary"
              disabled={isSubmitting}
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
              onClick={() => history.push(DOCUMENT_URL.list())}
            />
          </div>
        </Section>
        <Section
          title={{ label: 'react.document.fileSection.label', defaultMessage: 'File' }}
        >
          <div className="p-2" data-testid="document-file-details">
            <div>
              <b><Translate id="react.document.filename.label" defaultMessage="Filename" /></b>
              {': '}
              {documentDetails?.filename}
            </div>
            <div>
              <b><Translate id="react.document.image.label" defaultMessage="Image" /></b>
              {': '}
              {documentDetails?.image ? 'true' : 'false'}
            </div>
            <div>
              <b><Translate id="react.document.size.label" defaultMessage="Size" /></b>
              {': '}
              {documentDetails?.size}
              {' bytes'}
            </div>
            <div>
              <b><Translate id="react.document.lastUpdated.label" defaultMessage="Last Updated" /></b>
              {': '}
              {documentDetails?.lastUpdated}
            </div>
          </div>
          <div className="d-flex align-items-center gap-8 p-2">
            <input type="file" name="fileContents" ref={fileInputRef} data-testid="document-file-input" />
            <Button
              defaultLabel="Upload"
              label="react.default.button.upload.label"
              variant="primary-outline"
              disabled={uploading}
              onClick={onUploadFile}
            />
            <a className="btn btn-outline-primary" href={DOCUMENT_URL.download(documentId)}>
              <Translate id="react.document.download.label" defaultMessage="Download" />
            </a>
          </div>
        </Section>
      </form>
    </PageWrapper>
  );
};

export default DocumentForm;
