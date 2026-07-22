import React, { useEffect, useState } from 'react';

import { useParams } from 'react-router-dom';
import Alert from 'react-s-alert';

import orderApi from 'api/services/OrderApi';
import { CONTEXT_PATH, INVOICE_URL, ORDER_URL } from 'consts/applicationUrls';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';

const formatCurrency = (value, currencyCode) => {
  if (value === null || value === undefined) {
    return '';
  }
  return `${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currencyCode ?? ''}`;
};

const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : '');

const isSafeUrl = (value) => /^https?:\/\//i.test(value);

const showError = (err) => {
  const message = err?.response?.data?.errorMessage;
  if (message) {
    Alert.error(message);
  }
};

const TABS = [
  { id: 'summary', labelId: 'react.order.show.tab.summary.label', defaultMessage: 'Summary' },
  { id: 'itemStatus', labelId: 'react.order.show.tab.itemStatus.label', defaultMessage: 'Item Status' },
  { id: 'itemDetails', labelId: 'react.order.show.tab.itemDetails.label', defaultMessage: 'Item Details' },
  { id: 'adjustments', labelId: 'react.order.show.tab.adjustments.label', defaultMessage: 'Adjustments' },
  { id: 'shipments', labelId: 'react.order.show.tab.shipments.label', defaultMessage: 'Shipments' },
  { id: 'invoices', labelId: 'react.order.show.tab.invoices.label', defaultMessage: 'Invoices' },
  { id: 'documents', labelId: 'react.order.show.tab.documents.label', defaultMessage: 'Documents' },
  { id: 'comments', labelId: 'react.order.show.tab.comments.label', defaultMessage: 'Comments' },
];

