import React, { useMemo } from 'react';

import queryString from 'query-string';
import Loadable from 'react-loadable';
import { useSelector } from 'react-redux';
import {
  BrowserRouter, Redirect, Route, Switch,
} from 'react-router-dom';
import Alert from 'react-s-alert';
import { ClimbingBoxLoader } from 'react-spinners';
import {
  getCurrentLocationSupportedActivities,
  getNotificationAutohideDelay,
  getSpinner,
} from 'selectors';

import CustomAlert from 'components/dashboard/CustomAlert';
import MainLayoutRoute from 'components/Layout/v2/MainLayoutRoute';
import Loading from 'components/Loading';
import ActivityCode from 'consts/activityCode';
import { DASHBOARD_URL } from 'consts/applicationUrls';
import useConnectionListener from 'hooks/useConnectionListener';
import FlashScopeListenerWrapper from 'wrappers/FlashScopeListenerWrapper';

import 'react-s-alert/dist/s-alert-default.css';
import 'react-s-alert/dist/s-alert-css-effects/bouncyflip.css';

// TODO: Fix entering Inbound SM from list

const AsyncStockMovement = Loadable({
  loader: () => import('components/stock-movement-wizard/StockMovement'),
  loading: Loading,
});

const AsyncStockMovementInbound = Loadable({
  loader: () => import('components/stock-movement-wizard/inboundV2/Inbound'),
  loading: Loading,
});

const AsyncStockMovementCombinedShipments = Loadable({
  loader: () => import('components/stock-movement-wizard/StockMovementCombinedShipments'),
  loading: Loading,
});

const AsyncStockMovementRequest = Loadable({
  loader: () => import('components/stock-movement-wizard/StockMovementRequest'),
  loading: Loading,
});

const AsyncStockMovementVerifyRequest = Loadable({
  loader: () => import('components/stock-movement-wizard/StockMovementVerifyRequest'),
  loading: Loading,
});

const AsyncReceivingPage = Loadable({
  loader: () => import('components/receiving/ReceivingPage'),
  loading: Loading,
});

const AsyncPutAwayMainPage = Loadable({
  loader: () => import('components/put-away/PutAwayMainPage'),
  loading: Loading,
});

const AsyncManagement = Loadable({
  loader: () => import('components/stock-list-management/StocklistManagement'),
  loading: Loading,
});

const AsyncDashboard = Loadable({
  loader: () => import('components/dashboard/Dashboard'),
  loading: Loading,
});

const AsyncStockRequestDashboard = Loadable({
  loader: () => import('components/dashboard/StockRequestDashboard'),
  loading: Loading,
});

// TODO add megamenu and menu config
const AsyncInvoice = Loadable({
  loader: () => import('components/invoice/create/InvoiceWizard'),
  loading: Loading,
});

const AsyncInvoiceList = Loadable({
  loader: () => import('components/invoice/list/InvoiceList'),
  loading: Loading,
});

const AsyncStockTransfer = Loadable({
  loader: () => import('components/stock-transfer/StockTransferWizard'),
  loading: Loading,
});

const AsyncOutboundReturns = Loadable({
  loader: () => import('components/returns/outbound/OutboundReturnsWizard'),
  loading: Loading,
});

const AsyncInboundReturns = Loadable({
  loader: () => import('components/returns/inbound/InboundReturnsWizard'),
  loading: Loading,
});

const AsyncReplenishment = Loadable({
  loader: () => import('components/replenishment/ReplenishmentWizard'),
  loading: Loading,
});

const AsyncProductsConfiguration = Loadable({
  loader: () => import('components/products-configuration/ProductsConfigurationWizard'),
  loading: Loading,
});

const AsyncLocationsConfiguration = Loadable({
  loader: () => import('components/locations-configuration/LocationsConfigurationWizard'),
  loading: Loading,
});

const AsyncImportLocations = Loadable({
  loader: () => import('components/locations-configuration/ImportLocations'),
  loading: Loading,
});

const AsyncWelcomePage = Loadable({
  loader: () => import('components/locations-configuration/WelcomePage'),
  loading: Loading,
});

const AsyncLoadDataPage = Loadable({
  loader: () => import('components/load-demo-data/LoadDemoDataPage'),
  loading: Loading,
});

const AsyncResetInstancePage = Loadable({
  loader: () => import('components/reset-instance/ResettingInstanceInfoPage'),
  loading: Loading,
});

const AsyncPurchaseOrderList = Loadable({
  loader: () => import('components/purchaseOrder/PurchaseOrderList'),
  loading: Loading,
});

const AsyncStockList = Loadable({
  loader: () => import('components/stock-list/StockList'),
  loading: Loading,
});

const AsyncProductsList = Loadable({
  loader: () => import('components/products/ProductsList'),
  loading: Loading,
});

const AsyncStockMovementInboundList = Loadable({
  loader: () => import('components/stock-movement/inbound/StockMovementInboundList'),
  loading: Loading,
});

const AsyncStockMovementOutboundList = Loadable({
  loader: () => import('components/stock-movement/outbound/StockMovementOutboundList'),
  loading: Loading,
});

const AsyncProductSupplierList = Loadable({
  loader: () => import('components/productSupplier/ProductSupplierList'),
  loading: Loading,
});

const AsyncProductSupplierShow = Loadable({
  loader: () => import('components/productSupplier/show/ProductSupplierShow'),
  loading: Loading,
});

const AsyncProductGroupList = Loadable({
  loader: () => import('components/productGroup/ProductGroupList'),
  loading: Loading,
});

const AsyncProductGroupForm = Loadable({
  loader: () => import('components/productGroup/ProductGroupForm'),
  loading: Loading,
});

const AsyncProductGroupShow = Loadable({
  loader: () => import('components/productGroup/ProductGroupShow'),
  loading: Loading,
});

const AsyncRequisitionTemplateShow = Loadable({
  loader: () => import('components/requisitionTemplate/RequisitionTemplateShow'),
  loading: Loading,
});

const AsyncStockListLocationShow = Loadable({
  loader: () => import('components/stock-list/StockListLocationShow'),
  loading: Loading,
});

const AsyncProductTypeForm = Loadable({
  loader: () => import('components/productType/ProductTypeForm'),
  loading: Loading,
});

const AsyncProductTypeList = Loadable({
  loader: () => import('components/productType/ProductTypeList'),
  loading: Loading,
});

const AsyncProductTypeEdit = Loadable({
  loader: () => import('components/productType/ProductTypeEdit'),
  loading: Loading,
});

const AsyncProductTypeShow = Loadable({
  loader: () => import('components/productType/ProductTypeShow'),
  loading: Loading,
});

const AsyncTagList = Loadable({
  loader: () => import('components/tag/TagList'),
  loading: Loading,
});

const AsyncTagCreate = Loadable({
  loader: () => import('components/tag/TagCreate'),
  loading: Loading,
});

const AsyncTagEdit = Loadable({
  loader: () => import('components/tag/TagEdit'),
  loading: Loading,
});

