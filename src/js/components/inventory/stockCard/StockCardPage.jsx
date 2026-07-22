import React, {
  useEffect, useMemo, useRef, useState,
} from 'react';

import { getTranslate } from 'react-localize-redux';
import { useSelector } from 'react-redux';

import {
  AVAILABLE_ITEMS,
  STOCK_CARD_ALL_LOCATIONS,
  STOCK_CARD_ASSOCIATIONS,
  STOCK_CARD_DEMAND,
  STOCK_CARD_DOCUMENTS,
  STOCK_CARD_PENDING_INBOUND,
  STOCK_CARD_PENDING_OUTBOUND,
  STOCK_CARD_STOCK_HISTORY,
  STOCK_CARD_SUPPLIERS,
} from 'api/urls';
import DataTable from 'components/DataTable';
import StockCardHeader from 'components/inventory/stockCard/StockCardHeader';
import useProductId from 'components/inventory/stockCard/useProductId';
import { INVENTORY_ITEM_URL } from 'consts/applicationUrls';
import useTranslation from 'hooks/useTranslation';
import apiClient from 'utils/apiClient';
import Translate, { translateWithDefaultMessage } from 'utils/Translate';
import PageWrapper from 'wrappers/PageWrapper';

import 'components/inventory/styles.scss';

const TABS = [
  { key: 'currentStock', label: { id: 'react.stockCard.tab.currentStock.label', defaultMessage: 'Current Stock' } },
  { key: 'allLocations', label: { id: 'react.stockCard.tab.allLocations.label', defaultMessage: 'All Locations' } },
  { key: 'stockHistory', label: { id: 'react.stockCard.tab.stockHistory.label', defaultMessage: 'Stock History' } },
  { key: 'pendingInbound', label: { id: 'react.stockCard.tab.pendingInbound.label', defaultMessage: 'Pending Inbound' } },
  { key: 'pendingOutbound', label: { id: 'react.stockCard.tab.pendingOutbound.label', defaultMessage: 'Pending Outbound' } },
  { key: 'demand', label: { id: 'react.stockCard.tab.demand.label', defaultMessage: 'Demand' } },
  { key: 'suppliers', label: { id: 'react.stockCard.tab.suppliers.label', defaultMessage: 'Suppliers' } },
  { key: 'associations', label: { id: 'react.stockCard.tab.associations.label', defaultMessage: 'Associated Products' } },
  { key: 'documents', label: { id: 'react.stockCard.tab.documents.label', defaultMessage: 'Documents' } },
];

const TAB_URLS = {
  allLocations: STOCK_CARD_ALL_LOCATIONS,
  stockHistory: STOCK_CARD_STOCK_HISTORY,
  pendingInbound: STOCK_CARD_PENDING_INBOUND,
  pendingOutbound: STOCK_CARD_PENDING_OUTBOUND,
  demand: STOCK_CARD_DEMAND,
  suppliers: STOCK_CARD_SUPPLIERS,
  associations: STOCK_CARD_ASSOCIATIONS,
  documents: STOCK_CARD_DOCUMENTS,
};

