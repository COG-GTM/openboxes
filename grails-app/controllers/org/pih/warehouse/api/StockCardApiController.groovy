package org.pih.warehouse.api

import grails.converters.JSON
import groovy.time.TimeCategory
import org.pih.warehouse.DateUtil
import org.pih.warehouse.auth.AuthService
import org.pih.warehouse.core.Document
import org.pih.warehouse.core.Location
import org.pih.warehouse.core.User
import org.pih.warehouse.core.UserService
import org.pih.warehouse.inventory.InventorySnapshot
import org.pih.warehouse.inventory.StockCardCommand
import org.pih.warehouse.inventory.StockHistoryAssembler
import org.pih.warehouse.inventory.StockHistoryDisplayContext
import org.pih.warehouse.inventory.StockHistoryPageModel
import org.pih.warehouse.inventory.StockHistoryResult
import org.pih.warehouse.inventory.StockHistoryRowDto
import org.pih.warehouse.order.OrderItem
import org.pih.warehouse.order.OrderItemStatusCode
import org.pih.warehouse.product.Product
import org.pih.warehouse.product.ProductAssociation
import org.pih.warehouse.product.ProductSupplier
import org.pih.warehouse.requisition.RequisitionItem

import java.text.DateFormat
import java.text.SimpleDateFormat

/**
 * Read-only API backing the React stock card screen (Phase 2 Batch 4).
 * Every action operates on the session's current warehouse so the location
 * cannot be spoofed via request parameters (same as InventoryItemController).
 */
class StockCardApiController {

    def inventoryService
    def shipmentService
    def requisitionService
    def orderService
    def forecastingService
    def productAvailabilityService
    UserService userService
    StockHistoryAssembler stockHistoryAssembler

    private Location getCurrentLocation() {
        Location location = Location.get(session?.warehouse?.id)
        if (!location) {
            throw new IllegalArgumentException("Unable to resolve current location from session")
        }
        return location
    }

    private Product getProduct() {
        Product product = Product.get(params?.id ?: params?.product?.id)
        if (!product) {
            throw new IllegalArgumentException("Product with identifier '${params?.id ?: params?.product?.id}' could not be found")
        }
        return product
    }

    def getSummary(StockCardCommand cmd) {
        cmd.warehouse = currentLocation
        inventoryService.getStockCardCommand(cmd, params)
        Product product = cmd.product

        render([data: [
                product                        : [
                        id                 : product.id,
                        productCode        : product.productCode,
                        name               : product.name,
                        displayNameOrDefaultName: product.displayNameOrDefaultName,
                        unitOfMeasure      : product.unitOfMeasure,
                        category           : product.category?.name,
                        productFamily      : product.productFamily?.name,
                        lotAndExpiryControl: product.lotAndExpiryControl,
                        active             : product.active,
                        tags               : product.tags?.collect { [id: it.id, tag: it.tag] } ?: [],
                        catalogs           : product.productCatalogs?.collect { [id: it.id, name: it.name] } ?: [],
                ],
                inventory                      : [id: cmd.inventory?.id],
                inventoryLevel                 : cmd.inventoryLevel ? [
                        id             : cmd.inventoryLevel.id,
                        status         : cmd.inventoryLevel.status?.name(),
                        minQuantity    : cmd.inventoryLevel.minQuantity,
                        reorderQuantity: cmd.inventoryLevel.reorderQuantity,
                        maxQuantity    : cmd.inventoryLevel.maxQuantity,
                ] : null,
                totalQuantityOnHand            : cmd.totalQuantity ?: 0,
                totalQuantityAvailableToPromise: cmd.totalQuantityAvailableToPromise ?: 0,
        ]] as JSON)
    }