const AsyncTagShow = Loadable({
  loader: () => import('components/tag/TagShow'),
  loading: Loading,
});

const AsyncUnitOfMeasureConversionList = Loadable({
  loader: () => import('components/unitOfMeasureConversion/UnitOfMeasureConversionList'),
  loading: Loading,
});

const AsyncUnitOfMeasureConversionForm = Loadable({
  loader: () => import('components/unitOfMeasureConversion/UnitOfMeasureConversionForm'),
  loading: Loading,
});

const AsyncProductSupplierCreatePage = Loadable({
  loader: () => import('components/productSupplier/create/ProductSupplierForm'),
  loading: Loading,
});

const AsyncLocationList = Loadable({
  loader: () => import('components/location/LocationList'),
  loading: Loading,
});

const AsyncLocationEdit = Loadable({
  loader: () => import('components/location/LocationEdit'),
  loading: Loading,
});

const AsyncLocationBinLocations = Loadable({
  loader: () => import('components/location/LocationBinLocations'),
  loading: Loading,
});

const AsyncLocationZoneLocations = Loadable({
  loader: () => import('components/location/LocationZoneLocations'),
  loading: Loading,
});

const AsyncLocationContents = Loadable({
  loader: () => import('components/location/LocationContents'),
  loading: Loading,
});

const AsyncLocationUploadLogo = Loadable({
  loader: () => import('components/location/LocationUploadLogo'),
  loading: Loading,
});

const AsyncOutboundImport = Loadable({
  loader: () => import('components/stock-movement-wizard/outboundImport/OutboundImport'),
  loading: Loading,
});

const AsyncCycleCount = Loadable({
  loader: () => import('components/cycleCount/CycleCount'),
  loading: Loading,
});

const AsyncCycleCountCountStep = Loadable({
  loader: () => import('components/cycleCount/toCountTab/CountStep'),
  loading: Loading,
});

const AsyncCycleCountResolveStep = Loadable({
  loader: () => import('components/cycleCount/toResolveTab/ResolveStep'),
  loading: Loading,
});

const AsyncCycleCountReporting = Loadable({
  loader: () => import('components/cycleCountReporting/CycleCountReporting'),
  loading: Loading,
});

const AsyncConsumptionList = Loadable({
  loader: () => import('components/consumption/ConsumptionList'),
  loading: Loading,
});

const AsyncConsumptionPivot = Loadable({
  loader: () => import('components/consumption/ConsumptionPivot'),
  loading: Loading,
});

const AsyncConsumptionShow = Loadable({
  loader: () => import('components/consumption/ConsumptionShow'),
  loading: Loading,
});

const AsyncInventoryBrowse = Loadable({
  loader: () => import('components/inventory/InventoryBrowse'),
  loading: Loading,
});

const AsyncCreateTransaction = Loadable({
  loader: () => import('components/inventory/CreateTransaction'),
  loading: Loading,
});

const AsyncEditBinLocation = Loadable({
  loader: () => import('components/inventory/EditBinLocation'),
  loading: Loading,
});

const AsyncReorderReport = Loadable({
  loader: () => import('components/reporting/reorderReport/ReorderReport'),
  loading: Loading,
});

const AsyncExpirationHistoryReport = Loadable({
  loader: () => import('components/reporting/expirationHistoryReport/ExpirationHistoryReport'),
  loading: Loading,
});

const AsyncForecastReport = Loadable({
  loader: () => import('components/reporting/forecastReport/ForecastReport'),
  loading: Loading,
});

const AsyncInventoryByLocationReport = Loadable({
  loader: () => import('components/reporting/inventoryByLocationReport/InventoryByLocationReport'),
  loading: Loading,
});

const AsyncInventoryReport = Loadable({
  loader: () => import('components/reporting/inventoryReport/InventoryReport'),
  loading: Loading,
});

const AsyncOnOrderReport = Loadable({
  loader: () => import('components/reporting/onOrderReport/OnOrderReport'),
  loading: Loading,
});

const AsyncPaginatedPackingListReport = Loadable({
  loader: () => import('components/reporting/packingListReport/PaginatedPackingListReport'),
  loading: Loading,
});

const AsyncRequestDetailReport = Loadable({
  loader: () => import('components/reporting/requestDetailReport/RequestDetailReport'),
  loading: Loading,
});

const AsyncLocationGroupList = Loadable({
  loader: () => import('components/locationGroup/LocationGroupList'),
  loading: Loading,
});

const AsyncLocationGroupForm = Loadable({
  loader: () => import('components/locationGroup/LocationGroupForm'),
  loading: Loading,
});

const AsyncLocationGroupShow = Loadable({
  loader: () => import('components/locationGroup/LocationGroupShow'),
  loading: Loading,
});

const AsyncLocationTypeForm = Loadable({
  loader: () => import('components/locationType/LocationTypeForm'),
  loading: Loading,
});

const AsyncLocationTypeList = Loadable({
  loader: () => import('components/locationType/LocationTypeList'),
  loading: Loading,
});

const AsyncLocationTypeShow = Loadable({
  loader: () => import('components/locationType/LocationTypeShow'),
  loading: Loading,
});

const AsyncOrganizationList = Loadable({
  loader: () => import('components/organization/OrganizationList'),
  loading: Loading,
});

const AsyncOrganizationForm = Loadable({
  loader: () => import('components/organization/OrganizationForm'),
  loading: Loading,
});

const AsyncOrganizationShow = Loadable({
  loader: () => import('components/organization/OrganizationShow'),
  loading: Loading,
});

const AsyncPartyList = Loadable({
  loader: () => import('components/party/PartyList'),
  loading: Loading,
});

const AsyncPartyForm = Loadable({
  loader: () => import('components/party/PartyForm'),
  loading: Loading,
});

const AsyncPartyShow = Loadable({
  loader: () => import('components/party/PartyShow'),
  loading: Loading,
});

const AsyncPartyRoleForm = Loadable({
  loader: () => import('components/partyRole/PartyRoleForm'),
  loading: Loading,
});

const AsyncPartyRoleList = Loadable({
  loader: () => import('components/partyRole/PartyRoleList'),
  loading: Loading,
});

const AsyncPartyRoleShow = Loadable({
  loader: () => import('components/partyRole/PartyRoleShow'),
  loading: Loading,
});

const AsyncPartyTypeList = Loadable({
  loader: () => import('components/partyType/PartyTypeList'),
  loading: Loading,
});

const AsyncPartyTypeForm = Loadable({
  loader: () => import('components/partyType/PartyTypeForm'),
  loading: Loading,
});

const AsyncPartyTypeShow = Loadable({
  loader: () => import('components/partyType/PartyTypeShow'),
  loading: Loading,
});

const AsyncBudgetCodeList = Loadable({
  loader: () => import('components/budgetCode/BudgetCodeList'),
  loading: Loading,
});

const AsyncBudgetCodeForm = Loadable({
  loader: () => import('components/budgetCode/BudgetCodeForm'),
  loading: Loading,
});

