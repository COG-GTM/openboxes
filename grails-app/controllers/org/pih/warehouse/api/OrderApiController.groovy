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
import grails.gorm.transactions.Transactional
import org.springframework.http.HttpStatus
import org.springframework.web.multipart.MultipartFile
import org.springframework.web.multipart.MultipartHttpServletRequest
import util.FileUtil

import org.pih.warehouse.core.ActivityCode
import org.pih.warehouse.core.BudgetCode
import org.pih.warehouse.core.Comment
import org.pih.warehouse.core.Constants
import org.pih.warehouse.core.Document
import org.pih.warehouse.core.DocumentCode
import org.pih.warehouse.core.DocumentType
import org.pih.warehouse.core.Location
import org.pih.warehouse.core.User
import org.pih.warehouse.importer.CSVUtils
import org.pih.warehouse.order.Order
import org.pih.warehouse.order.OrderAdjustment
import org.pih.warehouse.order.OrderAdjustmentType
import org.pih.warehouse.order.OrderItem
import org.pih.warehouse.order.OrderItemStatusCode
import org.pih.warehouse.order.OrderService
import org.pih.warehouse.order.OrderStatus
import org.pih.warehouse.order.OrderType
import org.pih.warehouse.order.OrderTypeCode

class OrderApiController {

    OrderService orderService
    def documentService

    /**
     * Mirrors the legacy OrderController.list action for the migrated order
     * list screen (used for putaway orders; purchase orders have their own
     * list). Supports the same filters, CSV downloads and pagination.
     */
    def list() {
        Location currentLocation = Location.get(session.warehouse.id)
        Boolean isCentralPurchasingEnabled = currentLocation.supports(ActivityCode.ENABLE_CENTRAL_PURCHASING)

        Date statusStartDate = parseDate(params.statusStartDate)
        Date statusEndDate = parseDate(params.statusEndDate)

        params.destination = params.destination == null && !isCentralPurchasingEnabled ? session?.warehouse?.id : params.destination
        OrderType orderType = params.orderType ? OrderType.findByIdOrCode(params.orderType, params.orderType) : OrderType.findByCode(OrderTypeCode.PURCHASE_ORDER.name())
        params.status = params.status ? Enum.valueOf(OrderStatus.class, params.status) : null
        params.destinationParty = isCentralPurchasingEnabled ? currentLocation?.organization?.id : params.destinationParty

        Boolean isDownload = params.format || params.downloadOrders
        params.max = isDownload ? null : Math.min(params.int("max") ?: 10, 100)
        params.offset = isDownload ? null : params.int("offset") ?: 0

        Order orderTemplate = new Order(params)
        orderTemplate.orderType = orderType

        def orders = orderService.getOrders(orderTemplate, statusStartDate, statusEndDate, params)
        def orderIds = orders?.collect { it?.id }
        def ordersDerivedStatus = orderService.getOrdersDerivedStatus(orderIds)

        if (params.format) {
            renderOrderLineItemsCsv(orders, ordersDerivedStatus)
            return
        }
        if (params.downloadOrders) {
            renderOrdersCsv(orders, ordersDerivedStatus)
            return
        }

        String defaultCurrencyCode = grailsApplication.config.openboxes.locale.defaultCurrencyCode
        def totalPrice = orders?.sum { it.totalNormalized ?: 0.0 } ?: 0.0
        render([
                data                      : orders.collect { Order order ->
                    orderToJson(order, ordersDerivedStatus, defaultCurrencyCode)
                },
                totalCount                : orders?.totalCount ?: 0,
                totalPrice                : totalPrice,
                defaultCurrencyCode       : defaultCurrencyCode,
                isCentralPurchasingEnabled: isCentralPurchasingEnabled,
        ] as JSON)
    }

    /**
     * Mirrors the legacy OrderController.listOrderItems action: all order
     * items that are not completely fulfilled.
     */
    def pendingItems() {
        def orderItems = OrderItem.getAll().findAll { !it.isCompletelyFulfilled() }
        render([data: orderItems.collect { OrderItem orderItem ->
            [
                    id             : orderItem.id,
                    order          : [
                            id  : orderItem.order?.id,
                            name: orderItem.order?.name,
                    ],
                    description    : orderItem.description,
                    quantity       : orderItem.quantity,
                    isCompletelyFulfilled: orderItem.isCompletelyFulfilled(),
            ]
        }] as JSON)
    }

    /**
     * Mirrors the legacy OrderController.orderSummaryList action (order
     * derived status SQL view).
     */
    def orderSummaryList() {
        params.max = Math.min(params.int("max") ?: 10, 100)
        params.offset = params.int("offset") ?: 0
        normalizeListParams(["orderStatus", "shipmentStatus", "receiptStatus", "paymentStatus", "derivedStatus"])
        def orderSummaryList = orderService.getOrderSummaryList(params)
        render([
                data      : orderSummaryList.collect {
                    [
                            id             : it.id,
                            orderNumber    : it.order?.orderNumber,
                            itemsOrdered   : it.itemsOrdered,
                            itemsShipped   : it.itemsShipped,
                            itemsReceived  : it.itemsReceived,
                            itemsInvoiced  : it.itemsInvoiced,
                            orderStatus    : it.orderStatus,
                            shipmentStatus : it.shipmentStatus,
                            receiptStatus  : it.receiptStatus,
                            paymentStatus  : it.paymentStatus,
                            derivedStatus  : it.derivedStatus,
                    ]
                },
                totalCount: orderSummaryList?.totalCount ?: 0,
        ] as JSON)
    }

