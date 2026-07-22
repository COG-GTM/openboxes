/**
 * Copyright (c) 2012 Partners In Health.  All rights reserved.
 * The use and distribution terms for this software are covered by the
 * Eclipse Public License 1.0 (http://opensource.org/licenses/eclipse-1.0.php)
 * which can be found in the file epl-v10.html at the root of this distribution.
 * By using this software in any fashion, you are agreeing to be bound by
 * the terms of this license.
 * You must not remove this notice, or any other, from this software.
 **/
package org.pih.warehouse.api

import grails.converters.JSON
import org.grails.web.json.JSONObject
import org.springframework.http.HttpStatus
import org.pih.warehouse.core.Constants
import org.pih.warehouse.core.Location
import org.pih.warehouse.core.Person
import org.pih.warehouse.core.RoleType
import org.pih.warehouse.core.User
import org.pih.warehouse.inventory.InventoryItem
import org.pih.warehouse.order.Order
import org.pih.warehouse.order.OrderIdentifierService
import org.pih.warehouse.order.OrderItem
import org.pih.warehouse.order.OrderStatus
import org.pih.warehouse.order.OrderType
import org.pih.warehouse.order.OrderTypeCode
import org.pih.warehouse.product.Product
import org.pih.warehouse.shipping.ShipmentType

import java.text.SimpleDateFormat

class StockTransferApiController {

    OrderIdentifierService orderIdentifierService
    def inventoryService
    def orderService
    def shipmentService
    def stockTransferService
    def userService

    def list() {
        if (!params.location) {
            def message = "Location parameter is required"
            response.status = 400
            render([errorMessage: message] as JSON)
            return
        }

        def stockTransfers = stockTransferService.getStockTransfers(params)
        render([
            data: stockTransfers?.collect { it.toJson(it.orderType.orderTypeCode) },
            totalCount: stockTransfers.totalCount
        ] as JSON)
    }

    def read() {
        Order order = Order.get(params.id)
        if (!order) {
            throw new IllegalArgumentException("No stock transfer found for order ID ${params.id}")
        }

        StockTransfer stockTransfer = StockTransfer.createFromOrder(order)
        stockTransferService.setQuantityOnHand(stockTransfer)
        if (order?.picklist) {
            stockTransferService.getDocuments(stockTransfer)
        }
        render([data: stockTransfer?.toJson()] as JSON)
    }

    def create() {
        JSONObject jsonObject = request.JSON

        User currentUser = User.get(session.user.id)
        Location currentLocation = Location.get(session.warehouse.id)
        if (!currentLocation || !currentUser) {
            throw new IllegalArgumentException("User must be logged into a location to update stock transfer")
        }

        StockTransfer stockTransfer = new StockTransfer()

        // We don't have the order yet so can't use it when generating the stockTransferNumber
        bindStockTransferData(stockTransfer, null, currentUser, currentLocation, jsonObject)

        Order order = stockTransferService.createOrUpdateOrderFromStockTransfer(stockTransfer)

        // TODO: Refactor - Return only status
        stockTransfer = StockTransfer.createFromOrder(order)
        stockTransferService.setQuantityOnHand(stockTransfer)
        render([data: stockTransfer?.toJson()] as JSON)
    }

    def update() {
        JSONObject jsonObject = request.JSON

        User currentUser = User.get(session.user.id)
        Location currentLocation = Location.get(session.warehouse.id)
        if (!currentLocation || !currentUser) {
            throw new IllegalArgumentException("User must be logged into a location to update stock transfer")
        }

        Order order = Order.get(params.id)
        if (!order) {
            throw new IllegalArgumentException("No stock transfer found for order ID ${params.id}")
        }

        StockTransfer stockTransfer = new StockTransfer()

        bindStockTransferData(stockTransfer, order, currentUser, currentLocation, jsonObject)

        Boolean isReturnType = stockTransfer.type == OrderType.findByCode(Constants.RETURN_ORDER)
        if (isReturnType && (stockTransfer?.status == StockTransferStatus.PLACED)) {
            order = stockTransferService.createOrUpdateOrderFromStockTransfer(stockTransfer)
            shipmentService.createOrUpdateShipment(stockTransfer)
        } else if (!isReturnType && stockTransfer?.status == StockTransferStatus.COMPLETED) {
            order = stockTransferService.completeStockTransfer(stockTransfer)
        } else {
            order = stockTransferService.createOrUpdateOrderFromStockTransfer(stockTransfer)
        }

        // TODO: Refactor - Return only status
        stockTransfer = StockTransfer.createFromOrder(order)
        stockTransferService.setQuantityOnHand(stockTransfer)
        render([data: stockTransfer?.toJson()] as JSON)
    }

