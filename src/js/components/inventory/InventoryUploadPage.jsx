import React, { useMemo, useState } from 'react';

import { getTranslate } from 'react-localize-redux';
import { useSelector } from 'react-redux';
import Alert from 'react-s-alert';

import { INVENTORY_UPLOAD } from 'api/urls';
import DataTable from 'components/DataTable';
import useTranslation from 'hooks/useTranslation';
import apiClient from 'utils/apiClient';
import Translate, { translateWithDefaultMessage } from 'utils/Translate';
import PageWrapper from 'wrappers/PageWrapper';

import 'components/inventory/styles.scss';

const InventoryUploadPage = () => {
  useTranslation('inventory', 'reactTable');

  const [file, setFile] = useState(null);
  const [rows, setRows] = useState(null);
  const [uploading, setUploading] = useState(false);

  const { currentLocation, translate } = useSelector((state) => ({
    currentLocation: state.session.currentLocation,
    translate: translateWithDefaultMessage(getTranslate(state.localize)),
  }));

  const upload = async () => {
    if (!file || !currentLocation?.id) {
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await apiClient.post(INVENTORY_UPLOAD(currentLocation.id), formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setRows(response.data.data);
    } catch (error) {
      Alert.error(error.response?.data?.errorMessage
        || translate('react.inventory.upload.failed.label', 'Unable to upload inventory file'));
    } finally {
      setUploading(false);
    }
  };

  const columns = useMemo(() => [
    {
      Header: <Translate id="react.inventory.productCode.label" defaultMessage="Code" />,
      accessor: 'productCode',
      maxWidth: 100,
    },
    {
      Header: <Translate id="react.inventory.product.label" defaultMessage="Product" />,
      accessor: 'product',
      minWidth: 250,
    },
    {
      Header: <Translate id="react.inventory.lotNumber.label" defaultMessage="Lot number" />,
      accessor: 'lotNumber',
    },
    {
      Header: <Translate id="react.inventory.expirationDate.label" defaultMessage="Expiration date" />,
      accessor: 'expirationDate',
    },
    {
      Header: <Translate id="react.inventory.binLocation.label" defaultMessage="Bin location" />,
      accessor: 'binLocation',
    },
    {
      Header: <Translate id="react.inventory.quantityOnHand.label" defaultMessage="Quantity on hand" />,
      accessor: 'quantityOnHand',
      className: 'text-right',
    },
    {
      Header: <Translate id="react.inventory.upload.physicalQuantity.label" defaultMessage="Physical QOH" />,
      accessor: 'quantity',
      className: 'text-right',
    },
    {
      Header: <Translate id="react.inventory.upload.comments.label" defaultMessage="Comments" />,
      accessor: 'comments',
    },
  ], []);

  return (
    <PageWrapper className="inventory-list-page">
      <div className="list-page-header p-3 d-flex align-items-center justify-content-between">
        <h5 className="m-0">
          <Translate id="react.inventory.upload.title.label" defaultMessage="Upload inventory" />
          {currentLocation?.name && ` — ${currentLocation.name}`}
        </h5>
      </div>
      <div className="list-page-filters d-flex align-items-end p-3">
        <div className="mr-3">
          <label htmlFor="inventory-upload-file">
            <Translate id="react.inventory.upload.file.label" defaultMessage="File" />
          </label>
          <input
            id="inventory-upload-file"
            className="form-control-file"
            type="file"
            accept=".xls,.xlsx"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </div>
        <button
          type="button"
          className="btn btn-primary mb-1"
          disabled={!file || uploading}
          onClick={upload}
        >
          <Translate id="react.inventory.upload.upload.label" defaultMessage="Upload" />
        </button>
      </div>
      {rows && (
        <DataTable
          data={rows}
          columns={columns}
          loading={uploading}
          defaultPageSize={100}
          totalData={rows.length}
          noDataText={translate('react.inventory.upload.empty.label', 'No rows found in the uploaded file')}
        />
      )}
    </PageWrapper>
  );
};

export default InventoryUploadPage;
