import React, { useEffect, useMemo, useState } from 'react';

import { useParams } from 'react-router-dom';
import Alert from 'react-s-alert';
import {
  Tab, TabList, TabPanel, Tabs,
} from 'react-tabs';

import invoiceApi from 'api/services/InvoiceApi';
import {
  CONTEXT_PATH, DOCUMENT_URL, INVOICE_URL, ORDER_URL,
} from 'consts/applicationUrls';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';

import 'components/invoice/show/InvoiceShow.scss';

const formatCurrency = (value, currencyCode) => {
  if (value === null || value === undefined) {
    return '';
  }
  return `${Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currencyCode ?? ''}`.trim();
};

const formatDate = (value) => (value ? new Date(value).toLocaleString() : '');

const isSafeUri = (uri) => /^(https?|ftp):\/\//i.test(uri);

const DocumentLink = ({ document }) => {
  if (!document.fileUri) {
    return <a href={DOCUMENT_URL.download(document.id)}>{document.filename}</a>;
  }
  if (isSafeUri(document.fileUri)) {
    return <a href={document.fileUri} target="_blank" rel="noopener noreferrer">{document.fileUri}</a>;
  }
  return <span>{document.fileUri}</span>;
};

const InvoiceShow = () => {
  useTranslation('invoice', 'default');

  const { invoiceId } = useParams();
  const translate = useTranslate();

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState(false);

  const fetchInvoice = async () => {
    setLoading(true);
    try {
      const response = await invoiceApi.getInvoiceDetails(invoiceId);
      setInvoice(response?.data?.data);
      setLoadingError(false);
    } catch (error) {
      setLoadingError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoice();
  }, [invoiceId]);

  const deleteDocument = async (documentId) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm(translate(
      'react.invoice.document.delete.confirm.label',
      'Deleting the document will remove it from the invoice. Are you sure?',
    ))) {
      return;
    }
    try {
      await invoiceApi.deleteDocument(invoiceId, documentId);
    } catch (error) {
      Alert.error(error?.response?.data?.errorMessage ?? error.message);
      return;
    }
    fetchInvoice();
  };

  const fileDocuments = useMemo(
    () => (invoice?.documents ?? []).filter((document) => !document.fileUri),
    [invoice],
  );
  const urlDocuments = useMemo(
    () => (invoice?.documents ?? []).filter((document) => document.fileUri),
    [invoice],
  );

  if (loadingError || (!loading && !invoice)) {
    return (
      <div className="invoice-show p-3">
        <div className="pb-2">
          <Translate
            id="react.invoice.notFound.label"
            defaultMessage="Unable to find the requested invoice"
          />
        </div>
        <a href={INVOICE_URL.list()} className="btn btn-outline-secondary btn-xs">
          <Translate id="react.invoice.list.label" defaultMessage="List Invoices" />
        </a>
      </div>
    );
  }

  if (loading || !invoice) {
    return (
      <div className="invoice-show p-3">
        <Translate id="react.default.loading.label" defaultMessage="Loading..." />
      </div>
    );
  }

  return (
    <div className="invoice-show p-3">
      <div className="d-flex align-items-center justify-content-between summary-header">
        <div>
          <h5 className="mb-1">
            <Translate id="react.invoice.label" defaultMessage="Invoice" />
            {' '}
            {invoice.invoiceNumber}
            {invoice.vendorInvoiceNumber && ` · ${invoice.vendorInvoiceNumber}`}
            {invoice.vendor?.name && ` · ${invoice.vendor.name}`}
          </h5>
          <span className="status-badge">{invoice.status}</span>
        </div>
        <div className="btn-group">
          <a href={INVOICE_URL.list()} className="btn btn-outline-secondary btn-xs">
            <Translate id="react.invoice.list.label" defaultMessage="List Invoices" />
          </a>
          {invoice.status !== 'POSTED' && (
            <a href={INVOICE_URL.edit(invoice.id)} className="btn btn-outline-secondary btn-xs">
              <Translate id="react.default.button.edit.label" defaultMessage="Edit" />
            </a>
          )}
          <a href={INVOICE_URL.addDocument(invoice.id)} className="btn btn-outline-secondary btn-xs">
            <Translate id="react.invoice.addDocument.label" defaultMessage="Add Document" />
          </a>
        </div>
      </div>
      <div className="row pt-3">
        <div className="col-md-6">
          <table className="table table-sm details-table">
            <tbody>
              <tr>
                <td className="detail-label"><Translate id="react.invoice.invoiceNumber.label" defaultMessage="Invoice Number" /></td>
                <td>{invoice.invoiceNumber}</td>
              </tr>
              <tr>
                <td className="detail-label"><Translate id="react.invoice.vendorInvoiceNumber.label" defaultMessage="Vendor Invoice Number" /></td>
                <td>{invoice.vendorInvoiceNumber}</td>
              </tr>
              <tr>
                <td className="detail-label"><Translate id="react.invoice.vendor.label" defaultMessage="Vendor" /></td>
                <td>{invoice.vendor?.name}</td>
              </tr>
              <tr>
                <td className="detail-label"><Translate id="react.invoice.partyFrom.label" defaultMessage="Buyer Organization" /></td>
                <td>{invoice.partyFrom?.name}</td>
              </tr>
              <tr>
                <td className="detail-label"><Translate id="react.invoice.currency.label" defaultMessage="Currency" /></td>
                <td>{invoice.currencyUom?.code}</td>
              </tr>
              <tr>
                <td className="detail-label"><Translate id="react.invoice.invoiceType.label" defaultMessage="Invoice Type" /></td>
                <td>{invoice.invoiceType?.name ?? invoice.invoiceType?.code}</td>
              </tr>
              <tr>
                <td className="detail-label"><Translate id="react.invoice.totalValue.label" defaultMessage="Total Value" /></td>
                <td>{formatCurrency(invoice.totalValue, invoice.currencyUom?.code)}</td>
              </tr>
              {invoice.currencyUom?.code !== invoice.defaultCurrencyCode && (
                <tr>
                  <td className="detail-label">
                    <Translate id="react.invoice.totalValueNormalized.label" defaultMessage="Total Value (Local Currency)" />
                  </td>
                  <td>
                    {formatCurrency(invoice.totalValueNormalized, invoice.defaultCurrencyCode)}
                  </td>
                </tr>
              )}
              <tr>
                <td className="detail-label"><Translate id="react.invoice.orders.label" defaultMessage="Orders" /></td>
                <td>
                  {(invoice.orders ?? []).map((order) => (
                    <a key={order.id} className="mr-2" href={ORDER_URL.show(order.id)}>{order.orderNumber}</a>
                  ))}
                </td>
              </tr>
              <tr>
                <td className="detail-label"><Translate id="react.invoice.shipments.label" defaultMessage="Shipments" /></td>
                <td>
                  {(invoice.shipments ?? []).map((shipment) => (
                    <a key={shipment.id} className="mr-2" href={`${CONTEXT_PATH}/stockMovement/show/${shipment.id}`}>{shipment.shipmentNumber}</a>
                  ))}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="col-md-6">
          <table className="table table-sm details-table">
            <tbody>
              <tr>
                <td className="detail-label"><Translate id="react.default.createdBy.label" defaultMessage="Created by" /></td>
                <td>
                  {invoice.createdBy?.name}
                  {invoice.dateCreated && ` · ${formatDate(invoice.dateCreated)}`}
                </td>
              </tr>
              <tr>
                <td className="detail-label"><Translate id="react.default.updatedBy.label" defaultMessage="Updated by" /></td>
                <td>
                  {invoice.updatedBy?.name}
                  {invoice.lastUpdated && ` · ${formatDate(invoice.lastUpdated)}`}
                </td>
              </tr>
              <tr>
                <td className="detail-label"><Translate id="react.invoice.invoiceDate.label" defaultMessage="Invoice Date" /></td>
                <td>{formatDate(invoice.dateInvoiced)}</td>
              </tr>
              <tr>
                <td className="detail-label"><Translate id="react.invoice.dateSubmitted.label" defaultMessage="Date Submitted" /></td>
                <td>{formatDate(invoice.dateSubmitted)}</td>
              </tr>
              <tr>
                <td className="detail-label"><Translate id="react.invoice.datePosted.label" defaultMessage="Date Posted" /></td>
                <td>{formatDate(invoice.datePosted)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <Tabs>
        <TabList>
          <Tab>
            <Translate id="react.invoice.items.label" defaultMessage="Invoice Items" />
            {` (${invoice.items?.length ?? 0})`}
          </Tab>
          <Tab>
            <Translate id="react.invoice.documents.label" defaultMessage="Documents" />
            {` (${invoice.documents?.length ?? 0})`}
          </Tab>
        </TabList>
        <TabPanel>
          {invoice.items?.length ? (
            <table className="table table-sm items-table" data-testid="invoice-items-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>{translate('react.invoice.productCode.label', 'Code')}</th>
                  <th>{translate('react.invoice.description.label', 'Product/Description')}</th>
                  <th>{translate('react.invoice.orderNumber.label', 'Order Number')}</th>
                  <th>{translate('react.invoice.glAccount.label', 'GL Account')}</th>
                  <th>{translate('react.invoice.budgetCode.label', 'Budget Code')}</th>
                  <th className="text-right">{translate('react.invoice.quantity.label', 'Quantity')}</th>
                  <th className="text-right">{translate('react.invoice.quantityPerUom.label', 'Qty per UOM')}</th>
                  <th className="text-right">{translate('react.invoice.unitPrice.label', 'Unit Price')}</th>
                  <th className="text-right">{translate('react.invoice.amount.label', 'Amount')}</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, index) => (
                  <tr key={item.id} className={item.inverse ? 'inverse-item' : ''}>
                    <td>{index + 1}</td>
                    <td>{item.productCode}</td>
                    <td>{item.description}</td>
                    <td>{item.orderNumber}</td>
                    <td>{item.glAccountCode}</td>
                    <td>{item.budgetCodeCode}</td>
                    <td className="text-right">{item.quantity}</td>
                    <td className="text-right">{item.quantityPerUom}</td>
                    <td className="text-right">{formatCurrency(item.unitPrice, invoice.currencyUom?.code)}</td>
                    <td className="text-right">{formatCurrency(item.amount, invoice.currencyUom?.code)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={9} className="text-right font-weight-bold">
                    <Translate id="react.invoice.totalValue.label" defaultMessage="Total Value" />
                  </td>
                  <td className="text-right font-weight-bold">
                    {formatCurrency(invoice.totalValue, invoice.currencyUom?.code)}
                  </td>
                </tr>
              </tfoot>
            </table>
          ) : (
            <div className="p-3 empty-state">
              <Translate id="react.invoice.items.empty.label" defaultMessage="There are no invoice items" />
            </div>
          )}
        </TabPanel>
        <TabPanel>
          {invoice.documents?.length ? (
            <table className="table table-sm documents-table" data-testid="invoice-documents-table">
              <thead>
                <tr>
                  <th>{translate('react.default.name.label', 'Name')}</th>
                  <th>{translate('react.invoice.document.filenameOrUrl.label', 'File / URL')}</th>
                  <th>{translate('react.invoice.document.type.label', 'Type')}</th>
                  <th>{translate('react.invoice.document.size.label', 'Size')}</th>
                  <th>{translate('react.default.lastUpdated.label', 'Last Updated')}</th>
                  <th>{translate('react.default.actions.label', 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {[...fileDocuments, ...urlDocuments].map((document) => (
                  <tr key={document.id}>
                    <td>{document.name}</td>
                    <td>
                      <DocumentLink document={document} />
                    </td>
                    <td>{document.documentType?.name}</td>
                    <td>{document.fileUri ? '' : document.size}</td>
                    <td>{formatDate(document.lastUpdated)}</td>
                    <td>
                      {document.editable && (
                        <button
                          type="button"
                          className="btn btn-outline-danger btn-xs"
                          onClick={() => deleteDocument(document.id)}
                        >
                          <Translate id="react.default.button.delete.label" defaultMessage="Delete" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-3 empty-state">
              <Translate id="react.invoice.documents.empty.label" defaultMessage="There are no documents" />
            </div>
          )}
          <div className="p-2">
            <a href={INVOICE_URL.addDocument(invoice.id)} className="btn btn-outline-primary btn-xs">
              <Translate id="react.invoice.addDocument.label" defaultMessage="Add Document" />
            </a>
          </div>
        </TabPanel>
      </Tabs>
    </div>
  );
};

export default InvoiceShow;