    def getStockHistory(StockCardCommand cmd) {
        cmd.warehouse = currentLocation
        StockHistoryPageModel pageModel = stockHistoryAssembler.assembleStockHistoryPage(cmd, params)
        StockHistoryResult stockHistory = pageModel.stockHistory
        StockHistoryDisplayContext displayContext = pageModel.displayContext

        List rows = stockHistory.stockHistoryList.collect { StockHistoryRowDto row ->
            def shipment = row.transaction?.incomingShipment ?: row.transaction?.outgoingShipment
            def shipmentDto = shipment ? displayContext.shipmentDtoById[shipment.id] : null
            def requisitionDto = row.requisitionId ? displayContext.requisitionDtoById[row.requisitionId] : null
            def orderDto = row.orderId ? displayContext.orderDtoById[row.orderId] : null
            [
                    transactionYear  : row.transactionYear,
                    transactionMonth : row.transactionMonth,
                    transactionCode  : row.transactionCode?.name(),
                    transaction      : [
                            id               : row.transaction?.id,
                            transactionDate  : row.transaction?.transactionDate?.format("yyyy-MM-dd'T'HH:mm:ssXXX"),
                            transactionNumber: row.transaction?.transactionNumber,
                            transactionType  : row.transaction?.transactionType?.name,
                            createdBy        : row.transaction?.createdBy?.name,
                            comment          : row.transaction?.comment,
                            source           : row.transaction?.source?.name,
                            destination      : row.transaction?.destination?.name,
                    ],
                    localTransfer    : row.localTransferInfo ? [
                            sourceTransactionId       : row.localTransferInfo.sourceTransactionId,
                            sourceTransactionType     : row.localTransferInfo.sourceTransactionType?.name,
                            destinationTransactionId  : row.localTransferInfo.destinationTransactionId,
                            destinationTransactionType: row.localTransferInfo.destinationTransactionType?.name,
                    ] : null,
                    shipment         : shipment ? [
                            id                 : shipment.id,
                            shipmentNumber     : shipment.shipmentNumber,
                            name               : shipment.name,
                            isFromPurchaseOrder: shipmentDto?.isFromPurchaseOrder ?: false,
                            isFromReturnOrder  : shipmentDto?.isFromReturnOrder ?: false,
                            returnOrderTypeName: shipmentDto?.returnOrderTypeName,
                    ] : null,
                    requisition      : requisitionDto ? [
                            id           : requisitionDto.id,
                            requestNumber: requisitionDto.requestNumber,
                            name         : requisitionDto.name,
                    ] : null,
                    order            : orderDto ? [
                            id         : orderDto.id,
                            orderNumber: orderDto.orderNumber,
                            name       : orderDto.name,
                    ] : null,
                    binLocation      : row.binLocation?.name,
                    lotNumber        : row.inventoryItem?.lotNumber,
                    lotStatus        : row.inventoryItem?.lotStatus?.name(),
                    comments         : row.comments,
                    quantity         : row.quantity,
                    balance          : row.balance,
                    isDebit          : row.isDebit,
                    isCredit         : row.isCredit,
                    isInternal       : row.isInternal,
                    isBaseline       : row.isBaseline,
                    isSameTransaction: row.isSameTransaction,
                    showDetails      : row.showDetails,
            ]
        }

        render([data: [
                rows        : rows,
                totalBalance: stockHistory.totalBalance,
                totalCount  : stockHistory.totalCount,
                totalCredit : stockHistory.totalCredit,
                totalDebit  : stockHistory.totalDebit,
        ]] as JSON)
    }

    def getAllLocations() {
        Product product = product
        User currentUser = User.get(session.user.id)
        boolean hasRoleFinance = userService.hasRoleFinance(AuthService.currentUser)
        List<Map> quantityMap = inventoryService.getCurrentStockAllLocations(product, currentUser)

        List groups = quantityMap.collect { Map entry ->
            entry.collect { locationGroup, values ->
                [
                        locationGroup: locationGroup?.name,
                        totalQuantity: values.totalQuantity,
                        totalValue   : hasRoleFinance ? values.totalValue : null,
                        locations    : values.locations.collect {
                            [
                                    location    : it.location?.name,
                                    locationType: it.location?.locationType?.name,
                                    quantity    : it.quantity,
                                    value       : hasRoleFinance ? it.value : null,
                            ]
                        },
                ]
            }
        }.flatten()

        render([data: groups] as JSON)
    }