    StockTransfer bindStockTransferData(StockTransfer stockTransfer, Order order, User currentUser, Location currentLocation, JSONObject jsonObject) {
        bindData(stockTransfer, jsonObject, [exclude: ['stockTransferItems']])

        if (!stockTransfer.origin) {
            stockTransfer.origin = currentLocation
        }

        if (!stockTransfer.destination) {
            stockTransfer.destination = currentLocation
        }

        if (!stockTransfer.orderedBy) {
            stockTransfer.orderedBy = currentUser
        }

        if (!stockTransfer.stockTransferNumber) {
            stockTransfer.stockTransferNumber = orderIdentifierService.generate(order)
        }

        if (jsonObject.type) {
            stockTransfer.type = OrderType.get(jsonObject.type)
        }

        if (jsonObject.shipmentType) {
            stockTransfer.shipmentType = ShipmentType.get(jsonObject.shipmentType?.id)
        }

        def dateFormat = new SimpleDateFormat("MM/dd/yyyy")
        if (jsonObject.dateShipped) {
            stockTransfer.dateShipped = dateFormat.parse(jsonObject.dateShipped)
        }

        if (jsonObject.expectedDeliveryDate) {
            stockTransfer.expectedDeliveryDate = dateFormat.parse(jsonObject.expectedDeliveryDate)
        }

        jsonObject.stockTransferItems.each { stockTransferItemMap ->
            StockTransferItem stockTransferItem = new StockTransferItem()
            stockTransferItem.id = stockTransferItemMap["id"] ? stockTransferItemMap["id"] : null
            stockTransferItem.productAvailabilityId = stockTransferItemMap["productAvailabilityId"] ? stockTransferItemMap["productAvailabilityId"] : null
            stockTransferItem.product = stockTransferItemMap?.product?.id ? Product.load(stockTransferItemMap?.product?.id) : null
            stockTransferItem.originBinLocation = stockTransferItemMap?.originBinLocation?.id ? Location.load(stockTransferItemMap?.originBinLocation?.id) : null
            stockTransferItem.destinationBinLocation = stockTransferItemMap?.destinationBinLocation?.id ? Location.load(stockTransferItemMap?.destinationBinLocation?.id) : null
            stockTransferItem.inventoryItem = stockTransferItemMap?.inventoryItem?.id ? InventoryItem.load(stockTransferItemMap?.inventoryItem?.id) : null
            stockTransferItem.quantityOnHand = stockTransferItemMap["quantityOnHand"] ? stockTransferItemMap["quantityOnHand"] : 0
            stockTransferItem.quantityNotPicked = stockTransferItemMap["quantityNotPicked"] ? stockTransferItemMap["quantityNotPicked"] : 0
            stockTransferItem.quantity = stockTransferItemMap["quantity"] ? new BigDecimal(stockTransferItemMap["quantity"]) : 0
            stockTransferItem.status = stockTransferItemMap["status"] ? stockTransferItemMap["status"] : null
            stockTransferItem.recipient = stockTransferItemMap?.recipient?.id ? Person.load(stockTransferItemMap?.recipient?.id) : null

            if (!stockTransferItem.location) {
                stockTransferItem.location = stockTransfer.origin
            }

            stockTransferItemMap.splitItems.each { splitItemMap ->
                StockTransferItem splitItem = new StockTransferItem()
                bindData(splitItem, splitItemMap)
                if (!splitItem.location) {
                    splitItem.location = stockTransfer.origin
                }
                stockTransferItem.splitItems.add(splitItem)
            }

            // For inbound returns
            Date expirationDate = stockTransferItemMap.expirationDate ? Constants.EXPIRATION_DATE_FORMATTER.parse(stockTransferItemMap.expirationDate) : null
            String lotNumber = stockTransferItemMap.lotNumber ? stockTransferItemMap.lotNumber : null
            stockTransferItem.inventoryItem = inventoryService.findAndUpdateOrCreateInventoryItem(
                    stockTransferItem.product,
                    lotNumber,
                    expirationDate
            )

            if (stockTransferItemMap.sortOrder) {
                stockTransferItem.orderIndex = stockTransferItemMap.sortOrder
            }

            stockTransfer.stockTransferItems.add(stockTransferItem)
        }

        return stockTransfer
    }

