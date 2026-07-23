import React, { useEffect, useMemo, useState } from 'react';

import documentApi from 'api/services/DocumentApi';
import { DOCUMENT_API } from 'api/urls';
import DataTable, { TableCell } from 'components/DataTable';
import Button from 'components/form-elements/Button';
import { DOCUMENT_URL } from 'consts/applicationUrls';
import useTableData from 'hooks/list-pages/useTableData';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Select from 'utils/Select';
import Translate from 'utils/Translate';

const DocumentList = () => {
  useTranslation('document', 'reactTable', 'default');

  const translate = useTranslate();

  const [documentTypes, setDocumentTypes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [documentType, setDocumentType] = useState(null);
  const [filterParams, setFilterParams] = useState({ q: '', documentTypeId: '' });

  useEffect(() => {
    documentApi.getDocumentTypeOptions({ params: { includeTemplates: true } })
      .then((response) => {
        setDocumentTypes(response?.data?.data?.map((option) => ({
          id: option.id,
          value: option.id,
          label: option.label,
        })) ?? []);
      });
  }, []);

  const getParams = ({ offset, state, sortingParams }) => ({
    offset: `${offset}`,
    max: `${state.pageSize}`,
    ...sortingParams,
    ...(filterParams.q ? { q: filterParams.q } : {}),
    ...(filterParams.documentTypeId ? { 'documentType.id': filterParams.documentTypeId } : {}),
  });

  const {
    tableRef,
    loading,
    tableData,
    onFetchHandler,
  } = useTableData({
    filterParams,
    url: DOCUMENT_API,
    errorMessageId: 'react.document.fetch.fail.label',
    defaultErrorMessage: 'Unable to fetch documents',
    defaultSorting: {
      sort: 'name',
      order: 'asc',
    },
    getParams,
  });

  const columns = useMemo(() => [
    {
      Header: <Translate id="react.document.column.id.label" defaultMessage="Id" />,
      accessor: 'id',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
      maxWidth: 150,
      sortable: false,
      Cell: (row) => <TableCell {...row} link={DOCUMENT_URL.edit(row.original.id)} />,
    },
    {
      Header: <Translate id="react.document.column.name.label" defaultMessage="Name" />,
      accessor: 'name',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
      Cell: (row) => <TableCell {...row} link={DOCUMENT_URL.edit(row.original.id)} />,
    },
    {
      Header: <Translate id="react.document.column.documentType.label" defaultMessage="Document Type" />,
      accessor: 'documentType.name',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
      sortable: false,
    },
    {
      Header: <Translate id="react.document.column.filename.label" defaultMessage="Filename" />,
      accessor: 'filename',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
      Cell: (row) => <TableCell {...row} link={DOCUMENT_URL.edit(row.original.id)} />,
    },
    {
      Header: <Translate id="react.document.column.extension.label" defaultMessage="Extension" />,
      accessor: 'extension',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
    },
    {
      Header: <Translate id="react.document.column.contentType.label" defaultMessage="Content Type" />,
      accessor: 'contentType',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
    },
  ], []);

  return (
    <div className="d-flex flex-column list-page-main">
      <div className="d-flex list-page-header">
        <span className="d-flex align-self-center title">
          <Translate id="react.document.list.label" defaultMessage="List Documents" />
        </span>
        <div className="d-flex justify-content-end buttons align-items-center">
          <a href={DOCUMENT_URL.create()}>
            <Button
              defaultLabel="Add Document"
              label="react.document.addDocument.label"
              variant="primary"
            />
          </a>
        </div>
      </div>
      <div className="list-page-list-section">
        <div className="title-text p-3 d-flex justify-content-between align-items-center">
          <span>
            <Translate id="react.document.list.label" defaultMessage="List Documents" />
          </span>
          <form
            className="d-flex align-items-center gap-8"
            onSubmit={(e) => {
              e.preventDefault();
              setFilterParams({ q: searchTerm, documentTypeId: documentType?.id ?? '' });
            }}
          >
            <input
              className="form-control"
              type="text"
              placeholder={translate('react.document.searchByName.label', 'Search by name')}
              aria-label={translate('react.document.searchByName.label', 'Search by name')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div style={{ minWidth: '200px' }}>
              <Select
                options={documentTypes}
                value={documentType}
                onChange={(value) => setDocumentType(value)}
                placeholder={translate('react.document.documentType.label', 'Document Type')}
                id="document-type-filter"
              />
            </div>
            <Button
              type="submit"
              defaultLabel="Find"
              label="react.default.button.find.label"
              variant="primary-outline"
            />
          </form>
        </div>
        <DataTable
          manual
          sortable
          ref={tableRef}
          columns={columns}
          data={tableData.data}
          loading={loading}
          defaultPageSize={10}
          pages={tableData.pages}
          totalData={tableData.totalCount}
          onFetchData={onFetchHandler}
          noDataText={translate('react.document.empty.label', 'No documents match the given criteria')}
        />
      </div>
    </div>
  );
};

export default DocumentList;