    def getPendingInbound() {
        Product product = product
        Location location = currentLocation
        def itemsMap = [:]

        def shipmentItems = shipmentService.getPendingInboundShipmentItems(location, product)
        shipmentItems.sort { it.shipment.currentStatus }.groupBy { it.shipment }.collect { k, v ->
            itemsMap.put(k, [
                    quantityRemaining: v.quantityRemaining.sum(),
                    quantityPurchased: 0,
                    shipDate         : k.expectedShippingDate,
                    type             : 'Stock Movement',
            ])
        }
        def orderItems = orderService.getPendingInboundOrderItems(location, product)
        orderItems.findAll { orderItem -> orderItem.orderItemStatusCode != OrderItemStatusCode.CANCELED }.collect {
            def existingItem = itemsMap.find { k, v -> k instanceof OrderItem && k.actualReadyDate == it.actualReadyDate && k.order == it.order }
            if (!existingItem) {
                itemsMap.put(it, [
                        quantityRemaining: 0,
                        quantityPurchased: (it.quantityRemaining * it.quantityPerUom).toInteger(),
                        shipDate         : it.actualReadyDate,
                        type             : 'Purchase Order',
                ])
            } else {
                itemsMap[existingItem.getKey()].quantityPurchased += (it.quantityRemaining * it.quantityPerUom).toInteger()
            }
        }

        List rows = itemsMap.collect { item, value ->
            boolean isStockMovement = value.type == 'Stock Movement'
            [
                    type             : value.type,
                    shipmentId       : isStockMovement ? item?.id : null,
                    number           : isStockMovement ? item?.shipmentNumber : item?.order?.orderNumber,
                    description      : isStockMovement ? item?.name : item?.order?.name,
                    orderId          : isStockMovement ? null : item?.order?.id,
                    origin           : isStockMovement ? item?.origin?.name : item?.order?.origin?.name,
                    status           : isStockMovement ? item?.currentStatus?.name() : item?.order?.status?.name(),
                    orderDate        : isStockMovement ? null : item?.order?.dateOrdered?.format("yyyy-MM-dd"),
                    shipDate         : value.shipDate?.format("yyyy-MM-dd"),
                    quantityPurchased: value.quantityPurchased,
                    quantityRemaining: value.quantityRemaining,
            ]
        }

        render([data: [
                rows                  : rows,
                totalQuantityPurchased: rows.sum { it.quantityPurchased ?: 0 } ?: 0,
                totalQuantityRemaining: rows.sum { it.quantityRemaining ?: 0 } ?: 0,
        ]] as JSON)
    }

    def getPendingOutbound() {
        Product product = product
        Location location = currentLocation

        def requisitionItems = requisitionService.getPendingRequisitionItems(location, product)
        List rows = requisitionItems.groupBy { it.requisition }.collect { requisition, items ->
            def picklistItemsByLot = requisition?.picklist?.getPicklistItemsByLot(product)
            [
                    requisitionId    : requisition?.id,
                    requestNumber    : requisition?.requestNumber,
                    name             : requisition?.name,
                    status           : requisition?.status?.name(),
                    dateRequested    : requisition?.dateRequested?.format("yyyy-MM-dd"),
                    destination      : requisition?.destination?.name,
                    quantityRequested: items.quantity.sum(),
                    quantityRequired : items.sum { RequisitionItem it -> it.calculateQuantityRequired() },
                    quantityPicked   : items.sum { RequisitionItem it -> it.calculateQuantityPicked() },
                    picklistItemsByLot: picklistItemsByLot?.collect { lotNumber, picklistItems ->
                        [lotNumber: lotNumber, quantity: picklistItems.quantity.sum()]
                    } ?: [],
            ]
        }

        render([data: [
                rows                  : rows,
                totalQuantityRequested: rows.sum { it.quantityRequested ?: 0 } ?: 0,
                totalQuantityRequired : rows.sum { it.quantityRequired ?: 0 } ?: 0,
                totalQuantityPicked   : rows.sum { row -> row.picklistItemsByLot.sum { it.quantity ?: 0 } ?: 0 } ?: 0,
        ]] as JSON)
    }