    /**
     * Mirrors the legacy OrderController.orderItemSummary and
     * orderItemDetails actions (both render the orderItemSummaryList view).
     * Use variant=details for the simplified SQL view.
     */
    def orderItemSummaryList() {
        params.max = Math.min(params.int("max") ?: 10, 100)
        params.offset = params.int("offset") ?: 0
        normalizeListParams(["derivedStatus"])
        def list = params.variant == "details"
                ? orderService.getOrderItemDetailsList(params)
                : orderService.getOrderItemSummaryList(params)
        render([
                data      : list.collect {
                    [
                            id                 : it.id,
                            orderId            : it.order?.id,
                            orderNumber        : it.orderNumber,
                            productCode        : it.product?.productCode,
                            orderItemStatus    : it.orderItemStatus,
                            quantityOrdered    : it.quantityOrdered,
                            quantityShipped    : it.quantityShipped,
                            quantityReceived   : it.quantityReceived,
                            quantityCanceled   : it.hasProperty("quantityCanceled") ? it.quantityCanceled : null,
                            quantityInvoiced   : it.quantityInvoiced,
                            isItemFullyShipped : it.hasProperty("isItemFullyShipped") ? it.isItemFullyShipped : null,
                            isItemFullyReceived: it.hasProperty("isItemFullyReceived") ? it.isItemFullyReceived : null,
                            isItemFullyInvoiced: it.hasProperty("isItemFullyInvoiced") ? it.isItemFullyInvoiced : null,
                            derivedStatus      : it.derivedStatus?.toString(),
                    ]
                },
                totalCount: list?.totalCount ?: 0,
        ] as JSON)
    }

    def read() {
        Order order = Order.get(params.id)
        if (!order) {
            response.status = HttpStatus.NOT_FOUND.value()
            render([errorCode: HttpStatus.NOT_FOUND.value(), errorMessage: "Order ${params.id} not found"] as JSON)
            return
        }
        render([data: toJson(order)] as JSON)
    }

    /**
     * Order item options for the adjustment form (mirrors the legacy
     * selectOrderItems tag).
     */
    def orderItemOptions() {
        Order order = Order.get(params.id)
        if (!order) {
            response.status = HttpStatus.NOT_FOUND.value()
            render([errorCode: HttpStatus.NOT_FOUND.value(), errorMessage: "Order ${params.id} not found"] as JSON)
            return
        }
        render([data: order.listOrderItems().collect { OrderItem orderItem ->
            [id: orderItem.id, value: orderItem.id, label: orderItem.product?.displayNameOrDefaultName]
        }] as JSON)
    }

    /**
     * Reads a single order adjustment for the migrated edit adjustment
     * screen.
     */
    def readAdjustment() {
        Order order = Order.get(params.id)
        if (!order) {
            response.status = HttpStatus.NOT_FOUND.value()
            render([errorCode: HttpStatus.NOT_FOUND.value(), errorMessage: "Order ${params.id} not found"] as JSON)
            return
        }
        OrderAdjustment orderAdjustment = OrderAdjustment.get(params.adjustmentId)
        if (!orderAdjustment || orderAdjustment.order?.id != order.id) {
            response.status = HttpStatus.NOT_FOUND.value()
            render([errorCode: HttpStatus.NOT_FOUND.value(), errorMessage: "Order adjustment ${params.adjustmentId} not found"] as JSON)
            return
        }
        render([data: adjustmentToJson(orderAdjustment)] as JSON)
    }

    /**
     * Mirrors the create branch of the legacy OrderController.saveAdjustment
     * action.
     */
    @Transactional
    def createAdjustment() {
        Order order = Order.get(params.id)
        if (!order) {
            response.status = HttpStatus.NOT_FOUND.value()
            render([errorCode: HttpStatus.NOT_FOUND.value(), errorMessage: "Order ${params.id} not found"] as JSON)
            return
        }
        def jsonObject = request.JSON
        String glAccountError = validateAccountingRequirement(jsonObject)
        if (glAccountError) {
            response.status = HttpStatus.BAD_REQUEST.value()
            render([errorCode: HttpStatus.BAD_REQUEST.value(), errorMessage: glAccountError] as JSON)
            return
        }
        OrderAdjustment orderAdjustment = new OrderAdjustment()
        bindAdjustment(orderAdjustment, jsonObject)
        order.addToOrderAdjustments(orderAdjustment)
        if (order.hasErrors() || !order.save(flush: true)) {
            transactionStatus.setRollbackOnly()
            response.status = HttpStatus.BAD_REQUEST.value()
            render([errorCode: HttpStatus.BAD_REQUEST.value(), errorMessage: "Validation errors",
                    errors: order.errors.allErrors.collect { g.message(error: it) }] as JSON)
            return
        }
        response.status = HttpStatus.CREATED.value()
        render([data: adjustmentToJson(orderAdjustment)] as JSON)
    }