const StockCardPage = () => {
  useTranslation('stockCard', 'inventory', 'reactTable');

  const productId = useProductId();
  const [activeTab, setActiveTab] = useState('currentStock');
  const [tabData, setTabData] = useState({});
  const [loadingTabs, setLoadingTabs] = useState({});

  const { currentLocation, translate } = useSelector((state) => ({
    currentLocation: state.session.currentLocation,
    translate: translateWithDefaultMessage(getTranslate(state.localize)),
  }));

  const fetchedLocationId = useRef(currentLocation?.id);

  useEffect(() => {
    if (!productId) {
      return;
    }
    // Tab data is cached per location, so drop the cache when the location changes
    let cachedTabData = tabData;
    if (fetchedLocationId.current !== currentLocation?.id) {
      fetchedLocationId.current = currentLocation?.id;
      cachedTabData = {};
      setTabData({});
    }
    if (cachedTabData[activeTab]) {
      return;
    }
    const fetchedTab = activeTab;
    setLoadingTabs((prev) => ({ ...prev, [fetchedTab]: true }));
    const request = fetchedTab === 'currentStock'
      ? apiClient.get(AVAILABLE_ITEMS, { params: { 'product.id': productId, 'location.id': currentLocation?.id } })
      : apiClient.get(TAB_URLS[fetchedTab](productId));
    request
      .then((response) => {
        setTabData((prev) => ({ ...prev, [fetchedTab]: response.data.data }));
      })
      .finally(() => setLoadingTabs((prev) => ({ ...prev, [fetchedTab]: false })));
  }, [productId, activeTab, currentLocation?.id]);

  const data = tabData[activeTab];
  const loading = Boolean(loadingTabs[activeTab]);

  const currentStockColumns = useMemo(() => [
    {
      Header: <Translate id="react.stockCard.binLocation.label" defaultMessage="Bin Location" />, id: 'binLocation', accessor: (row) => row['binLocation.name'], Cell: (row) => <span>{row.value || translate('react.stockCard.default.label', 'Default')}</span>,
    },
    { Header: <Translate id="react.stockCard.lotNumber.label" defaultMessage="Lot Number" />, accessor: 'lotNumber' },
    { Header: <Translate id="react.stockCard.expirationDate.label" defaultMessage="Expiration Date" />, accessor: 'expirationDate' },
    { Header: <Translate id="react.stockCard.status.label" defaultMessage="Status" />, accessor: 'status' },
    { Header: <Translate id="react.stockCard.quantityOnHand.label" defaultMessage="Quantity on Hand" />, accessor: 'quantityOnHand', className: 'text-right' },
    { Header: <Translate id="react.stockCard.quantityAvailable.label" defaultMessage="Quantity Available" />, accessor: 'quantityAvailable', className: 'text-right' },
  ], [translate]);

  const stockHistoryColumns = useMemo(() => [
    { Header: <Translate id="react.stockCard.date.label" defaultMessage="Date" />, accessor: 'transaction.transactionDate' },
    { Header: <Translate id="react.stockCard.transaction.label" defaultMessage="Transaction" />, accessor: 'transaction.transactionType' },
    { Header: <Translate id="react.stockCard.reference.label" defaultMessage="Reference" />, accessor: 'transaction.transactionNumber', Cell: (row) => <span>{row.original.shipment?.shipmentNumber || row.original.requisition?.requestNumber || row.original.order?.orderNumber || row.value}</span> },
    { Header: <Translate id="react.stockCard.binLocation.label" defaultMessage="Bin Location" />, accessor: 'binLocation' },
    { Header: <Translate id="react.stockCard.lotNumber.label" defaultMessage="Lot Number" />, accessor: 'lotNumber' },
    {
      Header: <Translate id="react.stockCard.debit.label" defaultMessage="Debit" />, accessor: 'quantity', id: 'debit', className: 'text-right', Cell: (row) => <span>{row.original.isDebit ? row.original.quantity : ''}</span>,
    },
    {
      Header: <Translate id="react.stockCard.credit.label" defaultMessage="Credit" />, accessor: 'quantity', id: 'credit', className: 'text-right', Cell: (row) => <span>{row.original.isCredit ? row.original.quantity : ''}</span>,
    },
    { Header: <Translate id="react.stockCard.balance.label" defaultMessage="Balance" />, accessor: 'balance', className: 'text-right' },
  ], []);

  const pendingInboundColumns = useMemo(() => [
    { Header: <Translate id="react.stockCard.type.label" defaultMessage="Type" />, accessor: 'type' },
    { Header: <Translate id="react.stockCard.number.label" defaultMessage="Number" />, accessor: 'number' },
    { Header: <Translate id="react.stockCard.description.label" defaultMessage="Description" />, accessor: 'description' },
    { Header: <Translate id="react.stockCard.origin.label" defaultMessage="Origin" />, accessor: 'origin' },
    { Header: <Translate id="react.stockCard.status.label" defaultMessage="Status" />, accessor: 'status' },
    { Header: <Translate id="react.stockCard.orderDate.label" defaultMessage="Order Date" />, accessor: 'orderDate' },
    { Header: <Translate id="react.stockCard.shipDate.label" defaultMessage="Ship Date" />, accessor: 'shipDate' },
    { Header: <Translate id="react.stockCard.quantityPurchasedNotShipped.label" defaultMessage="Purchased (Not Shipped)" />, accessor: 'quantityPurchased', className: 'text-right' },
    { Header: <Translate id="react.stockCard.quantityShippedNotReceived.label" defaultMessage="Shipped (Not Received)" />, accessor: 'quantityRemaining', className: 'text-right' },
  ], []);

  const pendingOutboundColumns = useMemo(() => [
    { Header: <Translate id="react.stockCard.dateRequested.label" defaultMessage="Date Requested" />, accessor: 'dateRequested' },
    { Header: <Translate id="react.stockCard.status.label" defaultMessage="Status" />, accessor: 'status' },
    { Header: <Translate id="react.stockCard.number.label" defaultMessage="Number" />, accessor: 'requestNumber' },
    { Header: <Translate id="react.stockCard.description.label" defaultMessage="Description" />, accessor: 'name' },
    { Header: <Translate id="react.stockCard.destination.label" defaultMessage="Destination" />, accessor: 'destination' },
    { Header: <Translate id="react.stockCard.quantityRequested.label" defaultMessage="Requested" />, accessor: 'quantityRequested', className: 'text-right' },
    { Header: <Translate id="react.stockCard.quantityRequired.label" defaultMessage="Required" />, accessor: 'quantityRequired', className: 'text-right' },
    {
      Header: <Translate id="react.stockCard.quantityPicked.label" defaultMessage="Picked" />, accessor: 'picklistItemsByLot', id: 'quantityPicked', className: 'text-right', Cell: (row) => <span>{(row.value || []).map((it) => `${it.lotNumber || ''}: ${it.quantity}`).join(', ')}</span>,
    },
  ], []);

  const demandColumns = useMemo(() => [
    { Header: <Translate id="react.stockCard.status.label" defaultMessage="Status" />, accessor: 'status' },
    { Header: <Translate id="react.stockCard.number.label" defaultMessage="Number" />, accessor: 'requestNumber' },
    { Header: <Translate id="react.stockCard.destination.label" defaultMessage="Destination" />, accessor: 'destination' },
    { Header: <Translate id="react.stockCard.dateRequested.label" defaultMessage="Date Requested" />, accessor: 'dateRequested' },
    { Header: <Translate id="react.stockCard.dateIssued.label" defaultMessage="Date Issued" />, accessor: 'dateIssued' },
    { Header: <Translate id="react.stockCard.quantityRequested.label" defaultMessage="Requested" />, accessor: 'quantityRequested', className: 'text-right' },
    { Header: <Translate id="react.stockCard.quantityIssued.label" defaultMessage="Issued" />, accessor: 'quantityIssued', className: 'text-right' },
    { Header: <Translate id="react.stockCard.quantityDemand.label" defaultMessage="Demand" />, accessor: 'quantityDemand', className: 'text-right' },
    { Header: <Translate id="react.stockCard.reasonCode.label" defaultMessage="Reason Code" />, accessor: 'reasonCode' },
  ], []);

  const suppliersColumns = useMemo(() => [
    { Header: <Translate id="react.stockCard.sourceCode.label" defaultMessage="Source Code" />, accessor: 'code' },
    { Header: <Translate id="react.stockCard.sourceName.label" defaultMessage="Source Name" />, accessor: 'name' },
    { Header: <Translate id="react.stockCard.supplier.label" defaultMessage="Supplier" />, accessor: 'supplier' },
    { Header: <Translate id="react.stockCard.supplierCode.label" defaultMessage="Supplier Code" />, accessor: 'supplierCode' },
    { Header: <Translate id="react.stockCard.manufacturer.label" defaultMessage="Manufacturer" />, accessor: 'manufacturer' },
    { Header: <Translate id="react.stockCard.manufacturerCode.label" defaultMessage="Manufacturer Code" />, accessor: 'manufacturerCode' },
    { Header: <Translate id="react.stockCard.preferenceType.label" defaultMessage="Preference Type" />, accessor: 'preferenceType' },
    { Header: <Translate id="react.stockCard.packageSize.label" defaultMessage="Package Size" />, accessor: 'packageSize', className: 'text-right' },
    { Header: <Translate id="react.stockCard.packagePrice.label" defaultMessage="Package Price" />, accessor: 'packagePrice', className: 'text-right' },
    { Header: <Translate id="react.stockCard.eachPrice.label" defaultMessage="Each Price" />, accessor: 'eachPrice', className: 'text-right' },
  ], []);

  const associationsColumns = useMemo(() => [
    { Header: <Translate id="react.stockCard.type.label" defaultMessage="Type" />, accessor: 'type' },
    { Header: <Translate id="react.stockCard.productCode.label" defaultMessage="Code" />, accessor: 'product.productCode' },
    {
      Header: <Translate id="react.stockCard.product.label" defaultMessage="Product" />,
      accessor: 'product.name',
      Cell: (row) => (
        <a href={INVENTORY_ITEM_URL.showStockCard(row.original.product?.id)}>{row.value}</a>
      ),
    },
    { Header: <Translate id="react.stockCard.quantityAvailable.label" defaultMessage="Quantity Available" />, accessor: 'quantityAvailable', className: 'text-right' },
    { Header: <Translate id="react.stockCard.comments.label" defaultMessage="Comments" />, accessor: 'comments' },
  ], []);

  const documentsColumns = useMemo(() => [
    { Header: <Translate id="react.stockCard.documentType.label" defaultMessage="Type" />, accessor: 'documentType' },
    { Header: <Translate id="react.stockCard.name.label" defaultMessage="Name" />, accessor: 'name' },
    { Header: <Translate id="react.stockCard.filename.label" defaultMessage="Filename" />, accessor: 'filename' },
    { Header: <Translate id="react.stockCard.contentType.label" defaultMessage="Content Type" />, accessor: 'contentType' },
  ], []);

  const renderTable = (columns, rows) => (
    <DataTable
      data={rows || []}
      columns={columns}
      loading={loading}
      sortable
      defaultPageSize={20}
      totalData={(rows || []).length}
      noDataText={translate('react.stockCard.empty.label', 'No data found')}
    />
  );

  const renderAllLocations = () => (
    <div className="p-3">
      {(data || []).map((group) => (
        <div key={group.locationGroup || 'no-group'} className="mb-3">
          <h6>{group.locationGroup || translate('react.stockCard.noLocationGroup.label', 'No location group')}</h6>
          <table className="table table-sm">
            <thead>
              <tr>
                <th>{translate('react.stockCard.location.label', 'Location')}</th>
                <th className="text-right">{translate('react.stockCard.quantityOnHand.label', 'Quantity on Hand')}</th>
                <th className="text-right">{translate('react.stockCard.value.label', 'Value')}</th>
              </tr>
            </thead>
            <tbody>
              {group.locations.map((row) => (
                <tr key={row.location}>
                  <td>{row.location}</td>
                  <td className="text-right">{row.quantity}</td>
                  <td className="text-right">{row.value != null ? Number(row.value).toFixed(2) : ''}</td>
                </tr>
              ))}
              <tr>
                <td><strong><Translate id="react.stockCard.total.label" defaultMessage="Total" /></strong></td>
                <td className="text-right"><strong>{group.totalQuantity}</strong></td>
                <td className="text-right"><strong>{group.totalValue != null ? Number(group.totalValue).toFixed(2) : ''}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
      ))}
      {!loading && (!data || !data.length) && (
        <Translate id="react.stockCard.empty.label" defaultMessage="No data found" />
      )}
    </div>
  );

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'currentStock':
        return renderTable(currentStockColumns, data);
      case 'allLocations':
        return renderAllLocations();
      case 'stockHistory':
        return renderTable(stockHistoryColumns, data?.rows);
      case 'pendingInbound':
        return renderTable(pendingInboundColumns, data?.rows);
      case 'pendingOutbound':
        return renderTable(pendingOutboundColumns, data?.rows);
      case 'demand':
        return renderTable(demandColumns, data?.rows);
      case 'suppliers':
        return renderTable(suppliersColumns, data?.rows);
      case 'associations':
        return renderTable(associationsColumns, data?.rows);
      case 'documents':
        return renderTable(documentsColumns, data);
      default:
        return null;
    }
  };

  return (
    <PageWrapper className="stock-card-page">
      <StockCardHeader productId={productId} activeScreen="stockCard" />
      <div className="tabs d-flex align-items-center px-3 pt-2">
        {TABS.map((tab) => (
          <span
            key={tab.key}
            className={activeTab === tab.key ? 'active-tab' : ''}
            onClick={() => setActiveTab(tab.key)}
            role="button"
            tabIndex={0}
            onKeyDown={() => setActiveTab(tab.key)}
          >
            <Translate id={tab.label.id} defaultMessage={tab.label.defaultMessage} />
          </span>
        ))}
      </div>
      {renderActiveTab()}
    </PageWrapper>
  );
};

export default StockCardPage;