const AsyncGlAccountList = Loadable({
  loader: () => import('components/glAccount/GlAccountList'),
  loading: Loading,
});

const AsyncGlAccountForm = Loadable({
  loader: () => import('components/glAccount/GlAccountForm'),
  loading: Loading,
});

const AsyncGlAccountTypeList = Loadable({
  loader: () => import('components/glAccountType/GlAccountTypeList'),
  loading: Loading,
});

const AsyncGlAccountTypeForm = Loadable({
  loader: () => import('components/glAccountType/GlAccountTypeForm'),
  loading: Loading,
});

const AsyncInvoiceShow = Loadable({
  loader: () => import('components/invoice/show/InvoiceShow'),
  loading: Loading,
});

const AsyncInvoiceAddDocument = Loadable({
  loader: () => import('components/invoice/addDocument/InvoiceAddDocument'),
  loading: Loading,
});

const AsyncOrderAddComment = Loadable({
  loader: () => import('components/order/OrderAddComment'),
  loading: Loading,
});

const AsyncOrderAddDocument = Loadable({
  loader: () => import('components/order/OrderAddDocument'),
  loading: Loading,
});

const AsyncOrderEditAdjustment = Loadable({
  loader: () => import('components/order/OrderEditAdjustment'),
  loading: Loading,
});

const AsyncOrderList = Loadable({
  loader: () => import('components/order/OrderList'),
  loading: Loading,
});

const AsyncOrderPendingItemsList = Loadable({
  loader: () => import('components/order/OrderPendingItemsList'),
  loading: Loading,
});

const AsyncOrderSummaryList = Loadable({
  loader: () => import('components/order/OrderSummaryList'),
  loading: Loading,
});

const AsyncOrderItemSummaryList = Loadable({
  loader: () => import('components/order/OrderItemSummaryList'),
  loading: Loading,
});

const AsyncOrderShow = Loadable({
  loader: () => import('components/order/OrderShow'),
  loading: Loading,
});

const AsyncOrderPrint = Loadable({
  loader: () => import('components/order/OrderPrint'),
  loading: Loading,
});

const AsyncOutboundReturnPrint = Loadable({
  loader: () => import('components/deliveryNote/OutboundReturnPrint'),
  loading: Loading,
});

const AsyncGoodsReceiptNotePrint = Loadable({
  loader: () => import('components/goodsReceiptNote/GoodsReceiptNotePrint'),
  loading: Loading,
});

const AsyncReceiveOrderPage = Loadable({
  loader: () => import('components/receiveOrder/ReceiveOrderPage'),
  loading: Loading,
});

const AsyncOrderAdjustmentTypeList = Loadable({
  loader: () => import('components/orderAdjustmentType/OrderAdjustmentTypeList'),
  loading: Loading,
});

const AsyncOrderAdjustmentTypeForm = Loadable({
  loader: () => import('components/orderAdjustmentType/OrderAdjustmentTypeForm'),
  loading: Loading,
});

const AsyncPaymentTermForm = Loadable({
  loader: () => import('components/paymentTerm/PaymentTermForm'),
  loading: Loading,
});

const AsyncPaymentTermList = Loadable({
  loader: () => import('components/paymentTerm/PaymentTermList'),
  loading: Loading,
});

const AsyncPreferenceTypeList = Loadable({
  loader: () => import('components/preferenceType/PreferenceTypeList'),
  loading: Loading,
});

const AsyncPreferenceTypeForm = Loadable({
  loader: () => import('components/preferenceType/PreferenceTypeForm'),
  loading: Loading,
});

const AsyncAttributeList = Loadable({
  loader: () => import('components/attribute/AttributeList'),
  loading: Loading,
});

const AsyncAttributeForm = Loadable({
  loader: () => import('components/attribute/AttributeForm'),
  loading: Loading,
});

const AsyncAttributeShow = Loadable({
  loader: () => import('components/attribute/AttributeShow'),
  loading: Loading,
});

const AsyncCategoryTree = Loadable({
  loader: () => import('components/category/CategoryTree'),
  loading: Loading,
});

const AsyncCategoryForm = Loadable({
  loader: () => import('components/category/CategoryForm'),
  loading: Loading,
});

const AsyncProductForm = Loadable({
  loader: () => import('components/product/ProductForm'),
  loading: Loading,
});

const AsyncProductAddDocument = Loadable({
  loader: () => import('components/product/ProductAddDocument'),
  loading: Loading,
});

const AsyncProductBatchEdit = Loadable({
  loader: () => import('components/product/ProductBatchEdit'),
  loading: Loading,
});

const AsyncProductBatchEditProperties = Loadable({
  loader: () => import('components/product/ProductBatchEditProperties'),
  loading: Loading,
});

const AsyncProductImportCsv = Loadable({
  loader: () => import('components/product/ProductImportCsv'),
  loading: Loading,
});

const AsyncProductMergeLogs = Loadable({
  loader: () => import('components/product/ProductMergeLogs'),
  loading: Loading,
});

const AsyncProductSearch = Loadable({
  loader: () => import('components/product/ProductSearch'),
  loading: Loading,
});

const AsyncProductShow = Loadable({
  loader: () => import('components/product/ProductShow'),
  loading: Loading,
});

const AsyncProductUpnDatabase = Loadable({
  loader: () => import('components/product/ProductUpnDatabase'),
  loading: Loading,
});

const AsyncProductAssociationList = Loadable({
  loader: () => import('components/productAssociation/ProductAssociationList'),
  loading: Loading,
});

const AsyncProductAssociationForm = Loadable({
  loader: () => import('components/productAssociation/ProductAssociationForm'),
  loading: Loading,
});

const AsyncProductAssociationShow = Loadable({
  loader: () => import('components/productAssociation/ProductAssociationShow'),
  loading: Loading,
});

const AsyncProductCatalogList = Loadable({
  loader: () => import('components/productCatalog/ProductCatalogList'),
  loading: Loading,
});

const AsyncProductCatalogForm = Loadable({
  loader: () => import('components/productCatalog/ProductCatalogForm'),
  loading: Loading,
});

const AsyncProductCatalogShow = Loadable({
  loader: () => import('components/productCatalog/ProductCatalogShow'),
  loading: Loading,
});

const AsyncProductGroupCreate = Loadable({
  loader: () => import('components/productGroup/ProductGroupCreate'),
  loading: Loading,
});

const StockMovementList = (props) => {
  const parsedSearchQuery = queryString.parse(props?.location?.search);
  const direction = parsedSearchQuery?.direction?.toUpperCase();
  switch (direction) {
    case 'INBOUND':
      return <AsyncStockMovementInboundList {...props} />;
    case 'OUTBOUND': {
      return (
        <AsyncStockMovementOutboundList
          {...props}
          sourceType={parsedSearchQuery?.sourceType?.toUpperCase()}
        />
      );
    }
    default:
      return <Redirect to={DASHBOARD_URL.base} />;
  }
};

const AsyncStockTransferList = Loadable({
  loader: () => import('components/stock-transfer/list/StockTransferList'),
  loading: Loading,
});