    /**
     * Mirrors the update branch of the legacy OrderController.saveAdjustment
     * action (including the regular-invoice guard).
     */
    @Transactional
    def updateAdjustment() {
        Order order = Order.get(params.id)
        if (!order) {
            response.status = HttpStatus.NOT_FOUND.value()
            render([errorCode: HttpStatus.NOT_FOUND.value(), errorMessage: "Order ${params.id} not found"] as JSON)
            return
        }
        OrderAdjustment orderAdjustment = OrderAdjustment.get(params.adjustmentId)
        if (!orderAdjustment || orderAdjustment.order?.id != order.id) {
            response.status = HttpStatus.NOT_FOUND.value()
            render([errorCode: HttpStatus.NOT_FOUND.value(), errorMessage: "Order adjustment ${params.adjustmentId} not found"] as JSON)
            return
        }
        if (hasRegularInvoice(orderAdjustment)) {
            response.status = HttpStatus.FORBIDDEN.value()
            render([errorCode: HttpStatus.FORBIDDEN.value(),
                    errorMessage: g.message(code: 'errors.noPermissions.label', default: 'You do not have permissions to perform this action')] as JSON)
            return
        }
        def jsonObject = request.JSON
        String glAccountError = validateAccountingRequirement(jsonObject)
        if (glAccountError) {
            response.status = HttpStatus.BAD_REQUEST.value()
            render([errorCode: HttpStatus.BAD_REQUEST.value(), errorMessage: glAccountError] as JSON)
            return
        }
        if (orderAdjustment.orderItem && !jsonObject.orderItem?.id) {
            orderAdjustment.orderItem.removeFromOrderAdjustments(orderAdjustment)
        }
        bindAdjustment(orderAdjustment, jsonObject)
        if (orderAdjustment.hasErrors() || !orderAdjustment.save(flush: true)) {
            transactionStatus.setRollbackOnly()
            response.status = HttpStatus.BAD_REQUEST.value()
            render([errorCode: HttpStatus.BAD_REQUEST.value(), errorMessage: "Validation errors",
                    errors: orderAdjustment.errors.allErrors.collect { g.message(error: it) }] as JSON)
            return
        }
        render([data: adjustmentToJson(orderAdjustment)] as JSON)
    }

    /**
     * Non-template document types for the migrated order add document screen
     * (mirrors documentService.getNonTemplateDocumentTypes used by the legacy
     * OrderController.addDocument action).
     */
    def documentTypes() {
        List<DocumentType> documentTypeList = documentService.getNonTemplateDocumentTypes().sort { it.name }
        render([data: documentTypeList.collect {
            [id: it.id, value: it.id, label: it.name]
        }] as JSON)
    }

    /**
     * Mirrors the order branch of DocumentController.uploadDocument for the
     * migrated add document screen. Accepts either an uploaded file or a URL
     * (fileUri), like the legacy form.
     */
    @Transactional
    def uploadDocument() {
        Order order = Order.get(params.id)
        if (!order) {
            response.status = 404
            render([errorCode: 404, errorMessage: "Order ${params.id} not found"] as JSON)
            return
        }
        MultipartFile file = request instanceof MultipartHttpServletRequest ? request.getFile("fileContents") : null
        String fileUri = params.fileUri
        if (!file?.size && !fileUri) {
            response.status = 400
            render([errorCode: 400, errorMessage: g.message(code: 'document.documentCannotBeEmpty.message')] as JSON)
            return
        }
        String typeId = params.typeId ?: Constants.DEFAULT_DOCUMENT_TYPE_ID
        DocumentType documentType = DocumentType.get(typeId)
        Document documentInstance
        if (file?.size) {
            if (!Document.isAllowedFile(file.originalFilename, file.contentType, file.inputStream)) {
                response.status = 400
                render([errorCode: 400, errorMessage: g.message(code: 'document.uploadNotAllowed.message',
                        args: [Document.allowedExtensions().join(', ')])] as JSON)
                return
            }
            if (file.size >= 10 * 1024 * 1000) {
                response.status = 400
                render([errorCode: 400, errorMessage: g.message(code: 'document.documentTooLarge.message')] as JSON)
                return
            }
            documentInstance = new Document(
                    size: file.size,
                    name: params.name ?: file.originalFilename,
                    filename: file.originalFilename,
                    fileContents: file.bytes,
                    contentType: file.contentType,
                    extension: file.originalFilename ? FileUtil.getExtension(file.originalFilename) : null,
                    documentNumber: params.documentNumber,
                    documentType: documentType)
        } else {
            documentInstance = new Document(
                    size: 0,
                    name: params.name ?: fileUri,
                    fileUri: fileUri,
                    documentNumber: params.documentNumber,
                    documentType: documentType)
        }

        documentInstance.validate()
        List<DocumentCode> forbiddenDocumentCodes = DocumentCode.templateList()
        if (documentType && forbiddenDocumentCodes.contains(documentType.documentCode)) {
            documentInstance.errors.reject("documentType", "Template types are not allowed for this document upload")
        }
        if (documentInstance.hasErrors()) {
            transactionStatus.setRollbackOnly()
            response.status = 400
            render([errorCode: 400, errorMessage: "Validation errors",
                    errors: documentInstance.errors.allErrors.collect { g.message(error: it) }] as JSON)
            return
        }
        order.addToDocuments(documentInstance)
        if (order.hasErrors() || !order.save(flush: true)) {
            transactionStatus.setRollbackOnly()
            response.status = 400
            render([errorCode: 400, errorMessage: "Validation errors",
                    errors: order.errors.allErrors.collect { g.message(error: it) }] as JSON)
            return
        }
        response.status = 201
        render([data: [
                id            : documentInstance.id,
                name          : documentInstance.name,
                filename      : documentInstance.filename,
                documentNumber: documentInstance.documentNumber,
                documentType  : documentInstance.documentType ? [id: documentInstance.documentType.id, name: documentInstance.documentType.name] : null,
                fileUri       : documentInstance.fileUri,
        ]] as JSON)
    }

