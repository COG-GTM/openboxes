import React, { useEffect, useState } from 'react';

import { getTranslate } from 'react-localize-redux';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';

import requisitionApi from 'api/services/RequisitionApi';
import { BARCODE_URL } from 'consts/applicationUrls';
import useTranslation from 'hooks/useTranslation';
import Translate, { translateWithDefaultMessage } from 'utils/Translate';

const GROUPS = [
  { key: 'COLD_CHAIN', label: 'react.deliveryNote.coldChain.label', defaultLabel: 'Cold chain' },
  { key: 'CONTROLLED_SUBSTANCE', label: 'react.deliveryNote.controlledSubstance.label', defaultLabel: 'Controlled Substance' },
  { key: 'HAZARDOUS_MATERIAL', label: 'react.deliveryNote.hazardousMaterial.label', defaultLabel: 'Hazardous Material' },
  { key: 'GENERAL_GOODS', label: 'react.deliveryNote.generalGoods.label', defaultLabel: 'General Goods' },
];

const SIGNATURE_ROWS = [
  { key: 'sentBy', label: 'react.deliveryNote.sentBy.label', defaultLabel: 'Sent by' },
  { key: 'approvedBy', label: 'react.deliveryNote.approvedBy.label', defaultLabel: 'Approved by' },
  { key: 'deliveredBy', label: 'react.deliveryNote.deliveredBy.label', defaultLabel: 'Delivered by' },
  { key: 'receivedBy', label: 'react.deliveryNote.receivedBy.label', defaultLabel: 'Received by' },
  { key: 'checkedBy', label: 'react.deliveryNote.checkedBy.label', defaultLabel: 'Checked by' },
];

const Address = ({ location }) => (
  <div>
    <strong>{location?.name}</strong>
    {location?.address?.address && <div>{location.address.address}</div>}
    {location?.address?.address2 && <div>{location.address.address2}</div>}
    {(location?.address?.city || location?.address?.stateOrProvince
      || location?.address?.postalCode) && (
      <div>
        {[location.address?.city, location.address?.stateOrProvince, location.address?.postalCode]
          .filter(Boolean).join(' ')}
      </div>
    )}
    {location?.address?.country && <div>{location.address.country}</div>}
  </div>
);

