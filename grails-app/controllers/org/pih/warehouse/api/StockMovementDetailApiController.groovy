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
import org.pih.warehouse.core.Comment
import org.pih.warehouse.core.Constants
import org.pih.warehouse.core.Document
import org.pih.warehouse.core.DocumentCode
import org.pih.warehouse.core.DocumentType
import org.pih.warehouse.core.Location
import org.pih.warehouse.core.RoleType
import org.pih.warehouse.core.User
import org.pih.warehouse.core.history.HistoryItem
import org.pih.warehouse.inventory.OutboundStockMovement
import org.pih.warehouse.receiving.ReceiptItem
import org.pih.warehouse.receiving.ReceiptStatusCode
import org.pih.warehouse.requisition.RequisitionStatus
import org.pih.warehouse.shipping.Shipment
import org.pih.warehouse.shipping.ShipmentItem

/**
 * REST endpoints backing the migrated stockMovement/show, addComment and
 * addDocument screens (mirrors the legacy StockMovementController show view
 * model and its ajax tab templates).
 */
class StockMovementDetailApiController {

    def stockMovementService
    def outboundStockMovementService
    def userService
    def documentService

    /**
     * Header/details/auditing data for the migrated show screen (mirrors the
     * legacy show.gsp model plus the permission checks done by taglibs).
     */
    def details() {
        def stockMovement = getStockMovement(params.id)
        if (!stockMovement) {
            renderNotFound()
            return
        }
        Location currentLocation = Location.get(session?.warehouse?.id)
        User user = User.get(session?.user?.id)
        HistoryItem latestHistoryItem = stockMovement instanceof OutboundStockMovement
                ? outboundStockMovementService.getLatestHistoryItem(stockMovement)
                : stockMovementService.getLatestHistoryItem(stockMovement)
        stockMovement.documents = stockMovementService.getDocuments(stockMovement)

        def comments = stockMovement.requisition?.comments ?: stockMovement.shipment?.comments
        Shipment shipment = stockMovement.shipment
        Boolean userHasRequestApproverRole = stockMovement.origin?.id
                ? userService.isUserInAllRoles(user?.id, [RoleType.ROLE_REQUISITION_APPROVER], stockMovement.origin.id)
                : false

        render([data: [
                id                 : stockMovement.id,
                name               : stockMovement.name,
                identifier         : stockMovement.identifier,
                displayStatus      : stockMovement.displayStatus?.label,
                statusCode         : stockMovement.statusCode?.toString(),
                isReturn           : stockMovement.isReturn,
                isFromOrder        : stockMovement.isFromOrder,
                isElectronicType   : stockMovement.electronicType,
                lineItemCount      : stockMovement.lineItems?.size() ?: 0,
                origin             : [
                        id              : stockMovement.origin?.id,
                        name            : stockMovement.origin?.name,
                        organizationCode: stockMovement.origin?.organization?.code,
                        isDepot         : stockMovement.origin?.isDepot(),
                        isSupplier      : stockMovement.origin?.isSupplier(),
                ],
                destination        : [
                        id  : stockMovement.destination?.id,
                        name: stockMovement.destination?.name,
                ],
                direction          : stockMovement.destination?.id == currentLocation?.id ? "INBOUND" : "OUTBOUND",
                mostRecentEvent    : latestHistoryItem ? [
                        name              : latestHistoryItem.eventType?.name,
                        isPutawayEvent    : latestHistoryItem.eventType?.eventCode?.isPutawayEvent() ?: false,
                        referenceDocument : latestHistoryItem.referenceDocument ? [
                                identifier: latestHistoryItem.referenceDocument.identifier,
                                url       : latestHistoryItem.referenceDocument.url,
                        ] : null,
                ] : null,
                isFromPurchaseOrder: shipment?.isFromPurchaseOrder ?: false,
                requestType        : stockMovement.requestType?.name(),
                dateDeliveryRequested : stockMovement.requisition?.dateDeliveryRequested?.format(Constants.DEFAULT_MONTH_YEAR_DATE_FORMAT),
                stocklist          : stockMovement.stocklist ? [id: stockMovement.stocklist.id, name: stockMovement.stocklist.name] : null,
                approvers          : stockMovement.requisition?.approvers?.collect { it?.name } ?: [],
                comments           : stockMovement.comments,
                trackingNumber     : stockMovement.trackingNumber,
                driverName         : stockMovement.driverName,
                shipmentType       : shipment?.shipmentType?.name,
                totalValue         : userService.hasRoleFinance(user) ? (shipment?.calculateTotalValue() ?: 0.00) : null,
                defaultCurrencyCode: grailsApplication.config.openboxes.locale.defaultCurrencyCode,
                totalWeightInPounds: shipment?.totalWeightInPounds() ?: 0.00,
                expectedShippingDate: shipment?.expectedShippingDate?.format(Constants.DEFAULT_MONTH_YEAR_DATE_FORMAT),
                orders             : shipment?.orders?.collect { [id: it.id, orderNumber: it.orderNumber] } ?: [],
                order              : stockMovement.order ? [id: stockMovement.order.id, orderNumber: stockMovement.order.orderNumber] : null,
                requisition        : stockMovement.requisition ? [
                        id           : stockMovement.requisition.id,
                        requestNumber: stockMovement.requisition.requestNumber,
                        status       : stockMovement.requisition.status?.name(),
                ] : null,
                shipment           : shipment ? [
                        id            : shipment.id,
                        shipmentNumber: shipment.shipmentNumber,
                        currentStatus : shipment.currentStatus?.name(),
                ] : null,
                incomingTransactions: userService.isSuperuser(user) ? shipment?.incomingTransactions?.collect {
                    [id: it.id, transactionNumber: it.transactionNumber ?: it.id]
                } ?: [] : [],
                outgoingTransactions: userService.isSuperuser(user) ? shipment?.outgoingTransactions?.collect {
                    [id: it.id, transactionNumber: it.transactionNumber ?: it.id]
                } ?: [] : [],
                auditing           : [
                        dateRequested: stockMovement.dateRequested?.format(Constants.DEFAULT_MONTH_YEAR_DATE_FORMAT),
                        requestedBy  : stockMovement.requestedBy?.name,
                        dateApproved : stockMovement.requisition?.dateApproved?.format(Constants.DEFAULT_MONTH_YEAR_DATE_FORMAT),
                        approvedBy   : stockMovement.requisition?.approvedBy?.name,
                        dateRejected : stockMovement.requisition?.dateRejected?.format(Constants.DEFAULT_MONTH_YEAR_DATE_FORMAT),
                        rejectedBy   : stockMovement.requisition?.rejectedBy?.name,
                        dateShipped  : shipment?.hasShipped() ? stockMovement.dateShipped?.format(Constants.DEFAULT_MONTH_YEAR_DATE_FORMAT) : null,
                        shippedBy    : shipment?.hasShipped() ? shipment?.shippedBy?.name : null,
                        receipts     : shipment?.receipts?.collect {
                            [date: it.actualDeliveryDate?.format(Constants.DEFAULT_MONTH_YEAR_DATE_FORMAT), recipient: it.recipient?.name]
                        } ?: [],
                        dateCreated  : stockMovement.dateCreated?.format(Constants.DEFAULT_MONTH_YEAR_DATE_FORMAT),
                        createdBy    : stockMovement.createdBy?.name,
                        lastUpdated  : stockMovement.lastUpdated?.format(Constants.DEFAULT_MONTH_YEAR_DATE_FORMAT),
                        updatedBy    : stockMovement.updatedBy?.name,
                ],
                documents          : stockMovement.documents,
                commentCount       : stockMovement.isReturn ? 0 : (comments?.size() ?: 0),
                permissions        : [
                        isUserAdmin              : userService.isUserAdmin(user),
                        isSuperuser              : userService.isSuperuser(user),
                        hasRoleFinance           : userService.hasRoleFinance(user),
                        userHasRequestApproverRole: userHasRequestApproverRole,
                        canUserEdit              : stockMovement.canUserEdit(user?.id, currentLocation),
                        canRollbackApproval      : stockMovement.canRollbackApproval(user?.id, currentLocation),
                        supportsApproveRequest   : stockMovement.origin?.supports(ActivityCode.APPROVE_REQUEST) ?: false,
                ],
                flags              : [
                        hasBeenShipped           : stockMovement.hasBeenShipped(),
                        hasBeenPartiallyReceived : stockMovement.hasBeenPartiallyReceived(),
                        hasBeenReceived          : stockMovement.hasBeenReceived(),
                        hasBeenIssued            : stockMovement.hasBeenIssued(),
                        isPending                : stockMovement.isPending() || !shipment?.currentStatus,
                        isApprovalRequired       : stockMovement.isApprovalRequired(),
                        isPendingApproval        : stockMovement.isPendingApproval() ?: false,
                        isSameOrigin             : stockMovement.origin?.id == currentLocation?.id,
                        isSameDestination        : stockMovement.destination?.id == currentLocation?.id,
                        originIsDepot            : stockMovement.origin?.isDepot() ?: false,
                        isRequisitionPendingApproval: stockMovement.requisition?.status == RequisitionStatus.PENDING_APPROVAL,
                ],
        ]] as JSON)
    }