    /**
     * Mirrors the legacy OrderController.saveComment action (create branch) for
     * the migrated order add comment screen.
     */
    @Transactional
    def createComment() {
        Order order = Order.get(params.id)
        if (!order) {
            response.status = HttpStatus.NOT_FOUND.value()
            render([errorCode: HttpStatus.NOT_FOUND.value(), errorMessage: "Order ${params.id} not found"] as JSON)
            return
        }
        def jsonObject = request.JSON
        Comment comment = new Comment(
                comment: jsonObject.comment ?: null,
                sender: User.get(session.user.id),
                recipient: jsonObject.recipient?.id ? User.get(jsonObject.recipient.id) : null)
        comment.validate()
        if (comment.hasErrors()) {
            transactionStatus.setRollbackOnly()
            response.status = HttpStatus.BAD_REQUEST.value()
            render([errorCode: HttpStatus.BAD_REQUEST.value(), errorMessage: "Validation errors",
                    errors: comment.errors.allErrors.collect { g.message(error: it) }] as JSON)
            return
        }
        order.addToComments(comment)
        if (order.hasErrors() || !order.save(flush: true)) {
            transactionStatus.setRollbackOnly()
            response.status = HttpStatus.BAD_REQUEST.value()
            render([errorCode: HttpStatus.BAD_REQUEST.value(), errorMessage: "Validation errors",
                    errors: order.errors.allErrors.collect { g.message(error: it) }] as JSON)
            return
        }
        response.status = HttpStatus.CREATED.value()
        render([data: [
                id       : comment.id,
                comment  : comment.comment,
                sender   : comment.sender ? [id: comment.sender.id, name: comment.sender.name] : null,
                recipient: comment.recipient ? [id: comment.recipient.id, name: comment.recipient.name] : null,
        ]] as JSON)
    }

    /**
     * Order header details for the migrated order show screen (mirrors the
     * legacy OrderController.show view model plus the derived status that the
     * legacy page fetched via ajax).
     */
    def details() {
        Order order = Order.get(params.id)
        if (!order) {
            response.status = HttpStatus.NOT_FOUND.value()
            render([errorCode: HttpStatus.NOT_FOUND.value(), errorMessage: "Order ${params.id} not found"] as JSON)
            return
        }
        String defaultCurrencyCode = grailsApplication.config.openboxes.locale.defaultCurrencyCode
        def ordersDerivedStatus = orderService.getOrdersDerivedStatus([order.id])
        render([data: [
                id                 : order.id,
                orderNumber        : order.orderNumber,
                name               : order.name,
                description        : order.description,
                status             : order.status?.name(),
                derivedStatus      : ordersDerivedStatus ? ordersDerivedStatus[order.id] : null,
                orderType          : [
                        id  : order.orderType?.id,
                        code: order.orderType?.code,
                        name: order.orderType?.name,
                ],
                isPurchaseOrder    : order.isPurchaseOrder,
                isPutawayOrder     : order.isPutawayOrder,
                origin             : order.origin ? [
                        id              : order.origin.id,
                        name            : order.origin.name,
                        organizationCode: order.origin.organization?.code,
                ] : null,
                destination        : order.destination ? [
                        id              : order.destination.id,
                        name            : order.destination.name,
                        organizationCode: order.destination.organization?.code,
                ] : null,
                paymentTerm        : order.paymentTerm ? [id: order.paymentTerm.id, name: order.paymentTerm.name] : null,
                paymentMethodType  : order.paymentMethodType ? [id: order.paymentMethodType.id, name: order.paymentMethodType.name] : null,
                subtotal           : order.subtotal ?: 0,
                totalAdjustments   : order.totalAdjustments ?: 0,
                total              : order.total ?: 0,
                currencyCode       : order.currencyCode ?: defaultCurrencyCode,
                orderedBy          : order.orderedBy ? [id: order.orderedBy.id, name: order.orderedBy.name] : null,
                dateOrdered        : order.dateOrdered,
                approvedBy         : order.approvedBy ? [id: order.approvedBy.id, name: order.approvedBy.name] : null,
                dateApproved       : order.dateApproved,
                completedBy        : order.completedBy ? [id: order.completedBy.id, name: order.completedBy.name] : null,
                dateCompleted      : order.dateCompleted,
                createdBy          : order.createdBy ? [id: order.createdBy.id, name: order.createdBy.name] : null,
                dateCreated        : order.dateCreated,
                updatedBy          : order.updatedBy ? [id: order.updatedBy.id, name: order.updatedBy.name] : null,
                lastUpdated        : order.lastUpdated,
                commentsCount      : order.comments?.size() ?: 0,
        ]] as JSON)
    }

    /**
     * Order items for the migrated order show screen tabs (summary, item
     * status, item details). Includes canceled items; the client filters per
     * tab like the legacy templates did.
     */
    def items() {
        Order order = Order.get(params.id)
        if (!order) {
            response.status = HttpStatus.NOT_FOUND.value()
            render([errorCode: HttpStatus.NOT_FOUND.value(), errorMessage: "Order ${params.id} not found"] as JSON)
            return
        }
        String defaultCurrencyCode = grailsApplication.config.openboxes.locale.defaultCurrencyCode
        def orderItems = order.orderItems?.sort { a, b ->
            a.dateCreated <=> b.dateCreated ?: a.orderIndex <=> b.orderIndex
        } ?: []
        render([data: [
                isPurchaseOrder    : order.isPurchaseOrder,
                isPutawayOrder     : order.isPutawayOrder,
                hasSupplierCode    : orderItems.any { it.productSupplier?.supplierCode } ?: false,
                hasManufacturerName: orderItems.any { it.productSupplier?.manufacturerName } ?: false,
                hasManufacturerCode: orderItems.any { it.productSupplier?.manufacturerCode } ?: false,
                currencyCode       : order.currencyCode ?: defaultCurrencyCode,
                subtotal           : order.subtotal ?: 0,
                totalAdjustments   : order.totalAdjustments ?: 0,
                total              : order.total ?: 0,
                orderItems         : orderItems.collect { OrderItem orderItem ->
                    [
                            id                     : orderItem.id,
                            canceled               : orderItem.orderItemStatusCode == OrderItemStatusCode.CANCELED,
                            orderItemStatusCode    : orderItem.orderItemStatusCode?.name(),
                            product                : orderItem.product ? [
                                    id         : orderItem.product.id,
                                    productCode: orderItem.product.productCode,
                                    name       : orderItem.product.displayNameOrDefaultName,
                                    color      : orderItem.product.color,
                            ] : null,
                            description            : orderItem.description,
                            supplierCode           : orderItem.productSupplier?.supplierCode,
                            manufacturerName       : orderItem.productSupplier?.manufacturerName,
                            manufacturerCode       : orderItem.productSupplier?.manufacturerCode,
                            quantity               : orderItem.quantity,
                            unitOfMeasure          : orderItem.unitOfMeasure,
                            unitPrice              : orderItem.unitPrice,
                            totalPrice             : orderItem.totalPrice(),
                            quantityShipped        : orderItem.quantityShipped,
                            quantityReceived       : orderItem.quantityReceived,
                            postedQuantityInvoiced : orderItem.postedQuantityInvoiced,
                            recipient              : orderItem.recipient?.name,
                            estimatedReadyDate     : orderItem.estimatedReadyDate,
                            actualReadyDate        : orderItem.actualReadyDate,
                            budgetCode             : orderItem.budgetCode?.code,
                            lotNumber              : orderItem.inventoryItem?.lotNumber,
                            expirationDate         : orderItem.inventoryItem?.expirationDate,
                            originBinLocation      : orderItem.originBinLocation?.name,
                            destinationBinLocation : orderItem.destinationBinLocation?.name,
                    ]
                },
        ]] as JSON)
    }