const AsyncInventorySummaryList = Loadable({
  loader: () => import('components/inventory/InventorySummaryList'),
  loading: Loading,
});

const AsyncExpirationStockList = Loadable({
  loader: () => import('components/inventory/ExpirationStockList'),
  loading: Loading,
});

const AsyncDailyTransactionsList = Loadable({
  loader: () => import('components/inventory/DailyTransactionsList'),
  loading: Loading,
});

const AsyncInventorySnapshotList = Loadable({
  loader: () => import('components/inventory/InventorySnapshotList'),
  loading: Loading,
});

const AsyncEditTransactionEntryPage = Loadable({
  loader: () => import('components/inventory/EditTransactionEntryPage'),
  loading: Loading,
});

const AsyncReplenishmentPrintPage = Loadable({
  loader: () => import('components/replenishment/ReplenishmentPrintPage'),
  loading: Loading,
});

const AsyncEditTransactionPage = Loadable({
  loader: () => import('components/inventory/EditTransactionPage'),
  loading: Loading,
});

const AsyncTransactionsList = Loadable({
  loader: () => import('components/inventory/TransactionsList'),
  loading: Loading,
});

const AsyncShowTransactionPage = Loadable({
  loader: () => import('components/inventory/ShowTransactionPage'),
  loading: Loading,
});

const AsyncManageInventoryList = Loadable({
  loader: () => import('components/inventory/ManageInventoryList'),
  loading: Loading,
});

const AsyncProductsWithoutDefaultItemList = Loadable({
  loader: () => import('components/inventory/ProductsWithoutDefaultItemList'),
  loading: Loading,
});

const AsyncInventoryUploadPage = Loadable({
  loader: () => import('components/inventory/InventoryUploadPage'),
  loading: Loading,
});

const AsyncInventoryBrowserList = Loadable({
  loader: () => import('components/inventory/InventoryBrowserList'),
  loading: Loading,
});

const AsyncStockCardPage = Loadable({
  loader: () => import('components/inventory/stockCard/StockCardPage'),
  loading: Loading,
});

const AsyncLotNumbersPage = Loadable({
  loader: () => import('components/inventory/stockCard/LotNumbersPage'),
  loading: Loading,
});

const AsyncRecordStockPage = Loadable({
  loader: () => import('components/inventory/stockCard/RecordStockPage'),
  loading: Loading,
});

const AsyncStockGraphPage = Loadable({
  loader: () => import('components/inventory/stockCard/StockGraphPage'),
  loading: Loading,
});

const AsyncEditInventoryLevelPage = Loadable({
  loader: () => import('components/inventory/stockCard/EditInventoryLevelPage'),
  loading: Loading,
});

const AsyncTransactionLogPage = Loadable({
  loader: () => import('components/inventory/stockCard/TransactionLogPage'),
  loading: Loading,
});

const AsyncInventoryLevelList = Loadable({
  loader: () => import('components/inventory/inventoryLevel/InventoryLevelList'),
  loading: Loading,
});

const AsyncInventoryLevelShowPage = Loadable({
  loader: () => import('components/inventory/inventoryLevel/InventoryLevelShowPage'),
  loading: Loading,
});

const AsyncInventoryLevelFormPage = Loadable({
  loader: () => import('components/inventory/inventoryLevel/InventoryLevelFormPage'),
  loading: Loading,
});

const AsyncInventorySnapshotEditPage = Loadable({
  loader: () => import('components/inventory/InventorySnapshotEditPage'),
  loading: Loading,
});

const InventoryLowStockList = (props) => <AsyncInventorySummaryList {...props} lowStock />;
const InventoryReorderStockList = (props) => <AsyncInventorySummaryList {...props} reorderStock />;

const OrderItemDetailsList = (props) => <AsyncOrderItemSummaryList {...props} variant="details" />;
const ExpiredStockList = (props) => <AsyncExpirationStockList {...props} expired />;

const AsyncRequisitionCreate = Loadable({
  loader: () => import('components/requisition/RequisitionCreate'),
  loading: Loading,
});

const AsyncRequisitionChooseTemplate = Loadable({
  loader: () => import('components/requisition/RequisitionChooseTemplate'),
  loading: Loading,
});

const AsyncRequisitionConfirm = Loadable({
  loader: () => import('components/requisition/RequisitionConfirm'),
  loading: Loading,
});

const AsyncRequisitionAddDocument = Loadable({
  loader: () => import('components/requisition/RequisitionAddDocument'),
  loading: Loading,
});

const AsyncRequisitionShow = Loadable({
  loader: () => import('components/requisition/RequisitionShow'),
  loading: Loading,
});

const AsyncRequisitionReview = Loadable({
  loader: () => import('components/requisition/RequisitionReview'),
  loading: Loading,
});

const AsyncRequisitionProcess = Loadable({
  loader: () => import('components/requisition/RequisitionProcess'),
  loading: Loading,
});

const AsyncRequisitionTransfer = Loadable({
  loader: () => import('components/requisition/RequisitionTransfer'),
  loading: Loading,
});

const AsyncRequisitionPrintDraft = Loadable({
  loader: () => import('components/requisition/RequisitionPrintDraft'),
  loading: Loading,
});

const AsyncRequisitionItemChange = Loadable({
  loader: () => import('components/requisition/RequisitionItemChange'),
  loading: Loading,
});

const AsyncRequisitionItemList = Loadable({
  loader: () => import('components/requisition/RequisitionItemList'),
  loading: Loading,
});

const AsyncStockListTemplateCreate = Loadable({
  loader: () => import('components/stock-list/template/StockListTemplateCreate'),
  loading: Loading,
});

const AsyncStockListTemplateEdit = Loadable({
  loader: () => import('components/stock-list/template/StockListTemplateEdit'),
  loading: Loading,
});

const AsyncStockListTemplateEditHeader = Loadable({
  loader: () => import('components/stock-list/template/StockListTemplateEditHeader'),
  loading: Loading,
});

const AsyncStockListTemplateBatch = Loadable({
  loader: () => import('components/stock-list/template/StockListTemplateBatch'),
  loading: Loading,
});

const AsyncStockListTemplateSendMail = Loadable({
  loader: () => import('components/stock-list/template/StockListTemplateSendMail'),
  loading: Loading,
});

const AsyncPicklistPrint = Loadable({
  loader: () => import('components/requisition/PicklistPrint'),
  loading: Loading,
});

const AsyncPicklistReturnPrint = Loadable({
  loader: () => import('components/requisition/PicklistReturnPrint'),
  loading: Loading,
});

const AsyncCreateShipmentDetails = Loadable({
  loader: () => import('components/shipment/CreateShipmentDetails'),
  loading: Loading,
});

const AsyncCreateShipmentTracking = Loadable({
  loader: () => import('components/shipment/CreateShipmentTracking'),
  loading: Loading,
});

const AsyncCreateShipmentPacking = Loadable({
  loader: () => import('components/shipment/CreateShipmentPacking'),
  loading: Loading,
});