    /**
     * Packing list tab (mirrors the legacy _packingList.gsp template).
     */
    def packingList() {
        def stockMovement = getStockMovement(params.id)
        if (!stockMovement) {
            renderNotFound()
            return
        }
        Shipment shipment = stockMovement.shipment
        List<ShipmentItem> shipmentItems = shipment?.sortShipmentItemsBySortOrder() ?: []
        Boolean wasReceived = shipment?.wasReceived() || shipment?.wasPartiallyReceived()
        render([data: [
                isFromPurchaseOrder: shipment?.isFromPurchaseOrder ?: false,
                wasReceived        : wasReceived,
                shipmentItems      : shipmentItems.collect { ShipmentItem shipmentItem ->
                    def receiptItems = shipmentItem.receiptItems?.sort { it.sortOrder }
                    [
                            id              : shipmentItem.id,
                            container       : shipmentItem.container ? [
                                    id       : shipmentItem.container.id,
                                    name     : shipmentItem.container.name,
                                    parentContainerName: shipmentItem.container.parentContainer?.name,
                            ] : null,
                            orderNumber     : shipmentItem.orderNumber,
                            product         : [
                                    id         : shipmentItem.inventoryItem?.product?.id,
                                    productCode: shipmentItem.inventoryItem?.product?.productCode,
                                    name       : shipmentItem.inventoryItem?.product?.displayNameOrDefaultName,
                            ],
                            binLocation     : shipmentItem.binLocation?.name,
                            lotNumber       : shipmentItem.inventoryItem?.lotNumber,
                            expirationDate  : shipmentItem.inventoryItem?.expirationDate?.format(Constants.DEFAULT_MONTH_YEAR_DATE_FORMAT),
                            hasRecalledLot  : shipmentItem.hasRecalledLot ?: false,
                            quantityShipped : shipmentItem.quantity,
                            quantityReceived: shipmentItem.quantityReceived(),
                            quantityCanceled: shipmentItem.quantityCanceled(),
                            unitOfMeasure   : shipmentItem.inventoryItem?.product?.unitOfMeasure,
                            recipient       : shipmentItem.recipient?.name,
                            comments        : shipmentItem.comments ?: [],
                            isFullyReceived : shipmentItem.isFullyReceived(),
                            receiptItems    : receiptItems?.collect {
                                [
                                        binLocation     : it.binLocation?.name,
                                        lotNumber       : it.lotNumber,
                                        expirationDate  : it.expirationDate?.format(Constants.DEFAULT_MONTH_YEAR_DATE_FORMAT),
                                        quantityReceived: it.quantityReceived,
                                        recipient       : it.recipient?.name,
                                ]
                            } ?: [],
                    ]
                },
        ]] as JSON)
    }