    /**
     * Order adjustments for the migrated order show screen adjustments tab
     * (mirrors the legacy _orderAdjustments template).
     */
    def listAdjustments() {
        Order order = Order.get(params.id)
        if (!order) {
            response.status = HttpStatus.NOT_FOUND.value()
            render([errorCode: HttpStatus.NOT_FOUND.value(), errorMessage: "Order ${params.id} not found"] as JSON)
            return
        }
        def orderAdjustments = order.orderAdjustments?.sort() ?: []
        render([data: [
                totalAdjustments: order.totalAdjustments ?: 0,
                adjustments     : orderAdjustments.collect { OrderAdjustment orderAdjustment ->
                    [
                            id                  : orderAdjustment.id,
                            canceled            : orderAdjustment.canceled ?: false,
                            orderItem           : orderAdjustment.orderItem?.product ? [
                                    id   : orderAdjustment.orderItem.id,
                                    label: orderAdjustment.orderItem.product.displayNameOrDefaultName,
                            ] : null,
                            orderAdjustmentType : orderAdjustment.orderAdjustmentType ? [
                                    id  : orderAdjustment.orderAdjustmentType.id,
                                    name: orderAdjustment.orderAdjustmentType.name,
                            ] : null,
                            description         : orderAdjustment.description,
                            percentage          : orderAdjustment.percentage,
                            amount              : orderAdjustment.amount,
                            totalAdjustments    : orderAdjustment.orderItem
                                    ? orderAdjustment.orderItem.totalAdjustments
                                    : orderAdjustment.totalAdjustments,
                            budgetCode          : orderAdjustment.budgetCode?.code,
                            derivedPaymentStatus: orderAdjustment.derivedPaymentStatus?.name(),
                    ]
                },
        ]] as JSON)
    }

    /**
     * Shipment items for the migrated order show screen shipments tab
     * (mirrors the legacy _orderShipments template).
     */
    def shipments() {
        Order order = Order.get(params.id)
        if (!order) {
            response.status = HttpStatus.NOT_FOUND.value()
            render([errorCode: HttpStatus.NOT_FOUND.value(), errorMessage: "Order ${params.id} not found"] as JSON)
            return
        }
        def rows = []
        def orderItems = order.orderItems?.sort { a, b ->
            a.dateCreated <=> b.dateCreated ?: a.orderIndex <=> b.orderIndex
        } ?: []
        orderItems.eachWithIndex { OrderItem orderItem, int i ->
            def shipmentItems = orderItem.shipmentItems?.sort { it.dateCreated } ?: []
            shipmentItems.eachWithIndex { shipmentItem, int j ->
                rows << [
                        orderItemIndex : j == 0 ? i + 1 : null,
                        product        : j == 0 && shipmentItem.product ? [
                                id         : shipmentItem.product.id,
                                productCode: shipmentItem.product.productCode,
                                name       : shipmentItem.product.displayNameOrDefaultName,
                        ] : null,
                        shipment       : shipmentItem.shipment ? [
                                id            : shipmentItem.shipment.id,
                                shipmentNumber: shipmentItem.shipment.shipmentNumber,
                                name          : shipmentItem.shipment.name,
                        ] : null,
                        shipmentType   : shipmentItem.shipment?.shipmentType?.name,
                        status         : shipmentItem.shipment?.currentStatus?.name(),
                        packLevel      : [shipmentItem.container?.parentContainer?.name, shipmentItem.container?.name]
                                .findAll { it }.join(" \u203a ") ?: null,
                        lotNumber      : shipmentItem.inventoryItem?.lotNumber,
                        expirationDate : shipmentItem.inventoryItem?.expirationDate,
                        quantity       : shipmentItem.quantity,
                        unitOfMeasure  : shipmentItem.product?.unitOfMeasure,
                ]
            }
        }
        render([data: rows] as JSON)
    }