const OrderShow = () => {
  const { orderId } = useParams();

  useTranslation('order', 'default');

  const translate = useTranslate();

  const [order, setOrder] = useState(null);
  const [items, setItems] = useState(null);
  const [adjustments, setAdjustments] = useState(null);
  const [shipments, setShipments] = useState(null);
  const [invoices, setInvoices] = useState(null);
  const [documents, setDocuments] = useState(null);
  const [comments, setComments] = useState(null);
  const [activeTab, setActiveTab] = useState('summary');
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    if (!orderId) {
      return;
    }
    setOrder(null);
    setItems(null);
    setAdjustments(null);
    setShipments(null);
    setInvoices(null);
    setDocuments(null);
    setComments(null);
    setLoadError(null);
    orderApi.getOrderDetails(orderId)
      .then(({ data }) => setOrder(data?.data))
      .catch((err) => {
        setLoadError(err?.response?.data?.errorMessage || 'Unable to load order');
        showError(err);
      });
    // Errors on the tab requests are surfaced through the details request
    // above to avoid duplicate toasts for the same unknown order
    orderApi.getOrderItems(orderId)
      .then(({ data }) => setItems(data?.data))
      .catch(() => {});
    orderApi.getOrderAdjustments(orderId)
      .then(({ data }) => setAdjustments(data?.data))
      .catch(() => {});
    orderApi.getOrderShipments(orderId)
      .then(({ data }) => setShipments(data?.data ?? []))
      .catch(() => {});
    orderApi.getOrderInvoices(orderId)
      .then(({ data }) => setInvoices(data?.data ?? []))
      .catch(() => {});
    orderApi.getOrderDocuments(orderId)
      .then(({ data }) => setDocuments(data?.data))
      .catch(() => {});
    orderApi.getOrderComments(orderId)
      .then(({ data }) => setComments(data?.data ?? []))
      .catch(() => {});
  }, [orderId]);

  const currencyCode = order?.currencyCode;
  const activeItems = items?.orderItems?.filter((item) => !item.canceled) ?? [];
  // Legacy summary shows canceled items (highlighted) on purchase orders
  const summaryItems = items?.isPurchaseOrder ? (items?.orderItems ?? []) : activeItems;

  const renderItemsTable = (columns, rows) => (
    <table className="table table-sm table-bordered mb-0" data-testid={`order-show-${activeTab}-table`}>
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column.key}>{column.header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 && (
          <tr>
            <td colSpan={columns.length} className="text-center">
              <Translate id="react.default.noResults.label" defaultMessage="No results" />
            </td>
          </tr>
        )}
        {rows.map((row, index) => (
          // eslint-disable-next-line react/no-array-index-key
          <tr key={row.id ?? index} style={row.canceled ? { backgroundColor: '#ffcccb' } : undefined}>
            {columns.map((column) => (
              <td key={column.key}>{column.render(row, index)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );

  const summaryColumns = [
    { key: 'index', header: '#', render: (row, index) => index + 1 },
    { key: 'productCode', header: <Translate id="react.order.show.column.productCode.label" defaultMessage="Code" />, render: (row) => row.product?.productCode },
    { key: 'product', header: <Translate id="react.order.show.column.product.label" defaultMessage="Product" />, render: (row) => row.product?.name },
    ...(items?.hasSupplierCode ? [{ key: 'supplierCode', header: <Translate id="react.order.show.column.supplierCode.label" defaultMessage="Supplier code" />, render: (row) => row.supplierCode }] : []),
    ...(items?.hasManufacturerName ? [{ key: 'manufacturerName', header: <Translate id="react.order.show.column.manufacturer.label" defaultMessage="Manufacturer" />, render: (row) => row.manufacturerName }] : []),
    ...(items?.hasManufacturerCode ? [{ key: 'manufacturerCode', header: <Translate id="react.order.show.column.manufacturerCode.label" defaultMessage="Manufacturer code" />, render: (row) => row.manufacturerCode }] : []),
    { key: 'quantity', header: <Translate id="react.order.show.column.quantity.label" defaultMessage="Quantity" />, render: (row) => row.quantity },
    { key: 'uom', header: <Translate id="react.order.show.column.uom.label" defaultMessage="UOM" />, render: (row) => row.unitOfMeasure },
    { key: 'unitPrice', header: <Translate id="react.order.show.column.unitPrice.label" defaultMessage="Unit price" />, render: (row) => formatCurrency(row.unitPrice, currencyCode) },
    { key: 'totalPrice', header: <Translate id="react.order.show.column.totalPrice.label" defaultMessage="Total price" />, render: (row) => formatCurrency(row.totalPrice, currencyCode) },
  ];

  const itemStatusColumns = [
    { key: 'index', header: '#', render: (row, index) => index + 1 },
    { key: 'productCode', header: <Translate id="react.order.show.column.productCode.label" defaultMessage="Code" />, render: (row) => row.product?.productCode },
    { key: 'product', header: <Translate id="react.order.show.column.product.label" defaultMessage="Product" />, render: (row) => row.product?.name },
    { key: 'quantity', header: <Translate id="react.order.show.column.ordered.label" defaultMessage="Ordered" />, render: (row) => row.quantity },
    { key: 'shipped', header: <Translate id="react.order.show.column.shipped.label" defaultMessage="Shipped" />, render: (row) => row.quantityShipped },
    { key: 'received', header: <Translate id="react.order.show.column.received.label" defaultMessage="Received" />, render: (row) => row.quantityReceived },
    { key: 'invoiced', header: <Translate id="react.order.show.column.invoiced.label" defaultMessage="Invoiced" />, render: (row) => row.postedQuantityInvoiced },
  ];

  const itemDetailsColumns = [
    { key: 'index', header: '#', render: (row, index) => index + 1 },
    { key: 'productCode', header: <Translate id="react.order.show.column.productCode.label" defaultMessage="Code" />, render: (row) => row.product?.productCode },
    { key: 'product', header: <Translate id="react.order.show.column.product.label" defaultMessage="Product" />, render: (row) => row.product?.name },
    { key: 'status', header: <Translate id="react.order.show.column.status.label" defaultMessage="Status" />, render: (row) => row.orderItemStatusCode },
    { key: 'quantity', header: <Translate id="react.order.show.column.quantity.label" defaultMessage="Quantity" />, render: (row) => row.quantity },
    { key: 'uom', header: <Translate id="react.order.show.column.uom.label" defaultMessage="UOM" />, render: (row) => row.unitOfMeasure },
    { key: 'unitPrice', header: <Translate id="react.order.show.column.unitPrice.label" defaultMessage="Unit price" />, render: (row) => formatCurrency(row.unitPrice, currencyCode) },
    { key: 'totalPrice', header: <Translate id="react.order.show.column.totalPrice.label" defaultMessage="Total price" />, render: (row) => formatCurrency(row.totalPrice, currencyCode) },
    { key: 'budgetCode', header: <Translate id="react.order.show.column.budgetCode.label" defaultMessage="Budget code" />, render: (row) => row.budgetCode },
    { key: 'recipient', header: <Translate id="react.order.show.column.recipient.label" defaultMessage="Recipient" />, render: (row) => row.recipient },
    { key: 'estimatedReadyDate', header: <Translate id="react.order.show.column.estimatedReadyDate.label" defaultMessage="Estimated ready date" />, render: (row) => formatDate(row.estimatedReadyDate) },
    { key: 'actualReadyDate', header: <Translate id="react.order.show.column.actualReadyDate.label" defaultMessage="Actual ready date" />, render: (row) => formatDate(row.actualReadyDate) },
  ];

  const adjustmentColumns = [
    { key: 'index', header: '#', render: (row, index) => index + 1 },
    { key: 'orderItem', header: <Translate id="react.order.show.column.orderItem.label" defaultMessage="Order item" />, render: (row) => row.orderItem?.label },
    { key: 'type', header: <Translate id="react.order.adjustment.type.label" defaultMessage="Adjustment type" />, render: (row) => row.orderAdjustmentType?.name },
    { key: 'description', header: <Translate id="react.order.adjustment.description.label" defaultMessage="Description" />, render: (row) => row.description },
    { key: 'percentage', header: <Translate id="react.order.adjustment.percentage.label" defaultMessage="Percentage" />, render: (row) => (row.percentage != null ? `${row.percentage}%` : '') },
    {
      key: 'amount',
      header: <Translate id="react.order.adjustment.amount.label" defaultMessage="Amount" />,
      render: (row) => {
        if (row.amount) {
          return formatCurrency(row.amount, currencyCode);
        }
        return row.percentage ? formatCurrency(row.totalAdjustments, currencyCode) : '';
      },
    },
    { key: 'budgetCode', header: <Translate id="react.order.show.column.budgetCode.label" defaultMessage="Budget code" />, render: (row) => row.budgetCode },
    { key: 'status', header: <Translate id="react.order.show.column.status.label" defaultMessage="Status" />, render: (row) => (row.canceled ? 'CANCELED' : row.derivedPaymentStatus) },
  ];

  const shipmentColumns = [
    { key: 'index', header: '#', render: (row) => row.orderItemIndex },
    { key: 'product', header: <Translate id="react.order.show.column.product.label" defaultMessage="Product" />, render: (row) => (row.product ? `${row.product.productCode} ${row.product.name}` : '') },
    {
      key: 'shipment',
      header: <Translate id="react.order.show.column.shipment.label" defaultMessage="Shipment" />,
      render: (row) => (row.shipment
        ? <a href={`${CONTEXT_PATH}/shipment/showDetails/${row.shipment.id}`}>{row.shipment.shipmentNumber}</a>
        : ''),
    },
    { key: 'shipmentType', header: <Translate id="react.order.show.column.shipmentType.label" defaultMessage="Type" />, render: (row) => row.shipmentType },
    { key: 'status', header: <Translate id="react.order.show.column.status.label" defaultMessage="Status" />, render: (row) => row.status },
    { key: 'packLevel', header: <Translate id="react.order.show.column.packLevel.label" defaultMessage="Pack level" />, render: (row) => row.packLevel },
    { key: 'lotNumber', header: <Translate id="react.order.show.column.lotNumber.label" defaultMessage="Lot number" />, render: (row) => row.lotNumber },
    { key: 'expirationDate', header: <Translate id="react.order.show.column.expirationDate.label" defaultMessage="Expiration date" />, render: (row) => formatDate(row.expirationDate) },
    { key: 'quantity', header: <Translate id="react.order.show.column.quantity.label" defaultMessage="Quantity" />, render: (row) => row.quantity },
    { key: 'uom', header: <Translate id="react.order.show.column.uom.label" defaultMessage="UOM" />, render: (row) => row.unitOfMeasure },
  ];

  const invoiceColumns = [
    { key: 'index', header: '#', render: (row, index) => index + 1 },
    { key: 'productCode', header: <Translate id="react.order.show.column.productCode.label" defaultMessage="Code" />, render: (row) => row.productCode },
    { key: 'description', header: <Translate id="react.order.show.column.description.label" defaultMessage="Description" />, render: (row) => row.description },
    {
      key: 'invoice',
      header: <Translate id="react.order.show.column.invoiceNumber.label" defaultMessage="Invoice number" />,
      render: (row) => (row.invoice
        ? <a href={INVOICE_URL.show(row.invoice.id)}>{row.invoice.invoiceNumber}</a>
        : ''),
    },
    { key: 'invoiceType', header: <Translate id="react.order.show.column.invoiceType.label" defaultMessage="Type" />, render: (row) => row.invoiceType },
    { key: 'status', header: <Translate id="react.order.show.column.status.label" defaultMessage="Status" />, render: (row) => row.invoiceStatus },
    { key: 'quantity', header: <Translate id="react.order.show.column.quantity.label" defaultMessage="Quantity" />, render: (row) => row.quantity },
    { key: 'uom', header: <Translate id="react.order.show.column.uom.label" defaultMessage="UOM" />, render: (row) => row.unitOfMeasure },
    { key: 'unitPrice', header: <Translate id="react.order.show.column.unitPrice.label" defaultMessage="Unit price" />, render: (row) => formatCurrency(row.unitPrice, currencyCode) },
    { key: 'amount', header: <Translate id="react.order.show.column.amount.label" defaultMessage="Amount" />, render: (row) => formatCurrency(row.amount, currencyCode) },
  ];

  const documentColumns = [
    { key: 'name', header: <Translate id="react.order.show.column.name.label" defaultMessage="Name" />, render: (row) => row.name || row.filename },
    { key: 'documentType', header: <Translate id="react.order.show.column.documentType.label" defaultMessage="Type" />, render: (row) => row.documentType },
    {
      key: 'download',
      header: <Translate id="react.order.show.column.download.label" defaultMessage="Download" />,
      render: (row) => (row.fileUri && isSafeUrl(row.fileUri)
        ? <a href={row.fileUri} target="_blank" rel="noopener noreferrer">{row.fileUri}</a>
        : <a href={`${CONTEXT_PATH}/document/download/${row.id}`}>{translate('react.default.button.download.label', 'Download')}</a>),
    },
    { key: 'lastUpdated', header: <Translate id="react.order.show.column.lastUpdated.label" defaultMessage="Last updated" />, render: (row) => formatDate(row.lastUpdated) },
  ];

  const commentColumns = [
    { key: 'comment', header: <Translate id="react.order.show.column.comment.label" defaultMessage="Comment" />, render: (row) => row.comment },
    { key: 'sender', header: <Translate id="react.order.show.column.sender.label" defaultMessage="Sender" />, render: (row) => row.sender?.name },
    { key: 'recipient', header: <Translate id="react.order.show.column.recipient.label" defaultMessage="Recipient" />, render: (row) => row.recipient?.name },
    { key: 'lastUpdated', header: <Translate id="react.order.show.column.lastUpdated.label" defaultMessage="Last updated" />, render: (row) => formatDate(row.lastUpdated) },
  ];

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'summary':
        return renderItemsTable(summaryColumns, summaryItems);
      case 'itemStatus':
        return renderItemsTable(itemStatusColumns, activeItems);
      case 'itemDetails':
        return renderItemsTable(itemDetailsColumns, items?.orderItems ?? []);
      case 'adjustments':
        return renderItemsTable(adjustmentColumns, adjustments?.adjustments ?? []);
      case 'shipments':
        return renderItemsTable(shipmentColumns, shipments ?? []);
      case 'invoices':
        return renderItemsTable(invoiceColumns, invoices ?? []);
      case 'documents':
        return renderItemsTable(
          documentColumns,
          [
            ...(documents?.documents ?? []),
            ...(documents?.links ?? []),
            ...(documents?.documentTemplates ?? []),
          ],
        );
      case 'comments':
        return renderItemsTable(commentColumns, comments ?? []);
      default:
        return null;
    }
  };

  if (loadError) {
    return (
      <div className="d-flex flex-column m-3" data-testid="order-show-error">
        <div className="alert alert-danger">{loadError}</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="d-flex flex-column m-3">
        <Translate id="react.default.loading.label" defaultMessage="Loading..." />
      </div>
    );
  }

  return (
    <div className="d-flex flex-column m-3" data-testid="order-show-page">
      <div className="card mb-3">
        <div className="card-header d-flex justify-content-between align-items-center">
          <span data-testid="order-show-header">
            <Translate id="react.order.show.label" defaultMessage="Order" />
            {' '}
            <strong>{order.orderNumber}</strong>
            {order.name && ` · ${order.name}`}
            {order.derivedStatus && (
              <span className="badge badge-secondary ml-2">{order.derivedStatus}</span>
            )}
          </span>
          <a className="btn btn-outline-secondary btn-sm" href={ORDER_URL.print(order.id)}>
            <Translate id="react.default.button.print.label" defaultMessage="Print" />
          </a>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-4">
              <dl className="mb-0">
                <dt><Translate id="react.order.show.orderType.label" defaultMessage="Order type" /></dt>
                <dd data-testid="order-show-order-type">{order.orderType?.name}</dd>
                <dt><Translate id="react.order.show.origin.label" defaultMessage="Origin" /></dt>
                <dd data-testid="order-show-origin">{order.origin?.name}</dd>
                <dt><Translate id="react.order.show.destination.label" defaultMessage="Destination" /></dt>
                <dd data-testid="order-show-destination">{order.destination?.name}</dd>
              </dl>
            </div>
            <div className="col-md-4">
              <dl className="mb-0">
                <dt><Translate id="react.order.show.paymentTerms.label" defaultMessage="Payment terms" /></dt>
                <dd>{order.paymentTerm?.name}</dd>
                <dt><Translate id="react.order.show.paymentMethod.label" defaultMessage="Payment method" /></dt>
                <dd>{order.paymentMethodType?.name}</dd>
                <dt><Translate id="react.order.show.orderedBy.label" defaultMessage="Ordered by" /></dt>
                <dd>
                  {order.orderedBy?.name}
                  {order.dateOrdered && ` · ${formatDate(order.dateOrdered)}`}
                </dd>
              </dl>
            </div>
            <div className="col-md-4">
              <dl className="mb-0">
                <dt><Translate id="react.order.show.subtotal.label" defaultMessage="Subtotal" /></dt>
                <dd data-testid="order-show-subtotal">{formatCurrency(order.subtotal, currencyCode)}</dd>
                <dt><Translate id="react.order.show.totalAdjustments.label" defaultMessage="Total adjustments" /></dt>
                <dd data-testid="order-show-total-adjustments">{formatCurrency(order.totalAdjustments, currencyCode)}</dd>
                <dt><Translate id="react.order.show.total.label" defaultMessage="Total" /></dt>
                <dd data-testid="order-show-total">{formatCurrency(order.total, currencyCode)}</dd>
              </dl>
            </div>
          </div>
          <div className="text-muted small mt-2">
            <Translate id="react.order.show.createdBy.label" defaultMessage="Created by" />
            {' '}
            {order.createdBy?.name}
            {order.dateCreated && ` · ${formatDate(order.dateCreated)}`}
            {order.updatedBy?.name && (
              <>
                {' · '}
                <Translate id="react.order.show.updatedBy.label" defaultMessage="Updated by" />
                {' '}
                {order.updatedBy.name}
                {order.lastUpdated && ` · ${formatDate(order.lastUpdated)}`}
              </>
            )}
          </div>
        </div>
      </div>
      <div className="card">
        <div className="card-header p-0">
          <ul className="nav nav-tabs card-header-tabs m-0 px-2 pt-2">
            {TABS.map((tab) => (
              <li className="nav-item" key={tab.id}>
                <button
                  type="button"
                  className={`nav-link btn btn-link ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                  data-testid={`order-show-tab-${tab.id}`}
                >
                  <Translate id={tab.labelId} defaultMessage={tab.defaultMessage} />
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="card-body p-0 table-responsive">
          {renderActiveTab()}
        </div>
      </div>
    </div>
  );
};

export default OrderShow;
