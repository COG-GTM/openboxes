import React, { useEffect, useMemo, useState } from 'react';

import moment from 'moment';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';

import supplierApi from 'api/services/SupplierApi';
import DataTable, { TableCell } from 'components/DataTable';
import Button from 'components/form-elements/Button';
import Section from 'components/Layout/v2/Section';
import ProductSelect from 'components/product-select/ProductSelect';
import { CONTEXT_PATH, ORDER_URL, SUPPLIER_URL } from 'consts/applicationUrls';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';
import HeaderWrapper from 'wrappers/HeaderWrapper';
import PageWrapper from 'wrappers/PageWrapper';

const formatUnitPrice = (row) => {
  if (row.unitPrice == null || !row.quantityPerUom) {
    return '';
  }
  return (row.unitPrice / row.quantityPerUom).toLocaleString('en-US');
};

const SupplierShow = () => {
  useTranslation('supplier', 'reactTable', 'default');

  const { supplierId } = useParams();
  const translate = useTranslate();

  const currentLocationId = useSelector((state) => state.session.currentLocation?.id);

  const [supplier, setSupplier] = useState(null);
  const [priceHistory, setPriceHistory] = useState([]);
  const [priceHistoryLoading, setPriceHistoryLoading] = useState(false);
  const [product, setProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    supplierApi.getSupplierDetails(supplierId)
      .then((response) => setSupplier(response?.data?.data));
  }, [supplierId]);

  const fetchPriceHistory = async (params) => {
    setPriceHistoryLoading(true);
    try {
      const response = await supplierApi.getSupplierPriceHistory(supplierId, params);
      setPriceHistory(response?.data?.data ?? []);
    } finally {
      setPriceHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchPriceHistory({});
  }, [supplierId]);

  const onSearch = (e) => {
    e.preventDefault();
    fetchPriceHistory({
      ...(searchTerm ? { q: searchTerm } : {}),
      ...(product?.id ? { productId: product.id } : {}),
    });
  };

  const priceHistoryColumns = useMemo(() => [
    {
      Header: <Translate id="react.supplier.priceHistory.orderNumber.label" defaultMessage="PO Number" />,
      accessor: 'orderNumber',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
      Cell: (row) => <TableCell {...row} link={ORDER_URL.show(row.original.orderId)} />,
    },
    {
      Header: <Translate id="react.supplier.priceHistory.dateCreated.label" defaultMessage="Date Created" />,
      accessor: 'dateCreated',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
      Cell: (row) => (
        <span>{row.value ? moment(row.value).format('DD/MMM/YYYY') : ''}</span>
      ),
    },
    {
      Header: <Translate id="react.supplier.priceHistory.description.label" defaultMessage="Description" />,
      accessor: 'description',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
    },
    {
      Header: <Translate id="react.supplier.priceHistory.productCode.label" defaultMessage="Product Code" />,
      accessor: 'productCode',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
    },
    {
      Header: <Translate id="react.supplier.priceHistory.product.label" defaultMessage="Product" />,
      accessor: 'productName',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
    },
    {
      Header: <Translate id="react.supplier.priceHistory.sourceCode.label" defaultMessage="Source Code" />,
      accessor: 'sourceCode',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
    },
    {
      Header: <Translate id="react.supplier.priceHistory.supplierCode.label" defaultMessage="Supplier Code" />,
      accessor: 'supplierCode',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
    },
    {
      Header: <Translate id="react.supplier.priceHistory.manufacturer.label" defaultMessage="Manufacturer" />,
      accessor: 'manufacturerName',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
    },
    {
      Header: <Translate id="react.supplier.priceHistory.manufacturerCode.label" defaultMessage="Manufacturer Code" />,
      accessor: 'manufacturerCode',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
    },
    {
      Header: <Translate id="react.supplier.priceHistory.unitPrice.label" defaultMessage="Unit Price" />,
      accessor: 'unitPrice',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
      Cell: (row) => <span>{formatUnitPrice(row.original)}</span>,
    },
  ], []);

  const documents = (supplier?.documents ?? []).filter((document) => !document.fileUri);
  const links = (supplier?.documents ?? []).filter((document) => document.fileUri);

  return (
    <PageWrapper>
      <HeaderWrapper className="align-items-center h-auto py-3">
        <span className="title">
          {supplier?.displayName ?? ''}
        </span>
      </HeaderWrapper>
      <div className="p-3">
        <Section
          title={{ label: 'react.supplier.locations.label', defaultMessage: 'Locations' }}
        >
          <ul className="list-unstyled mb-0" data-testid="supplier-locations">
            {(supplier?.locations ?? []).map((location) => (
              <li key={location.id}>
                <a href={`${CONTEXT_PATH}/location/show/${location.id}`}>{location.name}</a>
              </li>
            ))}
          </ul>
        </Section>
        <Section
          title={{ label: 'react.supplier.priceHistory.label', defaultMessage: 'Price History' }}
        >
          <form className="d-flex align-items-end gap-8 pb-3 flex-wrap" onSubmit={onSearch}>
            <div style={{ minWidth: '300px' }} data-testid="price-history-product-select">
              <ProductSelect
                id="product"
                locationId={currentLocationId}
                value={product}
                onChange={(value) => setProduct(value)}
              />
            </div>
            <input
              className="form-control w-25"
              type="text"
              placeholder={translate('react.supplier.priceHistory.search.label', 'Search by product code, supplier code, etc')}
              aria-label={translate('react.supplier.priceHistory.search.label', 'Search by product code, supplier code, etc')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Button
              type="submit"
              defaultLabel="Search"
              label="react.default.button.search.label"
              variant="primary-outline"
            />
            <a
              href={SUPPLIER_URL.downloadPriceHistory({
                supplierId,
                ...(searchTerm ? { q: searchTerm } : {}),
                ...(product?.id ? { productId: product.id } : {}),
              })}
            >
              <Button
                defaultLabel="Download"
                label="react.default.button.download.label"
                variant="secondary"
              />
            </a>
          </form>
          <DataTable
            columns={priceHistoryColumns}
            data={priceHistory}
            loading={priceHistoryLoading}
            defaultPageSize={10}
            showPagination={priceHistory.length > 10}
            noDataText={translate('react.supplier.priceHistory.empty.label', 'No records found')}
          />
        </Section>
        <Section
          title={{ label: 'react.supplier.documents.label', defaultMessage: 'Documents' }}
        >
          {documents.length > 0 && (
            <table className="table table-sm" data-testid="supplier-documents">
              <thead>
                <tr>
                  <th>{translate('react.supplier.priceHistory.orderNumber.label', 'PO Number')}</th>
                  <th>{translate('react.supplier.document.orderDescription.label', 'PO Description')}</th>
                  <th>{translate('react.supplier.document.origin.label', 'Origin')}</th>
                  <th>{translate('react.supplier.document.destination.label', 'Destination')}</th>
                  <th>{translate('react.supplier.document.type.label', 'Type')}</th>
                  <th>{translate('react.supplier.document.name.label', 'Name')}</th>
                  <th>{translate('react.supplier.document.contentType.label', 'Content Type')}</th>
                  <th>{translate('react.default.button.download.label', 'Download')}</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((document) => (
                  <tr key={document.documentId}>
                    <td>
                      <a href={ORDER_URL.show(document.orderId)}>{document.orderNumber}</a>
                    </td>
                    <td>{document.orderDescription}</td>
                    <td>{document.origin}</td>
                    <td>{document.destination}</td>
                    <td>{document.documentType}</td>
                    <td>{document.documentName}</td>
                    <td>{document.fileType}</td>
                    <td>
                      <a href={`${CONTEXT_PATH}/document/download/${document.documentId}`}>
                        <Translate id="react.default.button.download.label" defaultMessage="Download" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {links.length > 0 && (
            <table className="table table-sm" data-testid="supplier-links">
              <thead>
                <tr>
                  <th>{translate('react.supplier.priceHistory.orderNumber.label', 'PO Number')}</th>
                  <th>{translate('react.supplier.document.orderDescription.label', 'PO Description')}</th>
                  <th>{translate('react.supplier.document.name.label', 'Name')}</th>
                  <th>{translate('react.supplier.document.url.label', 'URL')}</th>
                </tr>
              </thead>
              <tbody>
                {links.map((document) => (
                  <tr key={document.documentId}>
                    <td>
                      <a href={ORDER_URL.show(document.orderId)}>{document.orderNumber}</a>
                    </td>
                    <td>{document.orderDescription}</td>
                    <td>
                      <a href={document.fileUri} target="_blank" rel="noopener noreferrer">
                        {document.documentName}
                      </a>
                    </td>
                    <td style={{ wordBreak: 'break-all' }}>
                      <a href={document.fileUri} target="_blank" rel="noopener noreferrer">
                        {document.fileUri}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {documents.length === 0 && links.length === 0 && (
            <div className="fade show text-center text-muted p-3">
              <Translate id="react.supplier.noDocuments.label" defaultMessage="No documents" />
            </div>
          )}
        </Section>
      </div>
    </PageWrapper>
  );
};

export default SupplierShow;