    /**
     * Invoice items for the migrated order show screen invoices tab (mirrors
     * the legacy _orderInvoices template).
     */
    def invoices() {
        Order order = Order.get(params.id)
        if (!order) {
            response.status = HttpStatus.NOT_FOUND.value()
            render([errorCode: HttpStatus.NOT_FOUND.value(), errorMessage: "Order ${params.id} not found"] as JSON)
            return
        }
        render([data: order.getSortedInvoiceItems().collect { invoiceItem ->
            def relatedOrderItem = invoiceItem.orderItem ?: invoiceItem.shipmentItem?.orderItem
            [
                    id           : invoiceItem.id,
                    inverse      : invoiceItem.inverse ?: false,
                    orderItemId  : invoiceItem.orderItem?.id,
                    productCode  : invoiceItem.product?.productCode,
                    description  : invoiceItem.orderAdjustment
                            ? invoiceItem.description
                            : (invoiceItem.product?.displayNameOrDefaultName ?: relatedOrderItem?.description),
                    invoice      : invoiceItem.invoice ? [
                            id           : invoiceItem.invoice.id,
                            invoiceNumber: invoiceItem.invoice.invoiceNumber,
                    ] : null,
                    invoiceType  : invoiceItem.invoice?.invoiceType?.name,
                    invoiceStatus: invoiceItem.invoice?.status?.name(),
                    quantity     : invoiceItem.quantity,
                    unitOfMeasure: invoiceItem.unitOfMeasure,
                    unitPrice    : invoiceItem.unitPrice,
                    amount       : invoiceItem.amount,
            ]
        }] as JSON)
    }

    /**
     * Documents, links and purchase order templates for the migrated order
     * show screen documents tab (mirrors the legacy _orderDocuments template).
     */
    def listDocuments() {
        Order order = Order.get(params.id)
        if (!order) {
            response.status = HttpStatus.NOT_FOUND.value()
            render([errorCode: HttpStatus.NOT_FOUND.value(), errorMessage: "Order ${params.id} not found"] as JSON)
            return
        }
        def documentToJson = { Document document ->
            [
                    id          : document.id,
                    name        : document.name,
                    filename    : document.filename,
                    documentType: document.documentType?.name,
                    size        : document.size,
                    fileUri     : document.fileUri,
                    lastUpdated : document.lastUpdated,
            ]
        }
        def documents = order.documents?.findAll { !it.fileUri } ?: []
        def links = order.documents?.findAll { it.fileUri } ?: []
        def documentTemplates = Document.findAllByDocumentCode(DocumentCode.PURCHASE_ORDER_TEMPLATE)
        render([data: [
                documents        : documents.collect(documentToJson),
                links            : links.collect(documentToJson),
                documentTemplates: documentTemplates.collect(documentToJson),
        ]] as JSON)
    }

    /**
     * Comments for the migrated order show screen comments tab (mirrors the
     * legacy _orderComments template).
     */
    def listComments() {
        Order order = Order.get(params.id)
        if (!order) {
            response.status = HttpStatus.NOT_FOUND.value()
            render([errorCode: HttpStatus.NOT_FOUND.value(), errorMessage: "Order ${params.id} not found"] as JSON)
            return
        }
        render([data: (order.comments ?: []).collect { Comment comment ->
            [
                    id         : comment.id,
                    comment    : comment.comment,
                    sender     : comment.sender ? [id: comment.sender.id, name: comment.sender.name] : null,
                    recipient  : comment.recipient ? [id: comment.recipient.id, name: comment.recipient.name] : null,
                    lastUpdated: comment.lastUpdated,
            ]
        }] as JSON)
    }

    /**
     * Data for the migrated order print screen (mirrors the legacy
     * order/print.gsp view model).
     */
    def printData() {
        Order order = Order.get(params.id)
        if (!order) {
            response.status = HttpStatus.NOT_FOUND.value()
            render([errorCode: HttpStatus.NOT_FOUND.value(), errorMessage: "Order ${params.id} not found"] as JSON)
            return
        }
        String defaultCurrencyCode = grailsApplication.config.openboxes.locale.defaultCurrencyCode
        def addressToJson = { address ->
            address ? [
                    address        : address.address,
                    address2       : address.address2,
                    city           : address.city,
                    stateOrProvince: address.stateOrProvince,
                    postalCode     : address.postalCode,
                    country        : address.country,
                    description    : address.description,
            ] : null
        }
        def orderItems = order.listOrderItems()
        def orderAdjustments = order.orderAdjustments
                ?.findAll { !(it.orderItem || it.canceled) }
                ?.sort { it.totalAdjustments }
                ?.reverse() ?: []
        render([data: [
                id                 : order.id,
                orderNumber        : order.orderNumber,
                name               : order.name,
                orderType          : [id: order.orderType?.id, code: order.orderType?.code, name: order.orderType?.name],
                destinationParty   : order.destinationParty ? [
                        id         : order.destinationParty.id,
                        displayName: order.destinationParty.hasProperty("displayName") ? order.destinationParty.displayName : order.destinationParty.name,
                        address    : addressToJson(order.destinationParty.defaultLocation?.address),
                ] : null,
                origin             : order.origin ? [
                        id     : order.origin.id,
                        name   : order.origin.name,
                        address: addressToJson(order.origin.address),
                ] : null,
                destination        : order.destination ? [
                        id     : order.destination.id,
                        name   : order.destination.name,
                        address: addressToJson(order.destination.address),
                ] : null,
                orderedBy          : order.orderedBy ? [id: order.orderedBy.id, name: order.orderedBy.name] : null,
                paymentTerm        : order.paymentTerm?.name,
                paymentMethodType  : order.paymentMethodType?.name,
                hasSupplierCode    : order.orderItems?.any { it.productSupplier?.supplierCode } ?: false,
                hasManufacturerName: order.orderItems?.any { it.productSupplier?.manufacturerName } ?: false,
                hasManufacturerCode: order.orderItems?.any { it.productSupplier?.manufacturerCode } ?: false,
                orderItems         : orderItems.collect { OrderItem orderItem ->
                    [
                            id              : orderItem.id,
                            productCode     : orderItem.product?.productCode,
                            productName     : orderItem.product?.displayNameOrDefaultName,
                            supplierCode    : orderItem.productSupplier?.supplierCode,
                            manufacturerName: orderItem.productSupplier?.manufacturerName,
                            manufacturerCode: orderItem.productSupplier?.manufacturerCode,
                            quantity        : orderItem.quantity,
                            unitOfMeasure   : orderItem.unitOfMeasure,
                            unitPrice       : orderItem.unitPrice,
                            subtotal        : orderItem.subtotal,
                            total           : orderItem.total,
                    ]
                },
                orderAdjustments   : orderAdjustments.collect { OrderAdjustment orderAdjustment ->
                    [
                            id                 : orderAdjustment.id,
                            description        : orderAdjustment.description,
                            orderAdjustmentType: orderAdjustment.orderAdjustmentType?.name,
                            percentage         : orderAdjustment.percentage,
                            totalAdjustments   : orderAdjustment.totalAdjustments,
                    ]
                },
                subtotal           : order.subtotal ?: 0,
                total              : order.total ?: 0,
                currencyCode       : order.currencyCode ?: defaultCurrencyCode,
        ]] as JSON)
    }