const AsyncCreateShipmentPicking = Loadable({
  loader: () => import('components/shipment/CreateShipmentPicking'),
  loading: Loading,
});

const AsyncCreateShipmentSending = Loadable({
  loader: () => import('components/shipment/CreateShipmentSending'),
  loading: Loading,
});

const AsyncShipmentItemList = Loadable({
  loader: () => import('components/shipmentItem/ShipmentItemList'),
  loading: Loading,
});

const AsyncShipmentItemShow = Loadable({
  loader: () => import('components/shipmentItem/ShipmentItemShow'),
  loading: Loading,
});

const AsyncShipmentItemEdit = Loadable({
  loader: () => import('components/shipmentItem/ShipmentItemEdit'),
  loading: Loading,
});

const AsyncShipmentItemPick = Loadable({
  loader: () => import('components/shipmentItem/ShipmentItemPick'),
  loading: Loading,
});

const AsyncShipmentItemSplit = Loadable({
  loader: () => import('components/shipmentItem/ShipmentItemSplit'),
  loading: Loading,
});

const AsyncShipmentWorkflowCreate = Loadable({
  loader: () => import('components/shipmentWorkflow/ShipmentWorkflowCreate'),
  loading: Loading,
});

const AsyncDeliveryNotePrint = Loadable({
  loader: () => import('components/shipment/DeliveryNotePrint'),
  loading: Loading,
});

const AsyncRequisitionList = Loadable({
  loader: () => import('components/requisition/RequisitionList'),
  loading: Loading,
});

const AsyncRequisitionCreateNonStock = Loadable({
  loader: () => import('components/requisition/RequisitionCreateNonStock'),
  loading: Loading,
});

const AsyncRequisitionCreateStock = Loadable({
  loader: () => import('components/requisition/RequisitionCreateStock'),
  loading: Loading,
});

const AsyncRequisitionEdit = Loadable({
  loader: () => import('components/requisition/RequisitionEdit'),
  loading: Loading,
});

const AsyncRequisitionEditHeader = Loadable({
  loader: () => import('components/requisition/RequisitionEditHeader'),
  loading: Loading,
});

const AsyncRequisitionPick = Loadable({
  loader: () => import('components/requisition/RequisitionPick'),
  loading: Loading,
});

