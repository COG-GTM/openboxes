import React, { useEffect, useState } from 'react';

import { useParams } from 'react-router-dom';
import Alert from 'react-s-alert';

import stockMovementApi from 'api/services/StockMovementApi';
import { RECEIVING_URL, STOCK_MOVEMENT_URL, STOCK_REQUEST_URL } from 'consts/applicationUrls';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';

const detailRow = (labelId, defaultLabel, value, testId) => (
  <div className="form-group row mb-1">
    <span className="col-sm-4 col-form-label font-weight-bold py-0">
      <Translate id={labelId} defaultMessage={defaultLabel} />
    </span>
    <span className="col-sm-8 col-form-label py-0" data-testid={testId}>
      {value}
    </span>
  </div>
);

const StockMovementShow = () => {
  const { stockMovementId } = useParams();
  const [details, setDetails] = useState(null);
  const [activeTab, setActiveTab] = useState(null);
  const [tabData, setTabData] = useState({});

  useTranslation('stockMovement', 'default');

  const translate = useTranslate();

  useEffect(() => {
    setTabData({});
    setActiveTab(null);
    stockMovementApi.getDetails(stockMovementId)
      .then(({ data }) => {
        const fetchedDetails = data?.data;
        setDetails(fetchedDetails);
        // Mirrors the legacy show.gsp tab selection: Request Details is the
        // initial tab only for pending-shipment, same-origin movements and is
        // hidden entirely for supplier-origin movements.
        const showRequestDetails = !fetchedDetails?.origin?.isSupplier;
        const defaultToRequestDetails = showRequestDetails
          && fetchedDetails?.shipment?.currentStatus === 'PENDING'
          && fetchedDetails?.flags?.isSameOrigin;
        setActiveTab(defaultToRequestDetails ? 'requestDetails' : 'packingList');
      })
      .catch((err) => {
        const message = err?.response?.data?.errorMessage;
        if (message) {
          Alert.error(message);
        }
      });
  }, [stockMovementId]);

  useEffect(() => {
    if (!activeTab || tabData[activeTab] !== undefined) {
      return;
    }
    const fetchers = {
      requestDetails: () => stockMovementApi.getStockMovementItems(stockMovementId),
      packingList: () => stockMovementApi.getPackingList(stockMovementId),
      receipts: () => stockMovementApi.getReceiptItems(stockMovementId),
      events: () => stockMovementApi.getEvents(stockMovementId),
      documents: () => stockMovementApi.getDocuments(stockMovementId),
      comments: () => stockMovementApi.getComments(stockMovementId),
    };
    fetchers[activeTab]()
      .then(({ data }) => {
        setTabData((prev) => ({ ...prev, [activeTab]: data?.data }));
      })
      .catch((err) => {
        const message = err?.response?.data?.errorMessage;
        if (message) {
          Alert.error(message);
        }
      });
  }, [activeTab, stockMovementId]);

  const tabs = [
    ...(details?.origin?.isSupplier ? [] : [
      { id: 'requestDetails', labelId: 'react.stockMovement.requestDetails.label', defaultLabel: 'Request Details' },
    ]),
    { id: 'packingList', labelId: 'react.stockMovement.packingList.label', defaultLabel: 'Packing List' },
    { id: 'receipts', labelId: 'react.stockMovement.receipts.label', defaultLabel: 'Receipts' },
    { id: 'events', labelId: 'react.stockMovement.events.label', defaultLabel: 'Events' },
    { id: 'documents', labelId: 'react.stockMovement.documents.label', defaultLabel: 'Documents' },
    { id: 'comments', labelId: 'react.stockMovement.comments.label', defaultLabel: 'Comments' },
  ];

  const renderRequestDetails = () => {
    const items = tabData.requestDetails ?? [];
    return (
      <table className="table table-sm table-striped mb-0" data-testid="request-details-table">
        <thead>
          <tr>
            <th>{translate('react.stockMovement.column.status.label', 'Status')}</th>
            <th>{translate('react.stockMovement.column.productCode.label', 'Code')}</th>
            <th>{translate('react.stockMovement.column.product.label', 'Product')}</th>
            <th>{translate('react.stockMovement.column.unitOfMeasure.label', 'UOM')}</th>
            <th className="text-center">{translate('react.stockMovement.column.quantityRequested.label', 'Requested')}</th>
            <th className="text-center">{translate('react.stockMovement.column.quantityPicked.label', 'Picked')}</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 && (
            <tr>
              <td colSpan={6} className="text-center text-muted">
                <Translate id="react.stockMovement.noRequestItems.label" defaultMessage="No request items" />
              </td>
            </tr>
          )}
          {items.map((item) => (
            <tr key={item.id} data-testid="request-details-row">
              <td>{item.statusCode}</td>
              <td>{item.productCode}</td>
              <td>{item.product?.name}</td>
              <td>{item.unitOfMeasure || item.product?.unitOfMeasure || 'EA'}</td>
              <td className="text-center">{item.quantityRequested}</td>
              <td className="text-center">{item.quantityPicked}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  const renderPackingList = () => {
    const { packingList } = tabData;
    const shipmentItems = packingList?.shipmentItems ?? [];
    return (
      <table className="table table-sm table-striped mb-0" data-testid="packing-list-table">
        <thead>
          <tr>
            <th>{translate('react.stockMovement.column.container.label', 'Pallet')}</th>
            {packingList?.isFromPurchaseOrder && (
              <th>{translate('react.stockMovement.column.orderNumber.label', 'PO Number')}</th>
            )}
            <th>{translate('react.stockMovement.column.productCode.label', 'Code')}</th>
            <th>{translate('react.stockMovement.column.product.label', 'Product')}</th>
            <th>{translate('react.stockMovement.column.binLocation.label', 'Bin Location')}</th>
            <th>{translate('react.stockMovement.column.lotNumber.label', 'Lot/Serial No.')}</th>
            <th>{translate('react.stockMovement.column.expirationDate.label', 'Expiration Date')}</th>
            <th className="text-center">{translate('react.stockMovement.column.quantityShipped.label', 'Qty Shipped')}</th>
            {packingList?.wasReceived && (
              <>
                <th className="text-center">{translate('react.stockMovement.column.quantityReceived.label', 'Qty Received')}</th>
                <th className="text-center">{translate('react.stockMovement.column.quantityCanceled.label', 'Qty Canceled')}</th>
              </>
            )}
            <th>{translate('react.stockMovement.column.unitOfMeasure.label', 'UOM')}</th>
            <th>{translate('react.stockMovement.column.recipient.label', 'Recipient')}</th>
            <th>{translate('react.stockMovement.column.isFullyReceived.label', 'Received')}</th>
          </tr>
        </thead>
        <tbody>
          {shipmentItems.length === 0 && (
            <tr>
              <td
                colSpan={10 + (packingList?.isFromPurchaseOrder ? 1 : 0)
                  + (packingList?.wasReceived ? 2 : 0)}
                className="text-center text-muted"
              >
                <Translate id="react.stockMovement.noShipmentItems.label" defaultMessage="No shipment items" />
              </td>
            </tr>
          )}
          {shipmentItems.map((item) => (
            <tr key={item.id} data-testid="packing-list-row">
              <td>{item.container ? `${item.container.parentContainerName ? `${item.container.parentContainerName} › ` : ''}${item.container.name}` : ''}</td>
              {packingList?.isFromPurchaseOrder && <td>{item.orderNumber}</td>}
              <td>{item.product?.productCode}</td>
              <td>{item.product?.name}</td>
              <td>{item.binLocation}</td>
              <td>{item.lotNumber}</td>
              <td>{item.expirationDate}</td>
              <td className="text-center">{item.quantityShipped}</td>
              {packingList?.wasReceived && (
                <>
                  <td className="text-center">{item.quantityReceived}</td>
                  <td className="text-center">{item.quantityCanceled}</td>
                </>
              )}
              <td>{item.unitOfMeasure || 'EA'}</td>
              <td>{item.recipient}</td>
              <td>{item.isFullyReceived ? 'Yes' : 'No'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  const renderReceipts = () => {
    const receiptItems = tabData.receipts ?? [];
    return (
      <table className="table table-sm table-striped mb-0" data-testid="receipts-table">
        <thead>
          <tr>
            <th>{translate('react.stockMovement.column.status.label', 'Status')}</th>
            <th>{translate('react.stockMovement.column.receiptNumber.label', 'Receipt Number')}</th>
            <th>{translate('react.stockMovement.column.shipmentNumber.label', 'Shipment Number')}</th>
            <th>{translate('react.stockMovement.column.transactionNumber.label', 'Transaction Number')}</th>
            <th>{translate('react.stockMovement.column.productCode.label', 'Code')}</th>
            <th>{translate('react.stockMovement.column.product.label', 'Product')}</th>
            <th>{translate('react.stockMovement.column.lotNumber.label', 'Lot/Serial No.')}</th>
            <th>{translate('react.stockMovement.column.expirationDate.label', 'Expiration Date')}</th>
            <th>{translate('react.stockMovement.column.binLocation.label', 'Bin Location')}</th>
            <th className="text-center">{translate('react.stockMovement.column.quantityCanceled.label', 'Qty Canceled')}</th>
            <th className="text-center">{translate('react.stockMovement.column.quantityPending.label', 'Qty Pending')}</th>
            <th className="text-center">{translate('react.stockMovement.column.quantityReceived.label', 'Qty Received')}</th>
          </tr>
        </thead>
        <tbody>
          {receiptItems.length === 0 && (
            <tr>
              <td colSpan={12} className="text-center text-muted">
                <Translate id="react.stockMovement.noReceiptItems.label" defaultMessage="No receipt items" />
              </td>
            </tr>
          )}
          {receiptItems.map((item) => (
            <tr key={item.id} data-testid="receipt-item-row">
              <td>{item.receiptStatusCode}</td>
              <td>{item.receiptNumber}</td>
              <td>{item.shipmentNumber}</td>
              <td>{item.transaction?.transactionNumber}</td>
              <td>{item.product?.productCode}</td>
              <td>{item.product?.name}</td>
              <td>{item.lotNumber}</td>
              <td>{item.expirationDate}</td>
              <td>{item.binLocation}</td>
              <td className="text-center">{item.quantityCanceled}</td>
              <td className="text-center">{item.quantityPending}</td>
              <td className="text-center">{item.quantityReceived}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  const renderEvents = () => {
    const events = tabData.events ?? [];
    return (
      <table className="table table-sm table-striped mb-0" data-testid="events-table">
        <thead>
          <tr>
            <th>{translate('react.stockMovement.column.event.label', 'Event')}</th>
            <th>{translate('react.stockMovement.column.date.label', 'Date')}</th>
            <th>{translate('react.stockMovement.column.location.label', 'Location')}</th>
            <th>{translate('react.stockMovement.column.createdBy.label', 'Created By')}</th>
            <th>{translate('react.stockMovement.column.comment.label', 'Comment')}</th>
          </tr>
        </thead>
        <tbody>
          {events.length === 0 && (
            <tr>
              <td colSpan={5} className="text-center text-muted">
                <Translate id="react.stockMovement.noEvents.label" defaultMessage="No events" />
              </td>
            </tr>
          )}
          {events.map((event, index) => (
            // eslint-disable-next-line react/no-array-index-key
            <tr key={`${event.eventType}-${event.dateLogged}-${index}`} data-testid="event-row">
              <td>
                {event.eventType}
                {event.referenceDocument?.url && (
                  <>
                    {' '}
                    <a href={event.referenceDocument.url}>{event.referenceDocument.identifier}</a>
                  </>
                )}
              </td>
              <td>{event.date || event.dateLogged}</td>
              <td>{event.location}</td>
              <td>{event.createdBy}</td>
              <td>{event.comment}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  const renderDocuments = () => {
    const documents = tabData.documents ?? [];
    return (
      <table className="table table-sm table-striped mb-0" data-testid="documents-table">
        <thead>
          <tr>
            <th>{translate('react.stockMovement.column.name.label', 'Name')}</th>
            <th>{translate('react.stockMovement.column.documentType.label', 'Type')}</th>
            <th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {documents.length === 0 && (
            <tr>
              <td colSpan={3} className="text-center text-muted">
                <Translate id="react.stockMovement.noDocuments.label" defaultMessage="No documents" />
              </td>
            </tr>
          )}
          {documents.filter((document) => !document.hidden).map((document) => (
            <tr key={document.id ?? document.uri ?? document.name} data-testid="document-row">
              <td>{document.name}</td>
              <td>{document.documentType?.name ?? document.documentType}</td>
              <td>
                {document.downloadOptions?.length > 0
                  ? document.downloadOptions.map((option) => (
                    <a key={option.uri} className="mr-2" href={option.uri} target="_blank" rel="noopener noreferrer">
                      {option.name}
                    </a>
                  ))
                  : document.uri && (
                    <a href={document.uri} target="_blank" rel="noopener noreferrer">
                      <Translate id="react.default.button.download.label" defaultMessage="Download" />
                    </a>
                  )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  const renderComments = () => {
    const comments = tabData.comments ?? [];
    return (
      <table className="table table-sm table-striped mb-0" data-testid="comments-table">
        <thead>
          <tr>
            <th>{translate('react.stockMovement.column.recipient.label', 'To')}</th>
            <th>{translate('react.stockMovement.column.sender.label', 'From')}</th>
            <th>{translate('react.stockMovement.column.comment.label', 'Comment')}</th>
            <th>{translate('react.stockMovement.column.date.label', 'Date')}</th>
          </tr>
        </thead>
        <tbody>
          {comments.length === 0 && (
            <tr>
              <td colSpan={4} className="text-center text-muted">
                <Translate id="react.stockMovement.noComments.label" defaultMessage="No comments" />
              </td>
            </tr>
          )}
          {comments.map((comment) => (
            <tr key={comment.id} data-testid="comment-row">
              <td>{comment.recipient?.name}</td>
              <td>{comment.sender?.name}</td>
              <td>{comment.comment}</td>
              <td>{comment.lastUpdated}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  const tabRenderers = {
    requestDetails: renderRequestDetails,
    packingList: renderPackingList,
    receipts: renderReceipts,
    events: renderEvents,
    documents: renderDocuments,
    comments: renderComments,
  };

  return (
    <div className="d-flex flex-column m-3">
      <div className="card mb-3">
        <div className="card-header d-flex justify-content-between align-items-center flex-wrap">
          <span data-testid="stock-movement-title">
            <strong>{details?.identifier}</strong>
            {details?.name && ` · ${details.name}`}
            {details?.displayStatus && (
              <span className="badge badge-info ml-2" data-testid="stock-movement-status">{details.displayStatus}</span>
            )}
          </span>
          <span className="d-flex flex-wrap">
            {details?.permissions?.canUserEdit && (
              <a className="btn btn-primary btn-sm mr-2" href={STOCK_MOVEMENT_URL.genericEdit(stockMovementId)} data-testid="stock-movement-edit-button">
                <Translate id="react.default.button.edit.label" defaultMessage="Edit" />
              </a>
            )}
            {!details?.flags?.isApprovalRequired && details?.shipment?.id && (
              <a className="btn btn-outline-primary btn-sm mr-2" href={RECEIVING_URL.createPartialReceiving(details.shipment.id)} data-testid="stock-movement-receive-button">
                <Translate id="react.default.button.receive.label" defaultMessage="Receive" />
              </a>
            )}
            {!details?.flags?.isApprovalRequired && details?.permissions?.isUserAdmin
              && (details?.flags?.hasBeenReceived || details?.flags?.hasBeenPartiallyReceived)
              && details?.shipment?.id && (
              <a className="btn btn-outline-primary btn-sm mr-2" href={RECEIVING_URL.rollbackLastReceipt(details.shipment.id)} data-testid="stock-movement-rollback-last-receipt-button">
                <Translate id="react.stockMovement.rollbackLastReceipt.label" defaultMessage="Rollback Last Receipt" />
              </a>
            )}
            {!details?.flags?.isApprovalRequired && details?.permissions?.isUserAdmin
              && !(details?.flags?.hasBeenReceived || details?.flags?.hasBeenPartiallyReceived)
              && (details?.flags?.hasBeenIssued
                || ((details?.flags?.hasBeenShipped || details?.flags?.hasBeenPartiallyReceived)
                  && details?.isFromOrder)) && (
                  <a className="btn btn-outline-primary btn-sm mr-2" href={STOCK_MOVEMENT_URL.rollback(stockMovementId)} data-testid="stock-movement-rollback-button">
                    <Translate id="react.default.button.rollback.label" defaultMessage="Rollback" />
                  </a>
            )}
            {!details?.flags?.isApprovalRequired && details?.flags?.isPending
              && !details?.isElectronicType
              && (details?.flags?.isSameOrigin || !details?.flags?.originIsDepot) && (
              <a
                className="btn btn-outline-danger btn-sm mr-2"
                href={STOCK_MOVEMENT_URL.remove(stockMovementId)}
                onClick={(e) => {
                  if (!window.confirm(translate('react.default.button.delete.confirm.message', 'Are you sure?'))) {
                    e.preventDefault();
                  }
                }}
                data-testid="stock-movement-delete-button"
              >
                <Translate id="react.default.button.delete.label" defaultMessage="Delete" />
              </a>
            )}
            {!details?.flags?.isApprovalRequired && details?.flags?.isPending
              && details?.isElectronicType
              && (details?.flags?.isSameOrigin || details?.flags?.isSameDestination
                || !details?.flags?.originIsDepot) && (
                <a
                  className="btn btn-outline-danger btn-sm mr-2"
                  href={STOCK_REQUEST_URL.remove(stockMovementId)}
                  onClick={(e) => {
                    if (!window.confirm(translate('react.default.button.delete.confirm.message', 'Are you sure?'))) {
                      e.preventDefault();
                    }
                  }}
                  data-testid="stock-movement-delete-button"
                >
                  <Translate id="react.default.button.delete.label" defaultMessage="Delete" />
                </a>
            )}
            {details?.flags?.isApprovalRequired && details?.permissions?.supportsApproveRequest
              && details?.flags?.isRequisitionPendingApproval
              && details?.permissions?.userHasRequestApproverRole && (
              <>
                <a className="btn btn-outline-success btn-sm mr-2" href={STOCK_MOVEMENT_URL.updateStatus(stockMovementId, 'APPROVED')} data-testid="stock-movement-approve-button">
                  <Translate id="react.stockMovement.approve.label" defaultMessage="Approve" />
                </a>
                <a className="btn btn-outline-danger btn-sm mr-2" href={STOCK_REQUEST_URL.reject(stockMovementId)} data-testid="stock-movement-reject-button">
                  <Translate id="react.stockMovement.reject.label" defaultMessage="Reject" />
                </a>
              </>
            )}
            {details?.flags?.isApprovalRequired && details?.permissions?.supportsApproveRequest
              && details?.permissions?.canRollbackApproval && (
              <a className="btn btn-outline-primary btn-sm mr-2" href={STOCK_REQUEST_URL.rollbackApproval(stockMovementId)} data-testid="stock-movement-rollback-approval-button">
                <Translate id="react.stockMovement.rollbackApproval.label" defaultMessage="Rollback Approval" />
              </a>
            )}
            <a className="btn btn-outline-primary btn-sm mr-2" href={STOCK_MOVEMENT_URL.addComment(stockMovementId)} data-testid="stock-movement-add-comment-button">
              <Translate id="react.stockMovement.addComment.label" defaultMessage="Add Comment" />
            </a>
            <a className="btn btn-outline-primary btn-sm mr-2" href={STOCK_MOVEMENT_URL.addDocument(stockMovementId)} data-testid="stock-movement-add-document-button">
              <Translate id="react.stockMovement.addDocument.label" defaultMessage="Add Document" />
            </a>
            <a className="btn btn-outline-secondary btn-sm" href={STOCK_MOVEMENT_URL.list()}>
              <Translate id="react.default.button.back.label" defaultMessage="Back" />
            </a>
          </span>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-6">
              {detailRow('react.stockMovement.column.identifier.label', 'Identifier', details?.identifier, 'stock-movement-identifier')}
              {detailRow('react.stockMovement.column.status.label', 'Status', details?.displayStatus, 'stock-movement-display-status')}
              {details?.mostRecentEvent
                && detailRow('react.stockMovement.column.mostRecentEvent.label', 'Most Recent Event', details.mostRecentEvent.name, 'stock-movement-most-recent-event')}
              {detailRow('react.stockMovement.column.origin.label', 'Origin', details?.origin?.name, 'stock-movement-origin')}
              {detailRow('react.stockMovement.column.destination.label', 'Destination', details?.destination?.name, 'stock-movement-destination')}
              {details?.stocklist
                && detailRow('react.stockMovement.column.stocklist.label', 'Stocklist', details.stocklist.name, 'stock-movement-stocklist')}
              {detailRow('react.stockMovement.column.lineItemCount.label', 'Line Items', details?.lineItemCount, 'stock-movement-line-item-count')}
              {details?.totalValue != null
                && detailRow('react.stockMovement.column.totalValue.label', 'Total Value', `${details.totalValue} ${details.defaultCurrencyCode ?? ''}`, 'stock-movement-total-value')}
            </div>
            <div className="col-md-6">
              {details?.comments
                && detailRow('react.stockMovement.column.comments.label', 'Comments', details.comments, 'stock-movement-comments')}
              {details?.trackingNumber
                && detailRow('react.stockMovement.column.trackingNumber.label', 'Tracking Number', details.trackingNumber, 'stock-movement-tracking-number')}
              {details?.driverName
                && detailRow('react.stockMovement.column.driverName.label', 'Driver Name', details.driverName, 'stock-movement-driver-name')}
              {details?.shipmentType
                && detailRow('react.stockMovement.column.shipmentType.label', 'Shipment Type', details.shipmentType, 'stock-movement-shipment-type')}
              {detailRow('react.stockMovement.column.dateRequested.label', 'Date Requested', `${details?.auditing?.dateRequested ?? ''} ${details?.auditing?.requestedBy ?? ''}`, 'stock-movement-date-requested')}
              {details?.auditing?.dateShipped
                && detailRow('react.stockMovement.column.dateShipped.label', 'Date Shipped', `${details.auditing.dateShipped} ${details.auditing.shippedBy ?? ''}`, 'stock-movement-date-shipped')}
              {detailRow('react.stockMovement.column.dateCreated.label', 'Date Created', `${details?.auditing?.dateCreated ?? ''} ${details?.auditing?.createdBy ?? ''}`, 'stock-movement-date-created')}
              {detailRow('react.stockMovement.column.lastUpdated.label', 'Last Updated', `${details?.auditing?.lastUpdated ?? ''} ${details?.auditing?.updatedBy ?? ''}`, 'stock-movement-last-updated')}
            </div>
          </div>
        </div>
      </div>
      <div className="card">
        <div className="card-header p-0">
          <ul className="nav nav-tabs card-header-tabs m-0" data-testid="stock-movement-tabs">
            {tabs.map((tab) => (
              <li className="nav-item" key={tab.id}>
                <button
                  type="button"
                  className={`nav-link btn btn-link ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                  data-testid={`tab-${tab.id}`}
                >
                  <Translate id={tab.labelId} defaultMessage={tab.defaultLabel} />
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="card-body p-0 table-responsive">
          {activeTab && tabRenderers[activeTab]()}
        </div>
      </div>
    </div>
  );
};

export default StockMovementShow;