    def stockTransferCandidates() {
        String locationId = params?.location?.id ?: session.warehouse.id
        Boolean showExpiredItemsOnly = params.boolean('showExpiredItemsOnly', false)
        Location location = Location.get(locationId)

        if (!location) {
            throw new IllegalArgumentException("Can't find location with given id: ${locationId}")
        }

        List<StockTransferItem> stockTransferCandidates = stockTransferService.getStockTransferCandidates(location, null, showExpiredItemsOnly)
        render([data: stockTransferCandidates?.collect { it.toJson() }] as JSON)
    }

    def returnCandidates() {
        Location location = Location.get(request?.JSON?.locationId)
        if (!location) {
            throw new IllegalArgumentException("Can't find location with given id: ${request?.JSON?.locationId}")
        }

        List<StockTransferItem> stockTransferCandidates = stockTransferService.getStockTransferCandidates(location, request?.JSON)
        render([data: stockTransferCandidates?.collect { it.toJson() }] as JSON)
    }

    def removeItem() {
        Order order = stockTransferService.deleteStockTransferItem(params.id)
        StockTransfer stockTransfer = StockTransfer.createFromOrder(order)
        stockTransferService.setQuantityOnHand(stockTransfer)
        render([data: stockTransfer?.toJson()] as JSON)
    }

    def removeAllItems() {
        Order order = stockTransferService.deleteAllStockTransferItems(params.id)
        render([data: StockTransfer.createFromOrder(order)?.toJson()] as JSON)
    }

    def sendShipment() {
        Order order = Order.get(params.id)
        if (!order) {
            throw new IllegalArgumentException("Can't find order with given id: ${params.id}")
        }

        shipmentService.sendShipment(order)
        render status: 200
    }

    def rollback() {
        Location currentLocation = Location.get(session.warehouse.id)

        stockTransferService.rollbackReturnOrder(params.id as String, currentLocation)
        render status: 200
    }

    def delete() {
        def order = Order.get(params.id)
        if (!order) {
            def message = "Order does not exist"
            response.status = 404
            render([errorMessage: message] as JSON)
            return
        }

        if (order.status > OrderStatus.APPROVED || order.orderType.orderTypeCode != OrderTypeCode.TRANSFER_ORDER) {
            def message = "Cannot delete this order"
            response.status = 400
            render([errorMessage: message] as JSON)
            return
        }

        orderService.deleteOrder(order)
        render status: 204
    }