    def getDemand() {
        Product product = product
        Location location = currentLocation
        Location destination = params.destination ? Location.get(params.destination.id) : null

        Date startDate
        Date endDate
        use(TimeCategory) {
            DateFormat dateFormat = new SimpleDateFormat("MM/dd/yyyy")
            Integer demandPeriod = grailsApplication.config.openboxes.forecasting.demandPeriod ?: 365
            Map defaultStartDateRange = DateUtil.getDateRange(new Date(), 0)
            startDate = params.startDate ? dateFormat.parse(params.startDate) : defaultStartDateRange.startDate - demandPeriod.days
            Map defaultEndDateRange = DateUtil.getDateRange(new Date(), -1)
            endDate = params.endDate ? dateFormat.parse(params.endDate) : defaultEndDateRange.endDate
        }

        DateFormat monthFormat = new SimpleDateFormat("MMM yyyy")
        monthFormat.timeZone = TimeZone.default

        def demandDetails = forecastingService.getDemandDetails(location, destination, product, startDate, endDate)
        def destinations = forecastingService.getAvailableDestinationsForDemandDetails(location, product, startDate, endDate)

        List rows = demandDetails.collect {
            [
                    status           : it?.request_status,
                    origin           : it?.origin_name,
                    requisitionId    : it?.request_id,
                    requestNumber    : it?.request_number,
                    destination      : it?.destination_name,
                    dateIssued       : it?.date_issued?.format("yyyy-MM-dd"),
                    monthIssued      : it?.date_issued ? monthFormat.format(it?.date_issued) : null,
                    dateRequested    : it?.date_requested?.format("yyyy-MM-dd"),
                    monthRequested   : monthFormat.format(it?.date_requested),
                    quantityRequested: it?.quantity_requested ?: 0,
                    quantityIssued   : it?.quantity_picked ?: 0,
                    quantityDemand   : it?.quantity_demand ?: 0,
                    reasonCode       : it?.reason_code_classification,
            ]
        }

        List monthKeys = (startDate..endDate).collect { monthFormat.format(it) }.unique()

        render([data: [
                rows        : rows,
                monthKeys   : monthKeys,
                destinations: destinations.collect { [id: it?.id, name: it?.name] },
                startDate   : new SimpleDateFormat("MM/dd/yyyy").format(startDate),
                endDate     : new SimpleDateFormat("MM/dd/yyyy").format(endDate),
        ]] as JSON)
    }

    def getSnapshots() {
        Product product = product
        Location location = currentLocation
        def inventorySnapshots = InventorySnapshot.findAllByProductAndLocation(product, location)
        List rows = inventorySnapshots.collect {
            [
                    id          : it.id,
                    date        : it.date?.format("yyyy-MM-dd"),
                    quantityOnHand: it.quantityOnHand,
            ]
        }.sort { it.date }
        render([data: rows] as JSON)
    }

    def getSuppliers() {
        Product product = product
        Location location = currentLocation
        boolean hasRoleFinance = userService.hasRoleFinance(AuthService.currentUser)
        String currencyCode = grailsApplication.config.openboxes.locale.defaultCurrencyCode ?: "USD"

        List rows = product.productSuppliers?.findAll { it.active }?.sort()?.collect { ProductSupplier productSupplier ->
            def defaultProductPackage = productSupplier.defaultProductPackageDerived
            def defaultPreference = productSupplier.productSupplierPreferences.find { it.destinationParty == location.organization }
            def globalPreference = productSupplier.productSupplierPreferences.find { !it.destinationParty }
            def preferenceType = defaultPreference?.preferenceType ?: globalPreference?.preferenceType
            [
                    id                 : productSupplier.id,
                    code               : productSupplier.code,
                    name               : productSupplier.name,
                    supplier           : productSupplier.supplier?.name,
                    supplierCode       : productSupplier.supplierCode,
                    manufacturer       : productSupplier.manufacturer?.name,
                    manufacturerCode   : productSupplier.manufacturerCode,
                    preferenceType     : preferenceType?.name,
                    isPreferenceHidden : (defaultPreference?.preferenceType?.validationCode?.name() == "HIDE" ||
                            (defaultPreference?.preferenceType?.validationCode?.name() != "HIDE" &&
                                    globalPreference?.preferenceType?.validationCode?.name() == "HIDE")),
                    minOrderQuantity   : productSupplier.minOrderQuantity,
                    packageSize        : defaultProductPackage ? productSupplier.packageSize : null,
                    packagePrice       : (hasRoleFinance && defaultProductPackage?.productPrice != null) ? productSupplier.packagePrice : null,
                    eachPrice          : hasRoleFinance ? productSupplier.eachPrice : null,
            ]
        } ?: []

        render([data: [rows: rows, currencyCode: currencyCode]] as JSON)
    }

