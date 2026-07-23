import React, { useRef, useState } from 'react';

import queryString from 'query-string';
import { useDispatch } from 'react-redux';
import { useLocation } from 'react-router-dom';
import Alert from 'react-s-alert';

import { hideSpinner, showSpinner } from 'actions';
import batchApi from 'api/services/BatchApi';
import { CONTEXT_PATH } from 'consts/applicationUrls';
import Translate from 'utils/Translate';
import PageWrapper from 'wrappers/PageWrapper';

// Mirrors the import type options from the legacy batch/_uploadFileForm.gsp
const IMPORT_TYPES = [
  {
    value: 'category',
    label: 'Categories',
    dataUrl: '/batch/downloadExcel?type=Category',
  },
  {
    value: 'inventory',
    label: 'Inventory',
    dataUrl: '/inventory/downloadTemplate',
  },
  {
    value: 'inventoryLevel',
    label: 'Inventory Levels',
    templateUrl: '/batch/downloadTemplate?template=inventoryLevels.xls',
    dataUrl: '/batch/downloadExcel?type=InventoryLevel',
  },
  {
    value: 'location',
    label: 'Locations',
    templateUrl: '/batch/downloadTemplate?template=locations.xls',
    dataUrl: '/batch/downloadExcel?type=Location',
  },
  {
    value: 'person',
    label: 'People',
    templateUrl: '/batch/downloadTemplate?template=persons.xls',
  },
  {
    value: 'productAttribute',
    label: 'Product Attribute',
    dataUrl: '/productAttributeValue/exportProductAttribute',
  },
  {
    value: 'productCatalog',
    label: 'Product Catalog',
    dataUrl: '/batch/downloadExcel?type=ProductCatalog',
  },
  {
    value: 'productCatalogItem',
    label: 'Product Catalog Item',
    dataUrl: '/batch/downloadExcel?type=ProductCatalogItem',
  },
  {
    value: 'productSupplier',
    label: 'Product Sources',
    templateUrl: '/batch/downloadTemplate?template=ProductSuppliers.xls',
    dataUrl: '/productSupplier/export?format=xls',
  },
  {
    value: 'productSupplierPreference',
    label: 'Product Supplier Preference',
    dataUrl: '/batch/downloadExcel?type=ProductSupplierPreference',
  },
  {
    value: 'productSupplierAttribute',
    label: 'Product Supplier Attribute',
    dataUrl: '/productAttributeValue/exportProductAttribute?entityTypeCode=PRODUCT_SUPPLIER',
  },
  {
    value: 'productPackage',
    label: 'Product Packages',
    dataUrl: '/batch/downloadExcel?type=ProductPackage',
  },
  {
    value: 'productAssociation',
    label: 'Product Associations',
    templateUrl: '/batch/downloadTemplate?template=productAssociations.xls',
    dataUrl: '/batch/downloadExcel?type=ProductAssociation',
  },
  {
    value: 'productSynonym',
    label: 'Product Synonyms',
    templateUrl: '/product/exportSynonymTemplate',
    dataUrl: '/batch/downloadExcel?type=Synonym',
  },
  {
    value: 'outboundStockMovement',
    label: 'Outbound Stock Movement',
  },
  {
    value: 'purchaseOrderActualReadyDate',
    label: 'Purchase Order Actual Ready Date',
    templateUrl: '/batch/downloadTemplate?template=purchaseOrderActualReadyDateAndRecipient.xls',
  },
  {
    value: 'tag',
    label: 'Tags',
    dataUrl: '/batch/downloadExcel?type=Tag',
  },
  {
    value: 'user',
    label: 'Users',
    templateUrl: '/batch/downloadTemplate?template=users.xls',
  },
  {
    value: 'userLocation',
    label: 'User Locations',
    templateUrl: '/batch/downloadTemplate?template=userLocations.xls',
  },
];