    // OrderAdjustment.getHasRegularInvoice NPEs when the adjustment has no
    // invoice items yet (freshly created adjustments).
    private static boolean hasRegularInvoice(OrderAdjustment orderAdjustment) {
        return orderAdjustment.invoiceItems ? orderAdjustment.hasRegularInvoice : false
    }

    private void bindAdjustment(OrderAdjustment orderAdjustment, jsonObject) {
        orderAdjustment.orderItem = jsonObject.orderItem?.id ? OrderItem.get(jsonObject.orderItem.id) : null
        orderAdjustment.orderAdjustmentType = jsonObject.orderAdjustmentType?.id ? OrderAdjustmentType.get(jsonObject.orderAdjustmentType.id) : null
        orderAdjustment.description = jsonObject.description ?: null
        orderAdjustment.amount = jsonObject.amount != null && jsonObject.amount != "" ? new BigDecimal(jsonObject.amount.toString()) : null
        orderAdjustment.percentage = jsonObject.percentage != null && jsonObject.percentage != "" ? new BigDecimal(jsonObject.percentage.toString()) : null
        orderAdjustment.comments = jsonObject.comments ?: null
        orderAdjustment.budgetCode = jsonObject.budgetCode?.id ? BudgetCode.get(jsonObject.budgetCode.id) : null
    }

    /**
     * When the current location requires accounting, the selected adjustment
     * type must have a GL account (mirrors the legacy saveAdjustment check).
     */
    private String validateAccountingRequirement(jsonObject) {
        Location currentLocation = Location.get(session.warehouse.id)
        if (currentLocation.isAccountingRequired() && jsonObject.orderAdjustmentType?.id) {
            OrderAdjustmentType orderAdjustmentType = OrderAdjustmentType.get(jsonObject.orderAdjustmentType.id)
            if (orderAdjustmentType && !orderAdjustmentType.glAccount) {
                return g.message(code: 'orderAdjustment.missingGlAccount.label', default: 'Order adjustment type requires a GL account')
            }
        }
        return null
    }

    private static Map adjustmentToJson(OrderAdjustment orderAdjustment) {
        return [
                id                 : orderAdjustment.id,
                order              : [
                        id         : orderAdjustment.order?.id,
                        orderNumber: orderAdjustment.order?.orderNumber,
                        name       : orderAdjustment.order?.name,
                ],
                orderItem          : orderAdjustment.orderItem ? [
                        id   : orderAdjustment.orderItem.id,
                        label: orderAdjustment.orderItem.product?.displayNameOrDefaultName,
                ] : null,
                orderAdjustmentType: orderAdjustment.orderAdjustmentType ? [
                        id  : orderAdjustment.orderAdjustmentType.id,
                        name: orderAdjustment.orderAdjustmentType.name,
                ] : null,
                description        : orderAdjustment.description,
                amount             : orderAdjustment.amount,
                percentage         : orderAdjustment.percentage,
                comments           : orderAdjustment.comments,
                budgetCode         : orderAdjustment.budgetCode ? [
                        id  : orderAdjustment.budgetCode.id,
                        code: orderAdjustment.budgetCode.code,
                ] : null,
                hasRegularInvoice  : hasRegularInvoice(orderAdjustment),
        ]
    }

    private Map orderToJson(Order order, Map ordersDerivedStatus, String defaultCurrencyCode) {
        def lineItems = order?.orderItems?.findAll { it.orderItemStatusCode != OrderItemStatusCode.CANCELED }
        return [
                id                    : order.id,
                orderNumber           : order.orderNumber,
                name                  : order.name,
                derivedStatus         : ordersDerivedStatus ? ordersDerivedStatus[order.id] : null,
                orderType             : [
                        id  : order.orderType?.id,
                        code: order.orderType?.code,
                        name: order.orderType?.name,
                ],
                isPutawayOrder        : order.orderType?.isPutawayOrder() ?: false,
                origin                : order.origin ? [
                        id              : order.origin.id,
                        name            : order.origin.name,
                        organizationCode: order.origin.organization?.code,
                ] : null,
                destination           : order.destination ? [
                        id              : order.destination.id,
                        name            : order.destination.name,
                        organizationCode: order.destination.organization?.code,
                ] : null,
                orderedBy             : order.orderedBy ? [id: order.orderedBy.id, name: order.orderedBy.name] : null,
                dateOrdered           : order.dateOrdered?.format("MM/dd/yyyy"),
                lineItemsCount        : lineItems?.size() ?: 0,
                orderedItemsCount     : order.orderedOrderItems?.size() ?: 0,
                shippedItemsCount     : order.shippedOrderItems?.size() ?: 0,
                receivedItemsCount    : order.receivedOrderItems?.size() ?: 0,
                total                 : order.total,
                totalNormalized       : order.totalNormalized,
                currencyCode          : order.currencyCode ?: defaultCurrencyCode,
        ]
    }

