import React, { useEffect, useState } from 'react';

import { getTranslate } from 'react-localize-redux';
import Modal from 'react-modal';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import Alert from 'react-s-alert';

import stockMovementApi from 'api/services/StockMovementApi';
import {
  CONTEXT_PATH,
  INVENTORY_URL,
  ORDER_URL,
  SHIPMENT_SHOW_URL,
  STOCK_MOVEMENT_URL,
  STOCK_TRANSFER_URL,
} from 'consts/applicationUrls';
import useTranslation from 'hooks/useTranslation';
import Translate, { translateWithDefaultMessage } from 'utils/Translate';

const TABS = ['packingList', 'receipts', 'documents'];

const ReturnsShow = () => {
  const { stockMovementId } = useParams();
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState(TABS[0]);
  const [synchronizeDialogHtml, setSynchronizeDialogHtml] = useState(null);

  useTranslation('stockMovement', 'shipping', 'default');

  const translate = useSelector(
    (state) => translateWithDefaultMessage(getTranslate(state.localize)),
  );

  useEffect(() => {
    stockMovementApi.getReturnsShow(stockMovementId)
      .then(({ data: response }) => {
        setData(response?.data);
      })
      .catch((err) => {
        const message = err?.response?.data?.errorMessage;
        if (message) {
          Alert.error(message);
        }
      });
  }, [stockMovementId]);

  if (!data) {
    return null;
  }

  const openSynchronizeDialog = () => {
    fetch(`${CONTEXT_PATH}/stockMovement/synchronizeDialog/${data.id}`, { credentials: 'same-origin' })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Unable to load synchronize dialog (${response.status})`);
        }
        return response.text();
      })
      .then((html) => setSynchronizeDialogHtml(html))
      .catch(() => Alert.error('Unable to load synchronize dialog'));
  };

  const visibleDocuments = (data.documents ?? []).filter((document) => !document.hidden);
  const canDelete = (data.isPending || !data.shipment?.currentStatus)
    && (data.isSameOrigin || !data.origin?.isDepot);

  return (
    <div className="d-flex flex-column m-3">
      <div className="card mb-3">
        <div className="card-header d-flex justify-content-between align-items-center">
          <div data-testid="returns-show-title">
            <span className="font-weight-bold mr-2">{data.identifier}</span>
            {data.name}
            <span className="text-muted text-uppercase ml-2 small">
              {data.isSameDestination
                ? <Translate id="react.default.inbound.label" defaultMessage="Inbound" />
                : <Translate id="react.default.outbound.label" defaultMessage="Outbound" />}
            </span>
          </div>
          <div>
            {(data.documents ?? []).length > 0 && (
              <a className="btn btn-sm btn-outline-secondary mr-2" href={`${STOCK_MOVEMENT_URL.base}/addDocument/${data.id}`}>
                <Translate id="react.stockMovement.uploadDocuments.label" defaultMessage="Upload documents" />
              </a>
            )}
            {visibleDocuments.length > 0 && (
              <div className="btn-group mr-2">
                <button type="button" className="btn btn-sm btn-outline-secondary dropdown-toggle" data-toggle="dropdown" data-testid="documents-download-button">
                  <Translate id="react.default.button.download.label" defaultMessage="Download" />
                </button>
                <div className="dropdown-menu">
                  {visibleDocuments.map((document) => (
                    <a key={document.uri ?? document.name} className="dropdown-item" href={document.uri} target="_blank" rel="noopener noreferrer">
                      {document.name}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="card-body py-2 d-flex flex-wrap" data-testid="returns-show-actions">
          <a className="btn btn-sm btn-outline-secondary mr-2 mb-1" href={`${STOCK_MOVEMENT_URL.list()}?direction=${data.isSameDestination ? 'INBOUND' : 'OUTBOUND'}`}>
            <Translate id="react.default.button.list.label" defaultMessage="List" />
          </a>
          <a className="btn btn-sm btn-outline-secondary mr-2 mb-1" href={`${CONTEXT_PATH}/stockMovement/create`}>
            <Translate id="react.default.button.create.label" defaultMessage="Create" />
          </a>
          <a className="btn btn-sm btn-outline-secondary mr-2 mb-1" href={STOCK_TRANSFER_URL.edit(data.id)} data-testid="edit-button">
            <Translate id="react.default.button.edit.label" defaultMessage="Edit" />
          </a>
          <a className="btn btn-sm btn-outline-secondary mr-2 mb-1" href={`${CONTEXT_PATH}/partialReceiving/create/${data.shipment?.id}`} data-testid="receive-button">
            <Translate id="react.default.button.receive.label" defaultMessage="Receive" />
          </a>
          {data.isUserAdmin && (data.hasBeenReceived || data.hasBeenPartiallyReceived) && (
            <a className="btn btn-sm btn-outline-secondary mr-2 mb-1" href={`${CONTEXT_PATH}/partialReceiving/rollbackLastReceipt/${data.shipment?.id}`}>
              <Translate id="react.stockMovement.rollbackLastReceipt.label" defaultMessage="Rollback last receipt" />
            </a>
          )}
          {data.isUserAdmin && data.hasBeenShipped
            && !(data.hasBeenReceived || data.hasBeenPartiallyReceived) && (
            <a className="btn btn-sm btn-outline-secondary mr-2 mb-1" href={`${STOCK_TRANSFER_URL.base}/rollback/${data.id}`}>
              <Translate id="react.default.button.rollback.label" defaultMessage="Rollback" />
            </a>
          )}
          {data.isUserAdmin && canDelete && (
            <a
              className="btn btn-sm btn-outline-danger mr-2 mb-1"
              href={`${STOCK_TRANSFER_URL.base}/remove/${data.id}?orderId=${data.order?.id ?? ''}`}
              onClick={(event) => {
                // eslint-disable-next-line no-alert
                if (!window.confirm('Are you sure?')) {
                  event.preventDefault();
                }
              }}
              data-testid="delete-button"
            >
              <Translate id="react.default.button.delete.label" defaultMessage="Delete" />
            </a>
          )}
          {data.isSuperuser && (
            <button type="button" className="btn btn-sm btn-outline-secondary mr-2 mb-1" onClick={openSynchronizeDialog} data-testid="synchronize-button">
              <Translate id="react.default.button.synchronize.label" defaultMessage="Synchronize" />
            </button>
          )}
          <Modal
            isOpen={!!synchronizeDialogHtml}
            onRequestClose={() => setSynchronizeDialogHtml(null)}
            className="modal-content-custom"
            shouldCloseOnOverlayClick
            ariaHideApp={false}
          >
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h5 className="m-0">
                <Translate id="react.default.button.synchronize.label" defaultMessage="Synchronize" />
              </h5>
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setSynchronizeDialogHtml(null)}>
                <Translate id="react.default.button.close.label" defaultMessage="Close" />
              </button>
            </div>
            {/* Legacy synchronizeDialog fragment, loaded like the legacy btn-show-dialog modal */}
            {/* eslint-disable-next-line react/no-danger */}
            <div data-testid="synchronize-dialog" dangerouslySetInnerHTML={{ __html: synchronizeDialogHtml }} />
          </Modal>
        </div>
      </div>
      <div className="row">
        <div className="col-md-4">
          <div className="card mb-3">
            <div className="card-header">
              <Translate id="react.default.details.label" defaultMessage="Details" />
            </div>
            <table className="table table-sm mb-0" data-testid="returns-show-details">
              <tbody>
                <tr>
                  <td><Translate id="react.stockMovement.identifier.label" defaultMessage="Identifier" /></td>
                  <td data-testid="details-identifier">{data.identifier}</td>
                </tr>
                <tr>
                  <td><Translate id="react.stockMovement.status.label" defaultMessage="Status" /></td>
                  <td data-testid="details-status">{data.displayStatus}</td>
                </tr>
                <tr>
                  <td><Translate id="react.stockMovement.origin.label" defaultMessage="Origin" /></td>
                  <td data-testid="details-origin">{data.origin?.name}</td>
                </tr>
                <tr>
                  <td><Translate id="react.stockMovement.destination.label" defaultMessage="Destination" /></td>
                  <td data-testid="details-destination">{data.destination?.name}</td>
                </tr>
                <tr>
                  <td><Translate id="react.stockMovement.comments.label" defaultMessage="Comments" /></td>
                  <td data-testid="details-comments">{data.comments || <Translate id="react.default.none.label" defaultMessage="None" />}</td>
                </tr>
                <tr>
                  <td><Translate id="react.stockMovement.trackingNumber.label" defaultMessage="Tracking number" /></td>
                  <td data-testid="details-tracking-number">{data.trackingNumber || <Translate id="react.default.none.label" defaultMessage="None" />}</td>
                </tr>
                <tr>
                  <td><Translate id="react.stockMovement.driverName.label" defaultMessage="Driver name" /></td>
                  <td data-testid="details-driver-name">{data.driverName || <Translate id="react.default.none.label" defaultMessage="None" />}</td>
                </tr>
                <tr>
                  <td><Translate id="react.shipment.shipmentType.label" defaultMessage="Shipment type" /></td>
                  <td data-testid="details-shipment-type">{data.shipmentType || <Translate id="react.default.none.label" defaultMessage="None" />}</td>
                </tr>
                <tr>
                  <td><Translate id="react.shipment.totalValue.label" defaultMessage="Total value" /></td>
                  <td data-testid="details-total-value">
                    {data.hasRoleFinance
                      ? `${Number(data.totalValue ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${data.currencyCode ?? ''}`
                      : <Translate id="react.default.none.label" defaultMessage="None" />}
                  </td>
                </tr>
                {data.order && (
                  <>
                    <tr>
                      <td><Translate id="react.order.orderTypeCode.label" defaultMessage="Order type" /></td>
                      <td data-testid="details-order-type">{data.order.orderType}</td>
                    </tr>
                    <tr>
                      <td><Translate id="react.order.label" defaultMessage="Order" /></td>
                      <td data-testid="details-order">
                        <a href={`${ORDER_URL.show(data.order.id)}?override=true`}>
                          {data.order.orderNumber}
                        </a>
                      </td>
                    </tr>
                  </>
                )}
                {data.isSuperuser && data.shipment && (
                  <tr>
                    <td><Translate id="react.shipment.label" defaultMessage="Shipment" /></td>
                    <td data-testid="details-shipment">
                      <a href={`${SHIPMENT_SHOW_URL.show(data.shipment.id)}?override=true`}>
                        {data.shipment.shipmentNumber}
                      </a>
                    </td>
                  </tr>
                )}
                {data.isSuperuser && data.inboundTransactions?.length > 0 && (
                  <tr>
                    <td><Translate id="react.default.inbound.label" defaultMessage="Inbound" /></td>
                    <td>
                      {data.inboundTransactions.map((transaction) => (
                        <div key={transaction.id}>
                          <a href={INVENTORY_URL.showTransaction(transaction.id)}>
                            {transaction.transactionNumber}
                          </a>
                        </div>
                      ))}
                    </td>
                  </tr>
                )}
                {data.isSuperuser && data.outboundTransactions?.length > 0 && (
                  <tr>
                    <td><Translate id="react.default.outbound.label" defaultMessage="Outbound" /></td>
                    <td>
                      {data.outboundTransactions.map((transaction) => (
                        <div key={transaction.id}>
                          <a href={INVENTORY_URL.showTransaction(transaction.id)}>
                            {transaction.transactionNumber}
                          </a>
                        </div>
                      ))}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="card mb-3">
            <div className="card-header">
              <Translate id="react.default.auditing.label" defaultMessage="Auditing" />
            </div>
            <table className="table table-sm mb-0" data-testid="returns-show-auditing">
              <tbody>
                <tr>
                  <td><Translate id="react.stockMovement.dateShipped.label" defaultMessage="Date shipped" /></td>
                  <td data-testid="auditing-date-shipped">
                    {data.dateShipped
                      ? `${data.dateShipped}${data.shippedBy ? ` by ${data.shippedBy}` : ''}`
                      : <Translate id="react.default.none.label" defaultMessage="None" />}
                  </td>
                </tr>
                <tr>
                  <td><Translate id="react.stockMovement.dateReceived.label" defaultMessage="Date received" /></td>
                  <td data-testid="auditing-date-received">
                    {data.receipts?.length > 0
                      ? data.receipts.map((receipt, index) => (
                        // eslint-disable-next-line react/no-array-index-key
                        <div key={index}>
                          {receipt.actualDeliveryDate}
                          {receipt.recipient ? ` by ${receipt.recipient}` : ''}
                        </div>
                      ))
                      : <Translate id="react.default.none.label" defaultMessage="None" />}
                  </td>
                </tr>
                <tr>
                  <td><Translate id="react.default.dateCreated.label" defaultMessage="Date created" /></td>
                  <td data-testid="auditing-date-created">
                    {data.dateCreated
                      ? `${data.dateCreated}${data.createdBy ? ` by ${data.createdBy}` : ''}`
                      : <Translate id="react.default.none.label" defaultMessage="None" />}
                  </td>
                </tr>
                <tr>
                  <td><Translate id="react.default.lastUpdated.label" defaultMessage="Last updated" /></td>
                  <td data-testid="auditing-last-updated">
                    {data.lastUpdated
                      ? `${data.lastUpdated}${data.updatedBy ? ` by ${data.updatedBy}` : ''}`
                      : <Translate id="react.default.none.label" defaultMessage="None" />}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div className="col-md-8">
          <div className="card">
            <div className="card-header p-0">
              <ul className="nav nav-tabs card-header-tabs m-0" data-testid="returns-show-tabs">
                <li className="nav-item">
                  <button
                    type="button"
                    className={`nav-link btn btn-link ${activeTab === 'packingList' ? 'active' : ''}`}
                    onClick={() => setActiveTab('packingList')}
                    data-testid="packing-list-tab"
                  >
                    <Translate id="react.shipment.packingList.label" defaultMessage="Packing List" />
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    type="button"
                    className={`nav-link btn btn-link ${activeTab === 'receipts' ? 'active' : ''}`}
                    onClick={() => setActiveTab('receipts')}
                    data-testid="receipts-tab"
                  >
                    <Translate id="react.receipts.label" defaultMessage="Receipts" />
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    type="button"
                    className={`nav-link btn btn-link ${activeTab === 'documents' ? 'active' : ''}`}
                    onClick={() => setActiveTab('documents')}
                    data-testid="documents-tab"
                  >
                    <Translate id="react.documents.label" defaultMessage="Documents" />
                  </button>
                </li>
              </ul>
            </div>
            <div className="card-body p-0">
              {activeTab === 'packingList' && (
                <table className="table table-sm mb-0" data-testid="packing-list-table">
                  <thead>
                    <tr>
                      <th>{translate('react.shipment.container.label', 'Container')}</th>
                      <th>{translate('react.product.productCode.label', 'Code')}</th>
                      <th>{translate('react.product.label', 'Product')}</th>
                      <th>{translate('react.shipment.lotNumber.label', 'Lot number')}</th>
                      <th>{translate('react.shipment.expirationDate.label', 'Expiration date')}</th>
                      <th className="text-center">{translate('react.shipment.quantityShipped.label', 'Quantity shipped')}</th>
                      <th className="text-center">{translate('react.shipment.quantityReceived.label', 'Quantity received')}</th>
                      <th className="text-center">{translate('react.shipment.quantityCanceled.label', 'Quantity canceled')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.packingList ?? []).map((item) => (
                      <tr key={item.id} data-testid="packing-list-row">
                        <td data-testid="item-container">{item.container?.name || <Translate id="react.shipment.unpacked.label" defaultMessage="Unpacked" />}</td>
                        <td data-testid="item-product-code">{item.product?.productCode}</td>
                        <td data-testid="item-product-name">{item.product?.name}</td>
                        <td data-testid="item-lot-number">{item.lotNumber}</td>
                        <td data-testid="item-expiration-date">{item.expirationDate || <Translate id="react.default.never.label" defaultMessage="Never" />}</td>
                        <td className="text-center" data-testid="item-quantity-shipped">{item.quantityShipped?.toLocaleString?.('en-US')}</td>
                        <td className="text-center" data-testid="item-quantity-received">{item.quantityReceived?.toLocaleString?.('en-US')}</td>
                        <td className="text-center" data-testid="item-quantity-canceled">{item.quantityCanceled?.toLocaleString?.('en-US')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {activeTab === 'receipts' && (
                <table className="table table-sm mb-0" data-testid="receipts-table">
                  <thead>
                    <tr>
                      <th>{translate('react.receipt.status.label', 'Status')}</th>
                      <th>{translate('react.receipt.receiptNumber.label', 'Receipt number')}</th>
                      <th>{translate('react.shipment.shipmentNumber.label', 'Shipment number')}</th>
                      <th>{translate('react.transaction.transactionNumber.label', 'Transaction')}</th>
                      <th>{translate('react.product.productCode.label', 'Code')}</th>
                      <th>{translate('react.product.label', 'Product')}</th>
                      <th>{translate('react.shipment.lotNumber.label', 'Lot number')}</th>
                      <th>{translate('react.shipment.expirationDate.label', 'Expiration date')}</th>
                      <th>{translate('react.location.binLocation.label', 'Bin location')}</th>
                      <th className="text-center">{translate('react.receiptItem.quantityCanceled.label', 'Canceled')}</th>
                      <th className="text-center">{translate('react.receiptItem.quantityPending.label', 'Pending')}</th>
                      <th className="text-center">{translate('react.receiptItem.quantityReceived.label', 'Received')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.receiptItems ?? []).map((receiptItem, index) => (
                      // eslint-disable-next-line react/no-array-index-key
                      <tr key={index} data-testid="receipt-item-row">
                        <td data-testid="receipt-status">{receiptItem.receiptStatusCode}</td>
                        <td data-testid="receipt-number">{receiptItem.receiptNumber}</td>
                        <td data-testid="receipt-shipment-number">{receiptItem.shipmentNumber}</td>
                        <td data-testid="receipt-transaction">
                          {receiptItem.transaction
                            ? (
                              <a href={INVENTORY_URL.showTransaction(receiptItem.transaction.id)}>
                                {receiptItem.transaction.transactionNumber}
                              </a>
                            )
                            : <Translate id="react.default.notAvailable.label" defaultMessage="N/A" />}
                        </td>
                        <td data-testid="receipt-product-code">{receiptItem.product?.productCode}</td>
                        <td data-testid="receipt-product-name">{receiptItem.product?.name}</td>
                        <td data-testid="receipt-lot-number">{receiptItem.lotNumber}</td>
                        <td data-testid="receipt-expiration-date">{receiptItem.expirationDate}</td>
                        <td data-testid="receipt-bin-location">{receiptItem.binLocation}</td>
                        <td className="text-center" data-testid="receipt-quantity-canceled">{receiptItem.quantityCanceled}</td>
                        <td className="text-center" data-testid="receipt-quantity-pending">{receiptItem.quantityPending}</td>
                        <td className="text-center" data-testid="receipt-quantity-received">{receiptItem.quantityReceived}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {activeTab === 'documents' && (
                <table className="table table-sm mb-0" data-testid="documents-table">
                  <thead>
                    <tr>
                      <th>{translate('react.document.name.label', 'Name')}</th>
                      <th>{translate('react.documentType.label', 'Document type')}</th>
                      <th>{translate('react.document.contentType.label', 'Content type')}</th>
                      <th aria-label="Actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {visibleDocuments.map((document) => (
                      <tr key={document.uri ?? document.name} data-testid="document-row">
                        <td data-testid="document-name">{document.name}</td>
                        <td data-testid="document-type">{document.documentType}</td>
                        <td data-testid="document-content-type">{document.contentType}</td>
                        <td className="text-right">
                          {document.uri && (
                            <a className="btn btn-sm btn-outline-secondary" href={document.uri} target="_blank" rel="noopener noreferrer">
                              <Translate id="react.default.button.download.label" defaultMessage="Download" />
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReturnsShow;