    /**
     * Transaction log for a product at the current location, backing the
     * React "Transaction Log" screen (legacy inventoryItem/showTransactionLog).
     * Optional startDate/endDate (MM/dd/yyyy) and transactionType.id filters.
     */
    def getTransactionLog(StockCardCommand cmd) {
        cmd.warehouse = currentLocation
        inventoryService.getStockCardCommand(cmd, params)
        Product product = cmd.product

        Map allTransactionsMap = cmd.allTransactionLogMap ?: [:]

        DateFormat dateFormat = new SimpleDateFormat("MM/dd/yyyy")
        Date startDate = params.startDate ? dateFormat.parse(params.startDate) : null
        Date endDate = params.endDate ? use(TimeCategory) { dateFormat.parse(params.endDate) + 1.day } : null
        String transactionTypeId = params["transactionType.id"]

        def transactions = allTransactionsMap.keySet().findAll { transaction ->
            (!startDate || transaction.transactionDate >= startDate) &&
                    (!endDate || transaction.transactionDate < endDate) &&
                    (!transactionTypeId || transactionTypeId == "0" || String.valueOf(transaction.transactionType?.id) == transactionTypeId)
        }.sort { it.transactionDate }.reverse()

        List rows = transactions.collect { transaction ->
            def shipment = transaction.incomingShipment ?: transaction.outgoingShipment
            [
                    id             : transaction.id,
                    transactionDate: transaction.transactionDate?.format("yyyy-MM-dd'T'HH:mm:ssXXX"),
                    transactionType: [
                            id             : transaction.transactionType?.id,
                            name           : transaction.transactionType?.name,
                            transactionCode: transaction.transactionType?.transactionCode?.name(),
                    ],
                    shipment       : shipment ? [id: shipment.id, name: shipment.name] : null,
                    source         : transaction.source?.name,
                    destination    : transaction.destination?.name,
                    quantityChange : transaction.transactionEntries?.findAll { it?.inventoryItem?.product == product }?.quantity?.sum() ?: 0,
            ]
        }

        render([data: rows, totalCount: allTransactionsMap.keySet().size()] as JSON)
    }

    def getDocuments() {
        Product product = product
        List documents = product.documents?.collect { Document document ->
            [
                    id          : document.id,
                    name        : document.name,
                    filename    : document.filename,
                    documentType: document.documentType?.name,
                    contentType : document.contentType,
                    fileUri     : document.fileUri,
            ]
        } ?: []
        render([data: documents] as JSON)
    }

    def getAssociations() {
        Product product = product
        Location location = currentLocation

        def associations = product?.associations?.sort { it.code }
        def products = product?.associatedProducts() as List
        def quantityAvailableMap = [:]
        if (products && !products.isEmpty()) {
            quantityAvailableMap = productAvailabilityService.getQuantityAvailableToPromiseByProduct(location, products)
        }
        def totalQuantity = quantityAvailableMap.values().sum() ?: 0

        List rows = associations?.collect { ProductAssociation association ->
            [
                    id               : association.id,
                    type             : association.code?.name(),
                    product          : [
                            id           : association.associatedProduct?.id,
                            productCode  : association.associatedProduct?.productCode,
                            name         : association.associatedProduct?.name,
                            unitOfMeasure: association.associatedProduct?.unitOfMeasure,
                    ],
                    quantityAvailable: quantityAvailableMap[association.associatedProduct] ?: 0,
                    comments         : association.comments,
            ]
        } ?: []

        render([data: [rows: rows, totalQuantity: totalQuantity]] as JSON)
    }
}