    private void normalizeListParams(List<String> names) {
        names.each { String name ->
            def value = params.list(name)?.findAll { it }
            if (value) {
                params[name] = value
            } else {
                params.remove(name)
            }
        }
    }

    private static Date parseDate(String value) {
        if (!value) {
            return null
        }
        try {
            return Date.parse("MM/dd/yyyy", value)
        } catch (Exception ignored) {
            return Date.parse("yyyy-MM-dd", value)
        }
    }

    private void renderOrderLineItemsCsv(orders, ordersDerivedStatus) {
        def csv = CSVUtils.getCSVPrinter()
        csv.printRecord(
                "Supplier organization",
                "Supplier location",
                "Destination",
                "PO Number",
                "PO Description",
                "PO Status",
                "Code",
                "Product",
                "Item Status",
                "Source Code",
                "Supplier Code",
                "Manufacturer",
                "Manufacturer Code",
                "Unit of Measure",
                "Qty per UOM",
                "Quantity Ordered",
                "Quantity Shipped",
                "Quantity Received",
                "Quantity Invoiced",
                "Unit Price",
                "Total Cost",
                "Currency",
                "Recipient",
                "Estimated Ready Date",
                "Actual Ready Date",
                "Budget Code"
        )
        orders*.orderItems*.each { orderItem ->
            csv.printRecord(
                    orderItem?.order?.origin?.organization?.code + " - " + orderItem?.order?.origin?.organization?.name,
                    orderItem?.order?.origin?.name,
                    orderItem?.order?.destination?.name,
                    orderItem?.order?.orderNumber,
                    orderItem?.order?.name,
                    (ordersDerivedStatus && orderItem?.order?.id ? ordersDerivedStatus[orderItem.order.id] : ''),
                    orderItem?.product?.productCode,
                    orderItem?.product?.name,
                    OrderItemStatusCode.CANCELED == orderItem?.orderItemStatusCode ? orderItem?.orderItemStatusCode?.name() : '',
                    orderItem?.productSupplier?.code,
                    orderItem?.productSupplier?.supplierCode,
                    orderItem?.productSupplier?.manufacturer?.name,
                    orderItem?.productSupplier?.manufacturerCode,
                    orderItem?.quantityUom?.code,
                    orderItem?.quantityPerUom,
                    orderItem?.quantity,
                    orderItem?.quantityShipped,
                    orderItem?.quantityReceived,
                    orderItem?.quantityInvoicedInStandardUom,
                    orderItem?.unitPrice,
                    orderItem?.total,
                    orderItem?.order?.currencyCode,
                    orderItem?.recipient,
                    orderItem?.estimatedReadyDate?.format("MM/dd/yyyy"),
                    orderItem?.actualReadyDate?.format("MM/dd/yyyy"),
                    orderItem?.budgetCode?.code,
            )
        }
        response.setHeader("Content-disposition", "attachment; filename=\"OrdersLineItems-${new Date().format("MM/dd/yyyy")}.csv\"")
        render(contentType: "text/csv", text: csv.out.toString())
    }

    private void renderOrdersCsv(orders, ordersDerivedStatus) {
        String defaultCurrencyCode = grailsApplication.config.openboxes.locale.defaultCurrencyCode
        def csv = CSVUtils.getCSVPrinter()
        csv.printRecord(
                "Status",
                "PO Number",
                "Name",
                "Supplier",
                "Destination name",
                "Ordered by",
                "Ordered on",
                "Payment method",
                "Payment terms",
                "Line items",
                "Ordered",
                "Shipped",
                "Received",
                "Invoiced",
                "Currency code",
                "Total Amount (Local Currency)",
                "Total Amount (Default Currency)"
        )
        orders.each { order ->
            Integer lineItemsSize = order?.orderItems?.findAll { it.orderItemStatusCode != OrderItemStatusCode.CANCELED }.size() ?: 0
            BigDecimal totalPrice = new BigDecimal(order?.total).setScale(2, java.math.RoundingMode.HALF_UP)
            BigDecimal totalPriceNormalized = order?.totalNormalized.setScale(2, java.math.RoundingMode.HALF_UP)
            csv.printRecord(
                    (ordersDerivedStatus && order.id ? ordersDerivedStatus[order.id] : ''),
                    order?.orderNumber,
                    order?.name,
                    "${order?.origin?.name} (${order?.origin?.organization?.code})",
                    "${order?.destination?.name} (${order?.destination?.organization?.code})",
                    order?.orderedBy?.name,
                    order?.dateOrdered?.format("MM/dd/yyyy"),
                    order?.paymentMethodType?.name,
                    order?.paymentTerm?.name,
                    lineItemsSize,
                    order?.orderedOrderItems?.size() ?: 0,
                    order?.shippedOrderItems?.size() ?: 0,
                    order?.receivedOrderItems?.size() ?: 0,
                    order?.invoiceItems?.size() ?: 0,
                    order?.currencyCode ?: defaultCurrencyCode,
                    "${totalPrice} ${order?.currencyCode ?: defaultCurrencyCode}",
                    "${totalPriceNormalized} ${defaultCurrencyCode}",
            )
        }
        response.setHeader("Content-disposition", "attachment; filename=\"Orders-${new Date().format("MM/dd/yyyy")}.csv\"")
        render(contentType: "text/csv", text: csv.out.toString())
    }

    private static Map toJson(Order order) {
        return [
                id           : order.id,
                orderNumber  : order.orderNumber,
                name         : order.name,
                description  : order.description,
                status       : order.status?.name(),
                orderType    : [
                        id  : order.orderType?.id,
                        code: order.orderType?.code,
                        name: order.orderType?.name,
                ],
                isPutawayOrder: order.orderType?.isPutawayOrder() ?: false,
        ]
    }
}
