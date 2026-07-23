import React, { useEffect, useState } from 'react';

import { confirmAlert } from 'react-confirm-alert';
import { useHistory, useParams } from 'react-router-dom';
import Alert from 'react-s-alert';

import documentApi from 'api/services/DocumentApi';
import Button from 'components/form-elements/Button';
import { DOCUMENT_URL } from 'consts/applicationUrls';
import useSpinner from 'hooks/useSpinner';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';
import PageWrapper from 'wrappers/PageWrapper';

const DocumentShow = () => {
  useTranslation('document', 'default');
  const history = useHistory();
  const { documentId } = useParams();
  const spinner = useSpinner();
  const translate = useTranslate();

  const [document, setDocument] = useState(null);

  useEffect(() => {
    (async () => {
      spinner.show();
      try {
        const { data } = await documentApi.getDocument(documentId);
        setDocument(data?.data);
      } catch (error) {
        // Like the legacy show action: not-found redirects back to the list.
        Alert.error(error.response?.data?.errorMessage
          ?? translate('react.document.notFound.message', 'Document not found'));
        history.push(DOCUMENT_URL.list());
      } finally {
        spinner.hide();
      }
    })();
  }, [documentId]);

  const onDelete = () => {
    confirmAlert({
      title: translate('react.default.areYouSure.label', 'Are you sure?'),
      message: translate('react.document.delete.confirm.label', 'Are you sure you want to delete this document?'),
      buttons: [
        {
          label: translate('react.default.yes.label', 'Yes'),
          onClick: async () => {
            try {
              await documentApi.deleteDocument(documentId);
              Alert.success(translate('react.document.delete.success.label', 'Document has been deleted successfully'));
              history.push(DOCUMENT_URL.list());
            } catch (error) {
              Alert.error(error.response?.data?.errorMessage ?? 'Unable to delete document');
            }
          },
        },
        { label: translate('react.default.no.label', 'No') },
      ],
    });
  };

  if (!document) {
    return null;
  }

  const rows = [
    { label: 'react.document.column.id.label', defaultLabel: 'Id', value: document.id },
    { label: 'react.document.name.label', defaultLabel: 'Name', value: document.name },
    { label: 'react.document.filename.label', defaultLabel: 'Filename', value: document.filename },
    { label: 'react.document.extension.label', defaultLabel: 'Extension', value: document.extension },
    { label: 'react.document.contentType.label', defaultLabel: 'Content Type', value: document.contentType },
    { label: 'react.document.fileUri.label', defaultLabel: 'File Uri', value: document.fileUri },
    { label: 'react.document.documentNumber.label', defaultLabel: 'Document Number', value: document.documentNumber },
    { label: 'react.document.documentType.label', defaultLabel: 'Document Type', value: document.documentType?.name },
    { label: 'react.document.dateCreated.label', defaultLabel: 'Date Created', value: document.dateCreated },
    { label: 'react.document.lastUpdated.label', defaultLabel: 'Last Updated', value: document.lastUpdated },
    { label: 'react.document.image.label', defaultLabel: 'Image', value: document.image ? 'true' : 'false' },
    { label: 'react.document.size.label', defaultLabel: 'Size', value: document.size },
  ];

  return (
    <PageWrapper>
      <div className="d-flex flex-column p-3">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h3 className="mb-0">
            <Translate id="react.document.show.label" defaultMessage="Show Document" />
          </h3>
          <div className="d-flex gap-8">
            <Button
              label="react.document.list.label"
              defaultLabel="List Documents"
              variant="primary-outline"
              onClick={() => history.push(DOCUMENT_URL.list())}
            />
            <a className="btn btn-primary" href={DOCUMENT_URL.create()}>
              <Translate id="react.document.addDocument.label" defaultMessage="Add Document" />
            </a>
          </div>
        </div>
        <table className="table table-sm" data-testid="document-show-table">
          <tbody>
            {rows.map((row) => (
              <tr key={row.label + row.defaultLabel}>
                <td className="font-weight-bold" style={{ width: '25%' }}>
                  <Translate id={row.label} defaultMessage={row.defaultLabel} />
                </td>
                <td>{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="d-flex gap-8">
          <Button
            label="react.default.button.edit.label"
            defaultLabel="Edit"
            variant="primary"
            onClick={() => history.push(DOCUMENT_URL.edit(documentId))}
          />
          <Button
            label="react.default.button.delete.label"
            defaultLabel="Delete"
            variant="danger"
            onClick={onDelete}
          />
        </div>
      </div>
    </PageWrapper>
  );
};

export default DocumentShow;