    /**
     * Receipts tab (mirrors the legacy _receipts.gsp template).
     */
    def receiptItems() {
        def stockMovement = getStockMovement(params.id)
        if (!stockMovement) {
            renderNotFound()
            return
        }
        List<ReceiptItem> receiptItems = stockMovementService.getStockMovementReceiptItems(stockMovement)
        render([data: receiptItems.collect { ReceiptItem receiptItem ->
            Boolean received = receiptItem.receipt?.receiptStatusCode == ReceiptStatusCode.RECEIVED
            [
                    id               : receiptItem.id,
                    receiptStatusCode: receiptItem.receipt?.receiptStatusCode?.name(),
                    receiptNumber    : receiptItem.receipt?.receiptNumber ?: receiptItem.receipt?.id,
                    shipmentNumber   : receiptItem.receipt?.shipment?.shipmentNumber,
                    transaction      : receiptItem.receipt?.transaction ? [
                            id               : receiptItem.receipt.transaction.id,
                            transactionNumber: receiptItem.receipt.transaction.transactionNumber ?: receiptItem.receipt.transaction.id,
                    ] : null,
                    product          : [
                            id         : receiptItem.product?.id,
                            productCode: receiptItem.product?.productCode,
                            name       : receiptItem.product?.displayNameOrDefaultName,
                    ],
                    lotNumber        : receiptItem.inventoryItem?.lotNumber,
                    expirationDate   : receiptItem.inventoryItem?.expirationDate?.format(Constants.DEFAULT_MONTH_YEAR_DATE_FORMAT),
                    binLocation      : receiptItem.binLocation?.name,
                    quantityCanceled : receiptItem.quantityCanceled ?: 0,
                    quantityPending  : received ? 0 : (receiptItem.quantityReceived ?: 0),
                    quantityReceived : received ? (receiptItem.quantityReceived ?: 0) : 0,
            ]
        }] as JSON)
    }