const DeliveryNotePrint = () => {
  const { requisitionId } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const translate = useSelector(
    (state) => translateWithDefaultMessage(getTranslate(state.localize)),
  );

  useTranslation('deliveryNote', 'default');

  useEffect(() => {
    requisitionApi.getRequisitionDeliveryNote(requisitionId)
      .then((response) => setData(response.data?.data))
      .catch((err) => {
        setError(err?.response?.data?.errorMessage
          || translate('react.default.errors.error.label', 'An error occurred'));
      });
  }, [requisitionId]);

  if (error) {
    return <div className="alert alert-danger m-3" role="alert">{error}</div>;
  }

  if (!data) {
    return null;
  }

  const renderItemsTable = (items, testId) => (
    <table className="table table-sm table-bordered" data-testid={testId}>
      <thead>
        <tr>
          <th>#</th>
          {data.hasPackLevel1 && <th>{translate('react.deliveryNote.packLevel1.label', 'Pack level 1')}</th>}
          {data.hasPackLevel2 && <th>{translate('react.deliveryNote.packLevel2.label', 'Pack level 2')}</th>}
          <th>{translate('react.deliveryNote.productCode.label', 'Code')}</th>
          <th>{translate('react.deliveryNote.product.label', 'Product')}</th>
          <th className="text-right">{translate('react.deliveryNote.totalRequested.label', 'Total Requested')}</th>
          <th className="text-right">{translate('react.deliveryNote.totalDelivered.label', 'Total Delivered')}</th>
          <th>{translate('react.deliveryNote.lotNumber.label', 'Lot')}</th>
          <th>{translate('react.deliveryNote.expirationDate.label', 'Expires')}</th>
          <th className="text-right">{translate('react.deliveryNote.splitQuantity.label', 'Split Quantity')}</th>
          <th>{translate('react.deliveryNote.reasonCode.label', 'Reason code')}</th>
          <th>{translate('react.deliveryNote.received.label', 'Received')}</th>
          <th>{translate('react.deliveryNote.comment.label', 'Comment')}</th>
        </tr>
      </thead>
      <tbody>
        {!items.length && (
          <tr>
            <td
              colSpan={11 + (data.hasPackLevel1 ? 1 : 0) + (data.hasPackLevel2 ? 1 : 0)}
              className="text-center text-muted"
            >
              {translate('react.default.none.label', 'None')}
            </td>
          </tr>
        )}
        {items.map((item, itemIndex) => {
          const rows = item.rows?.length ? item.rows : [{}];
          return rows.map((row, rowIndex) => (
            // eslint-disable-next-line react/no-array-index-key
            <tr key={`${item.id}-${rowIndex}`}>
              {rowIndex === 0 && (
                <td rowSpan={rows.length} className="align-middle text-center">{itemIndex + 1}</td>
              )}
              {data.hasPackLevel1 && <td className="text-center">{row.packLevel1}</td>}
              {data.hasPackLevel2 && <td className="text-center">{row.packLevel2}</td>}
              {rowIndex === 0 && (
                <>
                  <td rowSpan={rows.length} className="align-middle text-center">
                    {item.parentItem?.isSubstituted && (
                      <div className="text-muted"><del>{item.parentItem.productCode}</del></div>
                    )}
                    {item.product?.productCode}
                  </td>
                  <td rowSpan={rows.length} className="align-middle">
                    {item.parentItem?.isSubstituted && (
                      <div className="text-muted"><del>{item.parentItem.productName}</del></div>
                    )}
                    {item.product?.name}
                  </td>
                  <td rowSpan={rows.length} className="align-middle text-right">
                    {item.parentItem?.isChanged
                      ? `${item.parentItem.quantity} ${item.parentItem.unitOfMeasure}`
                      : `${item.quantity} ${item.product?.unitOfMeasure}`}
                  </td>
                  <td rowSpan={rows.length} className="align-middle text-right">
                    {`${item.totalQuantityPicked} ${item.product?.unitOfMeasure}`}
                  </td>
                </>
              )}
              <td className="text-center">{row.lotNumber}</td>
              <td className="text-center">{row.expirationDate}</td>
              <td className="text-right">
                {row.splitQuantity != null ? `${row.splitQuantity} ${item.product?.unitOfMeasure}` : ''}
              </td>
              {rowIndex === 0 && (
                <td rowSpan={rows.length} className="align-middle">
                  {item.parentItem?.cancelReasonCode && (
                    <div>
                      {item.parentItem.isSubstituted
                        && <span>{translate('react.deliveryNote.substituted.label', 'Substituted')}</span>}
                      {item.parentItem.isChanged && !item.parentItem.isSubstituted
                        && <span>{translate('react.deliveryNote.modified.label', 'Modified')}</span>}
                      <i>
                        {' '}
                        {item.parentItem.cancelReasonCode}
                      </i>
                      {item.parentItem.cancelComments && (
                        <blockquote>{item.parentItem.cancelComments}</blockquote>
                      )}
                    </div>
                  )}
                  {item.cancelReasonCode && (
                    <div>
                      {item.isCanceled && <span>{translate('react.deliveryNote.canceled.label', 'Canceled')}</span>}
                      <i>
                        {' '}
                        {item.cancelReasonCode}
                      </i>
                      {item.cancelComments && <blockquote>{item.cancelComments}</blockquote>}
                    </div>
                  )}
                  {item.pickReasonCode && <div>{item.pickReasonCode}</div>}
                </td>
              )}
              <td>{row.quantityReceived || ''}</td>
              <td>{row.comments}</td>
            </tr>
          ));
        })}
      </tbody>
    </table>
  );

  return (
    <div className="delivery-note-print m-3" data-testid="delivery-note-print">
      <div className="d-flex mb-3 d-print-none">
        <button type="button" className="btn btn-primary mr-2" onClick={() => window.print()}>
          <Translate id="react.default.button.print.label" defaultMessage="Print" />
        </button>
        <button type="button" className="btn btn-outline-secondary" onClick={() => window.close()}>
          <Translate id="react.default.button.close.label" defaultMessage="Close" />
        </button>
      </div>
      <div className="d-flex justify-content-between align-items-start mb-3">
        <div>
          <h2 className="mb-1">
            <Translate id="react.deliveryNote.label" defaultMessage="Delivery Note" />
          </h2>
          <div>
            {data.requestNumber}
            {' '}
            {data.name}
          </div>
          {data.requestNumber && (
            <img src={BARCODE_URL.render(data.requestNumber)} alt={data.requestNumber} />
          )}
        </div>
        <table className="table table-sm table-borderless w-auto" data-testid="delivery-note-header">
          <tbody>
            <tr>
              <th>{translate('react.deliveryNote.origin.label', 'Origin')}</th>
              <td>{data.origin?.name}</td>
            </tr>
            <tr>
              <th>{translate('react.deliveryNote.destination.label', 'Destination')}</th>
              <td>{data.destination?.name}</td>
            </tr>
            {data.requestedBy && (
              <tr>
                <th>{translate('react.deliveryNote.requestedBy.label', 'Requested by')}</th>
                <td>{data.requestedBy}</td>
              </tr>
            )}
            {data.dateRequested && (
              <tr>
                <th>{translate('react.deliveryNote.dateRequested.label', 'Date requested')}</th>
                <td>{data.dateRequested}</td>
              </tr>
            )}
            {data.shipDate && (
              <tr>
                <th>{translate('react.deliveryNote.shipDate.label', 'Ship date')}</th>
                <td>{data.shipDate}</td>
              </tr>
            )}
            {data.receivedDate && (
              <tr>
                <th>{translate('react.deliveryNote.receivedDate.label', 'Received date')}</th>
                <td>{data.receivedDate}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {(data.origin?.address || data.destination?.address) && (
        <div className="d-flex justify-content-between mb-3" data-testid="delivery-note-addresses">
          <div>
            <h5><Translate id="react.deliveryNote.receivedFrom.label" defaultMessage="Received From" /></h5>
            <Address location={data.origin} />
          </div>
          <div>
            <h5><Translate id="react.deliveryNote.deliveredTo.label" defaultMessage="Delivered To" /></h5>
            <Address location={data.destination} />
          </div>
        </div>
      )}
      {GROUPS.map((group) => {
        const items = (data.requisitionItems ?? []).filter((item) => item.group === group.key);
        if (!items.length) {
          return null;
        }
        return (
          <div key={group.key}>
            <h4>{translate(group.label, group.defaultLabel)}</h4>
            {renderItemsTable(items, `delivery-note-items-${group.key}`)}
          </div>
        );
      })}
      {(data.canceledItems ?? []).length > 0 && (
        <div>
          <h4><Translate id="react.deliveryNote.canceledItems.label" defaultMessage="Canceled Items" /></h4>
          {renderItemsTable(data.canceledItems, 'delivery-note-items-canceled')}
        </div>
      )}
      <div className="mt-4" data-testid="delivery-note-notes">
        <h5><Translate id="react.deliveryNote.notes.label" defaultMessage="Notes" /></h5>
        <div>
          {translate('react.deliveryNote.trackingNumber.label', 'Tracking number')}
          {': '}
          {data.notes?.trackingNumber}
        </div>
        <div>
          {translate('react.deliveryNote.driverName.label', 'Driver name')}
          {': '}
          {data.notes?.driverName}
        </div>
        <div>
          {translate('react.deliveryNote.comments.label', 'Comments')}
          {': '}
          {data.notes?.comments}
        </div>
      </div>
      <table className="table table-sm table-bordered mt-4" data-testid="delivery-note-signatures">
        <tbody>
          {SIGNATURE_ROWS.map((signatureRow) => (
            <tr key={signatureRow.key}>
              <td width="33%">{translate(signatureRow.label, signatureRow.defaultLabel)}</td>
              <td width="33%" className="text-center">
                {translate('react.deliveryNote.signature.label', 'Signature')}
              </td>
              <td width="33%" className="text-right">
                {translate('react.deliveryNote.date.label', 'Date')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DeliveryNotePrint;
