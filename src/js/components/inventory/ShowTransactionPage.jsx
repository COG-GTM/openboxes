import React, { useEffect, useMemo, useState } from 'react';

import PropTypes from 'prop-types';
import { getTranslate } from 'react-localize-redux';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';

import { TRANSACTION_BY_ID } from 'api/urls';
import DataTable from 'components/DataTable';
import { CONTEXT_PATH, INVENTORY_ITEM_URL, INVENTORY_URL } from 'consts/applicationUrls';
import useTranslation from 'hooks/useTranslation';
import apiClient from 'utils/apiClient';
import Translate, { translateWithDefaultMessage } from 'utils/Translate';
import PageWrapper from 'wrappers/PageWrapper';

import 'components/inventory/styles.scss';

const DetailRow = ({ label, children }) => (
  <tr>
    <td className="font-weight-bold pr-3 align-top text-nowrap">{label}</td>
    <td>{children}</td>
  </tr>
);

DetailRow.propTypes = {
  label: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};

const ShowTransactionPage = () => {
  useTranslation('inventory', 'reactTable');

  const { id } = useParams();
  const [transaction, setTransaction] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  const { translate } = useSelector((state) => ({
    translate: translateWithDefaultMessage(getTranslate(state.localize)),
  }));

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    setTransaction(null);
    apiClient.get(TRANSACTION_BY_ID(id))
      .then((response) => setTransaction(response.data.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  const columns = useMemo(() => [
    {
      Header: <Translate id="react.inventory.productCode.label" defaultMessage="Code" />,
      accessor: 'product.productCode',
      maxWidth: 100,
    },
    {
      Header: <Translate id="react.inventory.product.label" defaultMessage="Product" />,
      accessor: 'product.name',
      minWidth: 220,
      Cell: (row) => (
        <a href={INVENTORY_ITEM_URL.showStockCard(row.original.product.id)}>
          {row.value}
        </a>
      ),
    },
    {
      Header: <Translate id="react.inventory.lotNumber.label" defaultMessage="Lot number" />,
      accessor: 'inventoryItem.lotNumber',
    },
    {
      Header: <Translate id="react.inventory.expirationDate.label" defaultMessage="Expiration date" />,
      accessor: 'inventoryItem.expirationDate',
    },
    {
      Header: <Translate id="react.inventory.binLocation.label" defaultMessage="Bin location" />,
      accessor: 'binLocation.name',
    },
    {
      Header: <Translate id="react.inventory.quantity.label" defaultMessage="Quantity" />,
      accessor: 'quantity',
      className: 'text-right',
      maxWidth: 100,
    },
  ], []);

  if (notFound) {
    return (
      <PageWrapper className="inventory-list-page">
        <div className="alert alert-danger m-3" role="alert">
          <Translate id="react.inventory.showTransaction.notFound.label" defaultMessage="No transaction found with the given ID" />
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper className="inventory-list-page">
      <div className="list-page-header p-3 d-flex align-items-center justify-content-between">
        <h5 className="m-0">
          <Translate id="react.inventory.showTransaction.title.label" defaultMessage="View transaction" />
          {transaction?.transactionNumber && ` — ${transaction.transactionNumber}`}
        </h5>
      </div>
      {transaction && (
        <div className="d-flex flex-wrap p-3">
          <div className="mr-5 mb-3">
            <h6>
              <Translate id="react.inventory.showTransaction.details.label" defaultMessage="Transaction details" />
            </h6>
            <table>
              <tbody>
                <DetailRow label={translate('react.inventory.transactions.transactionNumber.label', 'Transaction number')}>
                  {transaction.transactionNumber || (
                    <span className="text-muted">
                      <Translate id="react.inventory.transaction.new.label" defaultMessage="New transaction" />
                    </span>
                  )}
                </DetailRow>
                <DetailRow label={translate('react.inventory.transactions.type.label', 'Transaction type')}>
                  {transaction.transactionType?.name}
                </DetailRow>
                {transaction.source && (
                  <DetailRow label={translate('react.inventory.transactions.source.label', 'Source')}>
                    {transaction.source.name}
                  </DetailRow>
                )}
                {transaction.destination && (
                  <DetailRow label={translate('react.inventory.transactions.destination.label', 'Destination')}>
                    {transaction.destination.name}
                  </DetailRow>
                )}
                <DetailRow label={translate('react.inventory.transactions.inventory.label', 'Inventory')}>
                  {transaction.inventory?.name}
                </DetailRow>
                {transaction.outgoingShipment && (
                  <DetailRow label={translate('react.inventory.transactions.shipment.label', 'Shipment')}>
                    <a href={`${CONTEXT_PATH}/shipment/showDetails/${transaction.outgoingShipment.id}`}>
                      {transaction.outgoingShipment.shipmentNumber}
                    </a>
                  </DetailRow>
                )}
                {transaction.incomingShipment && (
                  <DetailRow label={translate('react.inventory.transactions.shipment.label', 'Shipment')}>
                    <a href={`${CONTEXT_PATH}/shipment/showDetails/${transaction.incomingShipment.id}`}>
                      {transaction.incomingShipment.shipmentNumber}
                    </a>
                  </DetailRow>
                )}
                {transaction.receipt && (
                  <DetailRow label={translate('react.inventory.transactions.receipt.label', 'Receipt')}>
                    <a href={`${CONTEXT_PATH}/receipt/show/${transaction.receipt.id}`}>
                      {transaction.receipt.receiptNumber}
                    </a>
                  </DetailRow>
                )}
                {transaction.order && (
                  <DetailRow label={translate('react.inventory.transactions.order.label', 'Order')}>
                    <a href={`${CONTEXT_PATH}/order/show/${transaction.order.id}`}>
                      {transaction.order.name}
                    </a>
                  </DetailRow>
                )}
                <DetailRow label={translate('react.inventory.transactions.date.label', 'Date')}>
                  {transaction.transactionDate}
                </DetailRow>
                <DetailRow label={translate('react.inventory.transactions.createdBy.label', 'Created by')}>
                  {transaction.createdBy?.name || translate('react.default.nobody.label', 'Nobody')}
                </DetailRow>
                <DetailRow label={translate('react.inventory.transactions.updatedBy.label', 'Updated by')}>
                  {transaction.updatedBy?.name || translate('react.default.none.label', 'None')}
                </DetailRow>
                <DetailRow label={translate('react.inventory.transactions.dateCreated.label', 'Date created')}>
                  {transaction.dateCreated}
                </DetailRow>
                <DetailRow label={translate('react.inventory.transactions.lastUpdated.label', 'Last updated')}>
                  {transaction.lastUpdated}
                </DetailRow>
                <DetailRow label={translate('react.inventory.transactions.localTransfer.label', 'Local transfer')}>
                  {transaction.localTransfer
                    ? translate('react.default.yes.label', 'yes')
                    : translate('react.default.no.label', 'no')}
                </DetailRow>
                {transaction.localTransfer?.sourceTransaction
                  && transaction.localTransfer.sourceTransaction.id !== transaction.id && (
                  <DetailRow label={translate('react.inventory.transactions.sourceTransaction.label', 'Source transaction')}>
                    <a
                      href={INVENTORY_URL
                        .showTransaction(transaction.localTransfer.sourceTransaction.id)}
                    >
                      {transaction.localTransfer.sourceTransaction.transactionNumber
                        || transaction.localTransfer.sourceTransaction.id}
                    </a>
                  </DetailRow>
                )}
                {transaction.localTransfer?.destinationTransaction
                  && transaction.localTransfer.destinationTransaction.id !== transaction.id && (
                  <DetailRow label={translate('react.inventory.transactions.destinationTransaction.label', 'Destination transaction')}>
                    <a
                      href={INVENTORY_URL
                        .showTransaction(transaction.localTransfer.destinationTransaction.id)}
                    >
                      {transaction.localTransfer.destinationTransaction.transactionNumber
                        || transaction.localTransfer.destinationTransaction.id}
                    </a>
                  </DetailRow>
                )}
                {transaction.comment && (
                  <DetailRow label={translate('react.inventory.transactions.comment.label', 'Comment')}>
                    {transaction.comment}
                  </DetailRow>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex-grow-1">
            <h6>
              <Translate id="react.inventory.showTransaction.entries.label" defaultMessage="Transaction entries" />
            </h6>
            <DataTable
              data={transaction.transactionEntries || []}
              columns={columns}
              loading={loading}
              defaultPageSize={100}
              totalData={(transaction.transactionEntries || []).length}
              noDataText={translate('react.inventory.showTransaction.noEntries.label', 'No transaction entries')}
            />
          </div>
        </div>
      )}
    </PageWrapper>
  );
};

export default ShowTransactionPage;