    /**
     * Events tab (mirrors the legacy _events.gsp shipment history table).
     */
    def events() {
        def stockMovement = getStockMovement(params.id)
        if (!stockMovement) {
            renderNotFound()
            return
        }
        List<HistoryItem> historyItems = stockMovement instanceof OutboundStockMovement
                ? outboundStockMovementService.getHistory(stockMovement)
                : stockMovementService.getHistory(stockMovement)
        render([data: historyItems.collect { HistoryItem historyItem ->
            [
                    eventType        : historyItem.eventType?.name,
                    isPutawayEvent   : historyItem.eventType?.eventCode?.isPutawayEvent() ?: false,
                    referenceDocument: historyItem.referenceDocument ? [
                            identifier: historyItem.referenceDocument.identifier,
                            url       : historyItem.referenceDocument.url,
                    ] : null,
                    dateLogged       : historyItem.dateLogged?.format(Constants.EUROPEAN_DATE_FORMAT_WITH_TIME),
                    date             : historyItem.date?.format(Constants.EUROPEAN_DATE_FORMAT_WITH_TIME),
                    location         : historyItem.location?.name,
                    createdBy        : historyItem.createdBy?.name,
                    comment          : historyItem.comment?.comment,
            ]
        }] as JSON)
    }

    /**
     * Comments tab (mirrors the legacy _comments.gsp template).
     */
    def listComments() {
        def stockMovement = getStockMovement(params.id)
        if (!stockMovement) {
            renderNotFound()
            return
        }
        def comments = stockMovement.isReturn ? [] : (stockMovement.requisition?.comments ?: stockMovement.shipment?.comments ?: [])
        render([data: comments.sort().collect { Comment comment ->
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
     * Mirrors the legacy StockMovementController.saveComment action for the
     * migrated add comment screen.
     */
    @Transactional
    def createComment() {
        def stockMovement = getStockMovement(params.id)
        if (!stockMovement) {
            renderNotFound()
            return
        }
        def jsonObject = request.JSON
        Comment comment = new Comment(
                comment: jsonObject.comment ?: null,
                sender: User.get(session.user.id),
                recipient: jsonObject.recipient?.id ? User.get(jsonObject.recipient.id) : null)
        if (!comment.validate()) {
            transactionStatus.setRollbackOnly()
            response.status = HttpStatus.BAD_REQUEST.value()
            render([errorCode: HttpStatus.BAD_REQUEST.value(), errorMessage: "Validation errors",
                    errors: comment.errors.allErrors.collect { g.message(error: it) }] as JSON)
            return
        }
        def associatedObject = stockMovement.requisition ?: stockMovement.shipment
        associatedObject?.addToComments(comment)
        comment.save(flush: true)
        response.status = HttpStatus.CREATED.value()
        render([data: [
                id       : comment.id,
                comment  : comment.comment,
                sender   : comment.sender ? [id: comment.sender.id, name: comment.sender.name] : null,
                recipient: comment.recipient ? [id: comment.recipient.id, name: comment.recipient.name] : null,
        ]] as JSON)
    }

    /**
     * Non-template document types for the migrated add document screen
     * (mirrors documentService.getNonTemplateDocumentTypes used by the legacy
     * StockMovementController.addDocument action).
     */
    def documentTypes() {
        List<DocumentType> documentTypeList = documentService.getNonTemplateDocumentTypes().sort { it.name }
        render([data: documentTypeList.collect {
            [id: it.id, value: it.id, label: it.name]
        }] as JSON)
    }

    /**
     * Mirrors the shipment branch of DocumentController.uploadDocument for
     * the migrated add document screen. Accepts either an uploaded file or a
     * URL (fileUri), like the legacy form.
     */
    @Transactional
    def uploadDocument() {
        def stockMovement = getStockMovement(params.id)
        if (!stockMovement) {
            renderNotFound()
            return
        }
        Shipment shipment = stockMovement.shipment
        if (!shipment) {
            response.status = HttpStatus.BAD_REQUEST.value()
            render([errorCode: HttpStatus.BAD_REQUEST.value(),
                    errorMessage: "Stock movement ${params.id} has no shipment to attach documents to"] as JSON)
            return
        }
        MultipartFile file = request instanceof MultipartHttpServletRequest ? request.getFile("fileContents") : null
        String fileUri = params.fileUri
        if (!file?.size && !fileUri) {
            response.status = HttpStatus.BAD_REQUEST.value()
            render([errorCode: HttpStatus.BAD_REQUEST.value(), errorMessage: g.message(code: 'document.documentCannotBeEmpty.message')] as JSON)
            return
        }
        String typeId = params.typeId ?: Constants.DEFAULT_DOCUMENT_TYPE_ID
        DocumentType documentType = DocumentType.get(typeId)
        Document documentInstance
        if (file?.size) {
            if (!Document.isAllowedFile(file.originalFilename, file.contentType, file.inputStream)) {
                response.status = HttpStatus.BAD_REQUEST.value()
                render([errorCode: HttpStatus.BAD_REQUEST.value(), errorMessage: g.message(code: 'document.uploadNotAllowed.message',
                        args: [Document.allowedExtensions().join(', ')])] as JSON)
                return
            }
            if (file.size >= 10 * 1024 * 1000) {
                response.status = HttpStatus.BAD_REQUEST.value()
                render([errorCode: HttpStatus.BAD_REQUEST.value(), errorMessage: g.message(code: 'document.documentTooLarge.message')] as JSON)
                return
            }
            documentInstance = new Document(
                    size: file.size,
                    name: params.name ?: file.originalFilename,
                    filename: file.originalFilename,
                    fileContents: file.bytes,
                    contentType: file.contentType,
                    extension: file.originalFilename ? FileUtil.getExtension(file.originalFilename) : null,
                    documentType: documentType)
        } else {
            documentInstance = new Document(
                    size: 0,
                    name: params.name ?: fileUri,
                    fileUri: fileUri,
                    documentType: documentType)
        }

        documentInstance.validate()
        List<DocumentCode> forbiddenDocumentCodes = DocumentCode.templateList()
        if (documentType && forbiddenDocumentCodes.contains(documentType.documentCode)) {
            documentInstance.errors.reject("documentType", "Template types are not allowed for this document upload")
        }
        if (documentInstance.hasErrors()) {
            transactionStatus.setRollbackOnly()
            response.status = HttpStatus.BAD_REQUEST.value()
            render([errorCode: HttpStatus.BAD_REQUEST.value(), errorMessage: "Validation errors",
                    errors: documentInstance.errors.allErrors.collect { g.message(error: it) }] as JSON)
            return
        }
        shipment.addToDocuments(documentInstance)
        if (shipment.hasErrors() || !shipment.save(flush: true)) {
            transactionStatus.setRollbackOnly()
            response.status = HttpStatus.BAD_REQUEST.value()
            render([errorCode: HttpStatus.BAD_REQUEST.value(), errorMessage: "Validation errors",
                    errors: shipment.errors.allErrors.collect { g.message(error: it) }] as JSON)
            return
        }
        response.status = HttpStatus.CREATED.value()
        render([data: [
                id          : documentInstance.id,
                name        : documentInstance.name,
                filename    : documentInstance.filename,
                documentType: documentInstance.documentType ? [id: documentInstance.documentType.id, name: documentInstance.documentType.name] : null,
                fileUri     : documentInstance.fileUri,
        ]] as JSON)
    }

    private def getStockMovement(String id) {
        try {
            def stockMovement = outboundStockMovementService.getStockMovement(id)
            return stockMovement ?: stockMovementService.getStockMovement(id)
        } catch (Exception ignored) {
            return null
        }
    }

    private void renderNotFound() {
        response.status = HttpStatus.NOT_FOUND.value()
        render([errorCode: HttpStatus.NOT_FOUND.value(), errorMessage: "Stock movement ${params.id} not found"] as JSON)
    }
}