    /**
     * Header, auditing and summary items for the migrated stockTransfer/show
     * screen (mirrors the legacy show.gsp, _summary.gsp and _orderSummary.gsp
     * view models, including the action button visibility rules).
     */
    def details() {
        Order order = Order.get(params.id)
        if (!order) {
            response.status = HttpStatus.NOT_FOUND.value()
            render([errorCode: HttpStatus.NOT_FOUND.value(), errorMessage: "Stock transfer ${params.id} not found"] as JSON)
            return
        }
        Location currentLocation = Location.get(session.warehouse.id)
        String binReplenishmentPrefix = grailsApplication.config.openboxes.stockTransfer.binReplenishment.prefix
        Boolean isManagerOrHigher = userService.isUserInRole(session.user.id,
                [RoleType.ROLE_SUPERUSER, RoleType.ROLE_ADMIN, RoleType.ROLE_MANAGER])
        // The legacy summary tab lists leaf items only (items without split children)
        def orderItems = order.orderItems?.findAll { !it.orderItems }?.sort { a, b ->
            a.dateCreated <=> b.dateCreated ?: a.orderIndex <=> b.orderIndex
        } ?: []
        render([data: [
                id                : order.id,
                orderNumber       : order.orderNumber,
                name              : order.name,
                description       : order.description,
                status            : order.status?.name(),
                statusLabel       : order.status ? g.message(code: "enum.OrderStatus.${order.status.name()}") : null,
                origin            : order.origin ? [id: order.origin.id, name: order.origin.name] : null,
                destination       : order.destination ? [id: order.destination.id, name: order.destination.name] : null,
                createdBy         : order.createdBy ? [id: order.createdBy.id, name: order.createdBy.name] : null,
                dateCreated       : order.dateCreated,
                updatedBy         : order.updatedBy ? [id: order.updatedBy.id, name: order.updatedBy.name] : null,
                lastUpdated       : order.lastUpdated,
                completedBy       : order.completedBy ? [id: order.completedBy.id, name: order.completedBy.name] : null,
                dateCompleted     : order.dateCompleted,
                isInbound         : order.isInbound(currentLocation),
                isOutbound        : order.isOutbound(currentLocation),
                isBinReplenishment: order.orderNumber?.startsWith(binReplenishmentPrefix) ?: false,
                canEdit           : order.status < OrderStatus.COMPLETED,
                canDelete         : isManagerOrHigher && order.status in [OrderStatus.PENDING, OrderStatus.APPROVED],
                orderItems        : orderItems.collect { OrderItem orderItem ->
                    [
                            id                    : orderItem.id,
                            product               : orderItem.product ? [
                                    id         : orderItem.product.id,
                                    productCode: orderItem.product.productCode,
                                    name       : orderItem.product.displayNameOrDefaultName,
                                    color      : orderItem.product.color,
                            ] : null,
                            lotNumber             : orderItem.inventoryItem?.lotNumber,
                            expirationDate        : orderItem.inventoryItem?.expirationDate,
                            quantity              : orderItem.quantity,
                            originBinLocation     : orderItem.originBinLocation?.name,
                            destinationBinLocation: orderItem.destinationBinLocation?.name,
                    ]
                },
        ]] as JSON)
    }

    /**
     * Data for the migrated stockTransfer/print screen (mirrors the legacy
     * print.gsp view model: parent items with split items, plus the zone and
     * product-category attributes the page groups by).
     */
    def printData() {
        Order order = Order.get(params.id)
        if (!order) {
            response.status = HttpStatus.NOT_FOUND.value()
            render([errorCode: HttpStatus.NOT_FOUND.value(), errorMessage: "Stock transfer ${params.id} not found"] as JSON)
            return
        }
        def orderItems = order.orderItems?.findAll { !it.parentOrderItem }?.sort { it.product?.name } ?: []
        render([data: [
                id         : order.id,
                orderNumber: order.orderNumber,
                createdBy  : order.createdBy?.name,
                dateCreated: order.dateCreated,
                orderItems : orderItems.collect { OrderItem orderItem ->
                    def splitItems = orderItem.orderItems?.sort { a, b ->
                        a.destinationBinLocation?.name <=> b.destinationBinLocation?.name ?:
                                b.quantity <=> a.quantity
                    } ?: []
                    [
                            id                    : orderItem.id,
                            productCode           : orderItem.product?.productCode,
                            productName           : orderItem.product?.name,
                            coldChain             : orderItem.product?.coldChain ?: false,
                            controlledSubstance   : orderItem.product?.controlledSubstance ?: false,
                            hazardousMaterial     : orderItem.product?.hazardousMaterial ?: false,
                            zoneName              : orderItem.originBinLocation?.zone?.name,
                            originBinLocation     : orderItem.originBinLocation?.name,
                            lotNumber             : orderItem.inventoryItem?.lotNumber,
                            expirationDate        : orderItem.inventoryItem?.expirationDate,
                            destinationBinLocation: orderItem.destinationBinLocation?.name,
                            quantity              : orderItem.quantity,
                            splitItems            : splitItems.collect {
                                [
                                        id                    : it.id,
                                        destinationBinLocation: it.destinationBinLocation?.name,
                                        quantity              : it.quantity,
                                ]
                            },
                    ]
                },
        ]] as JSON)
    }

    def statusOptions() {
        def statusOptions = OrderStatus.listStockTransfer().collect{
            [ id: it.name(), value: it.name(), label: "${g.message(code: 'enum.OrderStatus.' + it.name())}", variant: it.variant?.name()]
        }
        render([data: statusOptions] as JSON)
    }
}