const Router = () => {
  useConnectionListener();

  const spinner = useSelector(getSpinner);
  const supportedActivities = useSelector(getCurrentLocationSupportedActivities);
  const notificationAutohideDelay = useSelector(getNotificationAutohideDelay);

  const Dashboard = useMemo(
    () => (!supportedActivities?.includes(ActivityCode.MANAGE_INVENTORY)
    && supportedActivities?.includes(ActivityCode.SUBMIT_REQUEST)
      ? AsyncStockRequestDashboard
      : AsyncDashboard), [supportedActivities],
  );

  return (
    <div>
      <BrowserRouter>
        <FlashScopeListenerWrapper>
          <Switch>
            <MainLayoutRoute path="**/putAway/create/:putAwayId?" component={AsyncPutAwayMainPage} />
            <MainLayoutRoute path="**/stockMovement/list" component={StockMovementList} />
            <MainLayoutRoute path="**/stockMovement/createOutbound/:stockMovementId?" component={AsyncStockMovement} />
            <MainLayoutRoute path="**/stockMovement/importOutboundStockMovement" component={AsyncOutboundImport} />
            <MainLayoutRoute path="**/report/expirationHistoryReport" component={AsyncExpirationHistoryReport} />
            <MainLayoutRoute path="**/report/showForecastReport" component={AsyncForecastReport} />
            <MainLayoutRoute path="**/report/showInventoryByLocationReport" component={AsyncInventoryByLocationReport} />
            <MainLayoutRoute path="**/report/showInventoryReport" component={AsyncInventoryReport} />
            <MainLayoutRoute path="**/report/showOnOrderReport" component={AsyncOnOrderReport} />
            <MainLayoutRoute path="**/report/showPaginatedPackingListReport" component={AsyncPaginatedPackingListReport} />
            <MainLayoutRoute path="**/report/showRequestDetailReport" component={AsyncRequestDetailReport} />
            <MainLayoutRoute path="**/inventory/reorderReport" component={AsyncReorderReport} />
            <MainLayoutRoute path="**/inventory/browse" component={AsyncInventoryBrowse} />
            <MainLayoutRoute path="**/inventory/createTransaction" component={AsyncCreateTransaction} />
            <MainLayoutRoute path="**/inventory/editBinLocation" component={AsyncEditBinLocation} />
            <MainLayoutRoute path="**/consumption/list" component={AsyncConsumptionList} />
            <MainLayoutRoute path="**/consumption/pivot" component={AsyncConsumptionPivot} />
            <MainLayoutRoute path="**/consumption/show" component={AsyncConsumptionShow} />
            <MainLayoutRoute path="**/inventory/listLowStock" component={InventoryLowStockList} />
            <MainLayoutRoute path="**/inventory/listReorderStock" component={InventoryReorderStockList} />
            <MainLayoutRoute path="**/inventory/listTransactions" component={AsyncTransactionsList} />
            <MainLayoutRoute path="**/inventory/showTransaction/:id" component={AsyncShowTransactionPage} />
            <MainLayoutRoute path="**/inventory/manage" component={AsyncManageInventoryList} />
            <MainLayoutRoute path="**/inventory/showProducts" component={AsyncProductsWithoutDefaultItemList} />
            <MainLayoutRoute path="**/inventory/upload" component={AsyncInventoryUploadPage} />
            <MainLayoutRoute path="**/inventory/listExpiredStock" component={ExpiredStockList} />
            <MainLayoutRoute path="**/inventory/listExpiringStock" component={AsyncExpirationStockList} />
            <MainLayoutRoute path="**/inventory/listDailyTransactions" component={AsyncDailyTransactionsList} />
            <MainLayoutRoute path="**/inventory/list" component={AsyncInventorySummaryList} />
            <MainLayoutRoute path="**/inventory/editTransaction/:id" component={AsyncEditTransactionPage} />
            <MainLayoutRoute path="**/inventorySnapshot/list" component={AsyncInventorySnapshotList} />
            <MainLayoutRoute path="**/transactionEntry/edit/:id" component={AsyncEditTransactionEntryPage} />
            <MainLayoutRoute path="**/inventoryBrowser/list" component={AsyncInventoryBrowserList} />
            <MainLayoutRoute path="**/inventoryBrowser/index" component={AsyncInventoryBrowserList} />
            <MainLayoutRoute path="**/inventoryItem/showStockCard/:id?" component={AsyncStockCardPage} />
            <MainLayoutRoute path="**/inventoryItem/showLotNumbers/:id?" component={AsyncLotNumbersPage} />
            <MainLayoutRoute path="**/inventoryItem/showRecordInventory/:id?" component={AsyncRecordStockPage} />
            <MainLayoutRoute path="**/inventoryItem/showGraph/:id?" component={AsyncStockGraphPage} />
            <MainLayoutRoute path="**/inventoryItem/editInventoryLevel/:id?" component={AsyncEditInventoryLevelPage} />
            <MainLayoutRoute path="**/inventoryItem/showTransactionLog/:id?" component={AsyncTransactionLogPage} />
            <MainLayoutRoute path="**/inventoryLevel/list" component={AsyncInventoryLevelList} />
            <MainLayoutRoute path="**/inventoryLevel/index" component={AsyncInventoryLevelList} />
            <MainLayoutRoute path="**/inventoryLevel/show/:id" component={AsyncInventoryLevelShowPage} />
            <MainLayoutRoute path="**/inventoryLevel/create" component={AsyncInventoryLevelFormPage} />
            <MainLayoutRoute path="**/inventoryLevel/edit/:id?" component={AsyncInventoryLevelFormPage} />
            <MainLayoutRoute path="**/inventorySnapshot/edit" component={AsyncInventorySnapshotEditPage} />
            <MainLayoutRoute path="**/snapshot/edit" component={AsyncInventorySnapshotEditPage} />
            <MainLayoutRoute path="**/inventory/cycleCount/count" component={AsyncCycleCountCountStep} />
            <MainLayoutRoute path="**/inventory/cycleCount/resolve" component={AsyncCycleCountResolveStep} />
            <MainLayoutRoute path="**/inventory/cycleCount/reporting" component={AsyncCycleCountReporting} />
            <MainLayoutRoute path="**/inventory/cycleCount" component={AsyncCycleCount} />
            <MainLayoutRoute path="**/stockMovement/createInbound/:stockMovementId?" component={AsyncStockMovementInbound} />
            <MainLayoutRoute path="**/stockMovement/createCombinedShipments/:stockMovementId?" component={AsyncStockMovementCombinedShipments} />
            <MainLayoutRoute path="**/stockMovement/createRequest/:stockMovementId?" component={AsyncStockMovementRequest} />
            <MainLayoutRoute path="**/stockMovement/verifyRequest/:stockMovementId?" component={AsyncStockMovementVerifyRequest} />
            <MainLayoutRoute path="**/stockMovement/create/:stockMovementId?" component={AsyncStockMovement} />
            <MainLayoutRoute path="**/partialReceiving/create/:shipmentId" component={AsyncReceivingPage} />
            <MainLayoutRoute path="**/stocklistManagement/index/:productId?" component={AsyncManagement} />
            <MainLayoutRoute path="**/invoice/create/:invoiceId?" component={AsyncInvoice} />
            <MainLayoutRoute path="**/invoice/list" component={AsyncInvoiceList} />
            <MainLayoutRoute path="**/invoice/show/:invoiceId" component={AsyncInvoiceShow} />
            <MainLayoutRoute path="**/invoice/addDocument/:invoiceId" component={AsyncInvoiceAddDocument} />
            <MainLayoutRoute path="**/order/addComment/:orderId" component={AsyncOrderAddComment} />
            <MainLayoutRoute path="**/order/addDocument/:orderId" component={AsyncOrderAddDocument} />
            <MainLayoutRoute path="**/order/addAdjustment/:orderId" component={AsyncOrderEditAdjustment} />
            <MainLayoutRoute path="**/order/editAdjustment/:adjustmentId" component={AsyncOrderEditAdjustment} />
            <MainLayoutRoute path="**/order/listOrderItems" component={AsyncOrderPendingItemsList} />
            <MainLayoutRoute path="**/order/list" component={AsyncOrderList} />
            <MainLayoutRoute path="**/order/orderSummaryList" component={AsyncOrderSummaryList} />
            <MainLayoutRoute path="**/order/orderItemSummary" component={AsyncOrderItemSummaryList} />
            <MainLayoutRoute path="**/order/orderItemDetails" component={OrderItemDetailsList} />
            <MainLayoutRoute path="**/order/show/:orderId" component={AsyncOrderShow} />
            <MainLayoutRoute path="**/order/print/:orderId" component={AsyncOrderPrint} />
            <MainLayoutRoute path="**/deliveryNote/printOutboundReturn/:id?" component={AsyncOutboundReturnPrint} />
            <MainLayoutRoute path="**/goodsReceiptNote/print/:id?" component={AsyncGoodsReceiptNotePrint} />
            <MainLayoutRoute path="**/receiveOrderWorkflow/receiveOrder/:orderId?" component={AsyncReceiveOrderPage} />
            <MainLayoutRoute path="**/orderAdjustmentType/list" component={AsyncOrderAdjustmentTypeList} />
            <MainLayoutRoute path="**/orderAdjustmentType/create" component={AsyncOrderAdjustmentTypeForm} />
            <MainLayoutRoute path="**/orderAdjustmentType/edit/:orderAdjustmentTypeId" component={AsyncOrderAdjustmentTypeForm} />
            <MainLayoutRoute path="**/paymentTerm/list" component={AsyncPaymentTermList} />
            <MainLayoutRoute path="**/paymentTerm/create" component={AsyncPaymentTermForm} />
            <MainLayoutRoute path="**/paymentTerm/edit/:paymentTermId" component={AsyncPaymentTermForm} />
            <MainLayoutRoute path="**/preferenceType/list" component={AsyncPreferenceTypeList} />
            <MainLayoutRoute path="**/preferenceType/create" component={AsyncPreferenceTypeForm} />
            <MainLayoutRoute path="**/preferenceType/edit/:preferenceTypeId" component={AsyncPreferenceTypeForm} />
            <MainLayoutRoute path="**/stockTransfer/create/:stockTransferId?" component={AsyncStockTransfer} />
            <MainLayoutRoute path="**/stockTransfer/createOutboundReturn/:outboundReturnId?" component={AsyncOutboundReturns} />
            <MainLayoutRoute path="**/stockTransfer/createInboundReturn/:inboundReturnId?" component={AsyncInboundReturns} />
            <MainLayoutRoute path="**/replenishment/create/:replenishmentId?" component={AsyncReplenishment} />
            <MainLayoutRoute path="**/replenishment/print/:id" component={AsyncReplenishmentPrintPage} />
            <MainLayoutRoute path="**/productsConfiguration/index" component={AsyncProductsConfiguration} />
            <MainLayoutRoute path="**/locationsConfiguration/create/:locationId?" component={AsyncLocationsConfiguration} />
            <MainLayoutRoute path="**/locationsConfiguration/upload" component={AsyncImportLocations} />
            <Route path="**/locationsConfiguration/index">
              <AsyncWelcomePage />
            </Route>
            <Route path="**/loadData/index"><AsyncLoadDataPage /></Route>
            <Route path="**/resettingInstanceInfo/index">
              <AsyncResetInstancePage />
            </Route>
            <MainLayoutRoute path="**/requisition/list" component={AsyncRequisitionList} />
            <MainLayoutRoute path="**/requisition/createNonStock" component={AsyncRequisitionCreateNonStock} />
            <MainLayoutRoute path="**/requisition/createStock" component={AsyncRequisitionCreateStock} />
            <MainLayoutRoute path="**/requisition/edit/:requisitionId" component={AsyncRequisitionEdit} />
            <MainLayoutRoute path="**/requisition/editHeader/:requisitionId" component={AsyncRequisitionEditHeader} />
            <MainLayoutRoute path="**/requisition/pick/:requisitionId" component={AsyncRequisitionPick} />
            <MainLayoutRoute path="**/requisition/create" component={AsyncRequisitionCreate} />
            <MainLayoutRoute path="**/requisition/chooseTemplate" component={AsyncRequisitionChooseTemplate} />
            <MainLayoutRoute path="**/requisition/confirm/:requisitionId" component={AsyncRequisitionConfirm} />
            <MainLayoutRoute path="**/requisition/addDocument/:requisitionId" component={AsyncRequisitionAddDocument} />
            <MainLayoutRoute path="**/requisition/show/:requisitionId" component={AsyncRequisitionShow} />
            <MainLayoutRoute path="**/requisition/review/:requisitionId" component={AsyncRequisitionReview} />
            <MainLayoutRoute path="**/requisition/process/:requisitionId" component={AsyncRequisitionProcess} />
            <MainLayoutRoute path="**/requisition/transfer/:requisitionId" component={AsyncRequisitionTransfer} />
            <MainLayoutRoute path="**/requisition/printDraft/:requisitionId" component={AsyncRequisitionPrintDraft} />
            <MainLayoutRoute path="**/requisitionItem/change/:requisitionItemId" component={AsyncRequisitionItemChange} />
            <MainLayoutRoute path="**/requisitionItem/list" component={AsyncRequisitionItemList} />
            <MainLayoutRoute path="**/picklist/print/:requisitionId" component={AsyncPicklistPrint} />
            <MainLayoutRoute path="**/picklist/returnPrint/:orderId" component={AsyncPicklistReturnPrint} />
            <MainLayoutRoute path="**/createShipmentWorkflow/details/:shipmentId" component={AsyncCreateShipmentDetails} />
            <MainLayoutRoute path="**/createShipmentWorkflow/details" component={AsyncCreateShipmentDetails} />
            <MainLayoutRoute path="**/createShipmentWorkflow/tracking/:shipmentId" component={AsyncCreateShipmentTracking} />
            <MainLayoutRoute path="**/createShipmentWorkflow/packing/:shipmentId" component={AsyncCreateShipmentPacking} />
            <MainLayoutRoute path="**/createShipmentWorkflow/picking/:shipmentId" component={AsyncCreateShipmentPicking} />
            <MainLayoutRoute path="**/createShipmentWorkflow/sending/:shipmentId" component={AsyncCreateShipmentSending} />
            <MainLayoutRoute path="**/shipmentItem/list" component={AsyncShipmentItemList} />
            <MainLayoutRoute path="**/shipmentItem/show/:shipmentItemId" component={AsyncShipmentItemShow} />
            <MainLayoutRoute path="**/shipmentItem/edit/:shipmentItemId" component={AsyncShipmentItemEdit} />
            <MainLayoutRoute path="**/shipmentItem/pick/:shipmentItemId" component={AsyncShipmentItemPick} />
            <MainLayoutRoute path="**/shipmentItem/split/:shipmentItemId" component={AsyncShipmentItemSplit} />
            <MainLayoutRoute path="**/shipmentWorkflow/create" component={AsyncShipmentWorkflowCreate} />
            <MainLayoutRoute path="**/deliveryNote/print/:requisitionId" component={AsyncDeliveryNotePrint} />
            <MainLayoutRoute path="**/purchaseOrder/list" component={AsyncPurchaseOrderList} />
            <MainLayoutRoute path="**/requisitionTemplate/list" component={AsyncStockList} />
            <MainLayoutRoute path="**/requisitionTemplate/show/:requisitionTemplateId" component={AsyncRequisitionTemplateShow} />
            <MainLayoutRoute path="**/stocklist/show/:locationId" component={AsyncStockListLocationShow} />
            <MainLayoutRoute path="**/requisitionTemplate/create" component={AsyncStockListTemplateCreate} />
            <MainLayoutRoute path="**/requisitionTemplate/edit/:templateId" component={AsyncStockListTemplateEdit} />
            <MainLayoutRoute path="**/requisitionTemplate/editHeader/:templateId" component={AsyncStockListTemplateEditHeader} />
            <MainLayoutRoute path="**/requisitionTemplate/batch/:templateId" component={AsyncStockListTemplateBatch} />
            <MainLayoutRoute path="**/requisitionTemplate/sendMail/:templateId" component={AsyncStockListTemplateSendMail} />
            <MainLayoutRoute path="**/product/list" component={AsyncProductsList} />
            <MainLayoutRoute path="**/product/edit/:id" component={AsyncProductForm} />
            <MainLayoutRoute path="**/product/addDocument/:id" component={AsyncProductAddDocument} />
            <MainLayoutRoute path="**/product/batchEdit" component={AsyncProductBatchEdit} />
            <MainLayoutRoute path="**/product/batchEditProperties" component={AsyncProductBatchEditProperties} />
            <MainLayoutRoute path="**/product/importAsCsv" component={AsyncProductImportCsv} />
            <MainLayoutRoute path="**/product/productMergeLogs" component={AsyncProductMergeLogs} />
            <MainLayoutRoute path="**/product/search" component={AsyncProductSearch} />
            <MainLayoutRoute path="**/product/show/:id" component={AsyncProductShow} />
            <MainLayoutRoute path="**/product/upnDatabase" component={AsyncProductUpnDatabase} />
            <MainLayoutRoute path="**/productAssociation/list" component={AsyncProductAssociationList} />
            <MainLayoutRoute path="**/productAssociation/create" component={AsyncProductAssociationForm} />
            <MainLayoutRoute path="**/productAssociation/edit/:id" component={AsyncProductAssociationForm} />
            <MainLayoutRoute path="**/productAssociation/show/:id" component={AsyncProductAssociationShow} />
            <MainLayoutRoute path="**/productCatalog/list" component={AsyncProductCatalogList} />
            <MainLayoutRoute path="**/productCatalog/create" component={AsyncProductCatalogForm} />
            <MainLayoutRoute path="**/productCatalog/edit/:id" component={AsyncProductCatalogForm} />
            <MainLayoutRoute path="**/productCatalog/show/:id" component={AsyncProductCatalogShow} />
            <MainLayoutRoute path="**/productGroup/create" component={AsyncProductGroupCreate} />
            <MainLayoutRoute path="**/stockTransfer/list" component={AsyncStockTransferList} />
            <MainLayoutRoute path="**/locationGroup/list" component={AsyncLocationGroupList} />
            <MainLayoutRoute path="**/locationGroup/create" component={AsyncLocationGroupForm} />
            <MainLayoutRoute path="**/locationGroup/edit/:locationGroupId" component={AsyncLocationGroupForm} />
            <MainLayoutRoute path="**/locationGroup/show/:locationGroupId" component={AsyncLocationGroupShow} />
            <MainLayoutRoute path="**/locationType/list" component={AsyncLocationTypeList} />
            <MainLayoutRoute path="**/locationType/create" component={AsyncLocationTypeForm} />
            <MainLayoutRoute path="**/locationType/edit/:locationTypeId" component={AsyncLocationTypeForm} />
            <MainLayoutRoute path="**/locationType/show/:locationTypeId" component={AsyncLocationTypeShow} />
            <MainLayoutRoute path="**/organization/list" component={AsyncOrganizationList} />
            <MainLayoutRoute path="**/organization/create" component={AsyncOrganizationForm} />
            <MainLayoutRoute path="**/organization/edit/:organizationId" component={AsyncOrganizationForm} />
            <MainLayoutRoute path="**/organization/show/:organizationId" component={AsyncOrganizationShow} />
            <MainLayoutRoute path="**/party/list" component={AsyncPartyList} />
            <MainLayoutRoute path="**/party/create" component={AsyncPartyForm} />
            <MainLayoutRoute path="**/party/edit/:partyId" component={AsyncPartyForm} />
            <MainLayoutRoute path="**/party/show/:partyId" component={AsyncPartyShow} />
            <MainLayoutRoute path="**/partyRole/list" component={AsyncPartyRoleList} />
            <MainLayoutRoute path="**/partyRole/create" component={AsyncPartyRoleForm} />
            <MainLayoutRoute path="**/partyRole/edit/:partyRoleId" component={AsyncPartyRoleForm} />
            <MainLayoutRoute path="**/partyRole/show/:partyRoleId" component={AsyncPartyRoleShow} />
            <MainLayoutRoute path="**/partyType/list" component={AsyncPartyTypeList} />
            <MainLayoutRoute path="**/partyType/create" component={AsyncPartyTypeForm} />
            <MainLayoutRoute path="**/partyType/edit/:partyTypeId" component={AsyncPartyTypeForm} />
            <MainLayoutRoute path="**/partyType/show/:partyTypeId" component={AsyncPartyTypeShow} />
            <MainLayoutRoute path="**/budgetCode/list" component={AsyncBudgetCodeList} />
            <MainLayoutRoute path="**/budgetCode/create" component={AsyncBudgetCodeForm} />
            <MainLayoutRoute path="**/budgetCode/edit/:budgetCodeId" component={AsyncBudgetCodeForm} />
            <MainLayoutRoute path="**/glAccount/list" component={AsyncGlAccountList} />
            <MainLayoutRoute path="**/glAccount/create" component={AsyncGlAccountForm} />
            <MainLayoutRoute path="**/glAccount/edit/:glAccountId" component={AsyncGlAccountForm} />
            <MainLayoutRoute path="**/glAccountType/list" component={AsyncGlAccountTypeList} />
            <MainLayoutRoute path="**/glAccountType/create" component={AsyncGlAccountTypeForm} />
            <MainLayoutRoute path="**/glAccountType/edit/:glAccountTypeId" component={AsyncGlAccountTypeForm} />
            <MainLayoutRoute path="**/attribute/list" component={AsyncAttributeList} />
            <MainLayoutRoute path="**/attribute/create" component={AsyncAttributeForm} />
            <MainLayoutRoute path="**/attribute/edit/:id" component={AsyncAttributeForm} />
            <MainLayoutRoute path="**/attribute/show/:id" component={AsyncAttributeShow} />
            <MainLayoutRoute path="**/category/tree" component={AsyncCategoryTree} />
            <MainLayoutRoute path="**/category/create" component={AsyncCategoryForm} />
            <MainLayoutRoute path="**/category/edit/:id" component={AsyncCategoryForm} />
            <MainLayoutRoute path="**/location/list" component={AsyncLocationList} />
            <MainLayoutRoute path="**/location/edit/:locationId?" component={AsyncLocationEdit} />
            <MainLayoutRoute path="**/location/showBinLocations/:locationId" component={AsyncLocationBinLocations} />
            <MainLayoutRoute path="**/location/showZoneLocations/:locationId" component={AsyncLocationZoneLocations} />
            <MainLayoutRoute path="**/location/showContents/:locationId" component={AsyncLocationContents} />
            <MainLayoutRoute path="**/location/uploadLogo/:locationId" component={AsyncLocationUploadLogo} />
            <MainLayoutRoute path="**/productSupplier/list" component={AsyncProductSupplierList} />
            <MainLayoutRoute path="**/productSupplier/create/:productSupplierId?" component={AsyncProductSupplierCreatePage} />
            <MainLayoutRoute path="**/productSupplier/edit/:productSupplierId" component={AsyncProductSupplierCreatePage} />
            <MainLayoutRoute path="**/productSupplier/show/:productSupplierId" component={AsyncProductSupplierShow} />
            <MainLayoutRoute path="**/productGroup/list" component={AsyncProductGroupList} />
            <MainLayoutRoute path="**/productGroup/edit/:productGroupId" component={AsyncProductGroupForm} />
            <MainLayoutRoute path="**/productGroup/show/:productGroupId" component={AsyncProductGroupShow} />
            <MainLayoutRoute path="**/productType/create" component={AsyncProductTypeForm} />
            <MainLayoutRoute path="**/productType/list" component={AsyncProductTypeList} />
            <MainLayoutRoute path="**/productType/edit/:productTypeId" component={AsyncProductTypeEdit} />
            <MainLayoutRoute path="**/productType/show/:productTypeId" component={AsyncProductTypeShow} />
            <MainLayoutRoute path="**/tag/list" component={AsyncTagList} />
            <MainLayoutRoute path="**/tag/create" component={AsyncTagCreate} />
            <MainLayoutRoute path="**/tag/edit/:tagId" component={AsyncTagEdit} />
            <MainLayoutRoute path="**/tag/show/:tagId" component={AsyncTagShow} />
            <MainLayoutRoute path="**/unitOfMeasureConversion/list" component={AsyncUnitOfMeasureConversionList} />
            <MainLayoutRoute path="**/unitOfMeasureConversion/create" component={AsyncUnitOfMeasureConversionForm} />
            <MainLayoutRoute path="**/unitOfMeasureConversion/edit/:unitOfMeasureConversionId" component={AsyncUnitOfMeasureConversionForm} />
            <MainLayoutRoute path="**/dashboard/:configId?" component={Dashboard} />
            <MainLayoutRoute path="**/" component={Dashboard} />
          </Switch>
        </FlashScopeListenerWrapper>
      </BrowserRouter>
      <div className="spinner-container">
        <ClimbingBoxLoader
          color="#0c769e"
          loading={spinner}
          style={{ top: '40%', left: '50%' }}
        />
      </div>
      <Alert
        timeout={notificationAutohideDelay}
        stack={{ limit: 3 }}
        contentTemplate={CustomAlert}
        position="top-right"
        effect="bouncyflip"
        offset={20}
      />
    </div>
  );
};

export default Router;