const BatchImportData = () => {
  const dispatch = useDispatch();
  const { search } = useLocation();
  const { type } = queryString.parse(search);

  const [importType, setImportType] = useState(type || '');
  const [date, setDate] = useState('');
  const [preview, setPreview] = useState(null);
  const fileInputRef = useRef(null);

  const submit = (importNow) => {
    const file = fileInputRef.current?.files?.[0];
    if (!importNow && !file) {
      Alert.error('Please choose a file to upload', { timeout: 5000 });
      return;
    }
    if (!importType) {
      Alert.error('Please choose a valid import type', { timeout: 5000 });
      return;
    }
    const formData = new FormData();
    if (file) {
      formData.append('importFile', file);
    }
    formData.append('importType', importType);
    if (date) {
      formData.append('date', date);
    }
    formData.append('importNow', importNow ? 'true' : 'false');

    dispatch(showSpinner());
    batchApi.importData(formData)
      .then((response) => {
        dispatch(hideSpinner());
        const { data } = response.data;
        if (data.importedSuccessfully) {
          setPreview(null);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
          Alert.success(data.message || 'Data imported successfully', { timeout: 8000 });
        } else {
          setPreview(data);
          const errorMessages = response.data?.errorMessages;
          if (errorMessages?.length) {
            errorMessages.forEach((message) => Alert.error(message, { timeout: 8000 }));
          } else if (data.message) {
            Alert.success(data.message, { timeout: 8000 });
          }
        }
      })
      .catch((error) => {
        dispatch(hideSpinner());
        const messages = error?.response?.data?.errorMessages;
        if (messages?.length) {
          messages.forEach((message) => Alert.error(message, { timeout: 8000 }));
        }
      });
  };

  const columns = preview?.columnMap?.columnMap
    ? Object.values(preview.columnMap.columnMap)
    : (preview?.rows?.[0] && Object.keys(preview.rows[0]));

  return (
    <PageWrapper>
      <div className="classic-form with-description">
        <div className="form-title">
          <Translate id="react.batch.importData.label" defaultMessage="Import data" />
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submit(false);
          }}
          className="p-3"
        >
          <div className="form-group">
            <label htmlFor="importFile" className="font-weight-bold">
              <Translate id="react.batch.importFile.label" defaultMessage="File" />
            </label>
            <input id="importFile" name="importFile" type="file" ref={fileInputRef} className="form-control-file" />
          </div>
          <div className="form-group" style={{ maxWidth: '300px' }}>
            <label htmlFor="date" className="font-weight-bold">
              <Translate id="react.default.date.label" defaultMessage="Date" />
            </label>
            <input
              id="date"
              name="date"
              type="date"
              className="form-control"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <small className="text-muted">
              <Translate
                id="react.batch.importData.dateRequiredForInventory.label"
                defaultMessage="Required for inventory imports (date of the stock count)"
              />
            </small>
          </div>
          <div className="form-group">
            <span className="font-weight-bold">
              <Translate id="react.batch.importType.label" defaultMessage="Import type" />
            </span>
            <table className="table table-sm table-bordered mt-1" data-testid="import-type-table">
              <tbody>
                {IMPORT_TYPES.map((option) => (
                  <tr key={option.value}>
                    <td>
                      <label className="mb-0" htmlFor={`importType-${option.value}`}>
                        <input
                          id={`importType-${option.value}`}
                          type="radio"
                          name="importType"
                          value={option.value}
                          checked={importType === option.value}
                          onChange={() => setImportType(option.value)}
                        />
                        {' '}
                        {option.label}
                      </label>
                    </td>
                    <td>
                      {option.templateUrl && (
                        <a href={`${CONTEXT_PATH}${option.templateUrl}`}>
                          <Translate id="react.batch.downloadTemplate.label" defaultMessage="Download template" />
                        </a>
                      )}
                    </td>
                    <td>
                      {option.dataUrl && (
                        <a href={`${CONTEXT_PATH}${option.dataUrl}`}>
                          <Translate id="react.batch.downloadData.label" defaultMessage="Download data" />
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="d-flex" style={{ gap: '8px' }}>
            <button type="submit" id="uploadButton" className="btn btn-outline-primary">
              <Translate id="react.batch.upload.label" defaultMessage="Upload" />
            </button>
            {preview && (
              <button
                type="button"
                id="importNowButton"
                className="btn btn-primary"
                onClick={() => submit(true)}
              >
                <Translate id="react.batch.importNow.label" defaultMessage="Import now" />
              </button>
            )}
          </div>
        </form>
        {preview?.rows && (
          <div className="p-3" data-testid="import-preview">
            <h3>
              <Translate id="react.batch.importData.preview.label" defaultMessage="Data preview" />
              {' '}
              (
              {preview.rows.length}
              {' '}
              <Translate id="react.batch.rows.label" defaultMessage="rows" />
              )
            </h3>
            <div className="table-responsive" style={{ maxHeight: '400px', overflow: 'auto' }}>
              <table className="table table-sm table-bordered">
                <thead>
                  <tr>
                    {(columns || []).map((column) => <th key={column}>{column}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row, index) => (
                    // eslint-disable-next-line react/no-array-index-key
                    <tr key={index}>
                      {(columns || []).map((column) => (
                        <td key={column}>{row[column] === null || row[column] === undefined ? '' : String(row[column])}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  );
};

export default BatchImportData;
