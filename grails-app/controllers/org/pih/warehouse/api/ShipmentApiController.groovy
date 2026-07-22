package org.pih.warehouse.api

import grails.converters.JSON
import grails.gorm.transactions.Transactional
import grails.validation.ValidationException
import org.apache.commons.lang.text.StrSubstitutor
import org.springframework.http.HttpStatus
import org.pih.warehouse.core.Event
import org.pih.warehouse.core.EventType
import org.pih.warehouse.core.Location
import org.pih.warehouse.core.Person
import org.pih.warehouse.core.RoleType
import org.pih.warehouse.core.User
import org.pih.warehouse.donation.Donor
import org.pih.warehouse.inventory.InventoryItem
import org.pih.warehouse.inventory.TransactionException
import org.pih.warehouse.product.Product
import org.pih.warehouse.receiving.Receipt
import org.pih.warehouse.receiving.ReceiptItem
import org.pih.warehouse.shipping.Container
import org.pih.warehouse.shipping.ContainerType
import org.pih.warehouse.shipping.ReferenceNumber
import org.pih.warehouse.shipping.ReferenceNumberType
import org.pih.warehouse.shipping.Shipment
import org.pih.warehouse.shipping.ShipmentException
import org.pih.warehouse.shipping.ShipmentItem
import org.pih.warehouse.shipping.ShipmentMethod
import org.pih.warehouse.shipping.ShipmentStatusCode
import org.pih.warehouse.shipping.ShipmentType
import org.pih.warehouse.shipping.ShipmentWorkflow
import org.pih.warehouse.shipping.Shipper

/**
 * REST endpoints backing the React screens that replaced the legacy
 * createShipmentWorkflow webflow GSPs (Phase 2, Batch 19):
 * enterShipmentDetails, enterTrackingDetails, enterContainerDetails,
 * pickShipmentItems and sendShipment; plus the classic shipping screens
 * (Phase 2, Batch 22): shipment/list, shipment/showDetails,
 * shipment/showPackingList, shipment/receiveShipment, shipment/sendShipment
 * and shipmentItem/create.
 */
@Transactional
class ShipmentApiController {

    def messageSource

    private static Map addressToJson(address) {
        address ? [
                address        : address.address,
                address2       : address.address2,
                city           : address.city,
                stateOrProvince: address.stateOrProvince,
                postalCode     : address.postalCode,
                country        : address.country,
        ] : null
    }

    private static Map locationToJson(location) {
        location ? [
                id     : location.id,
                name   : location.name,
                address: addressToJson(location.address),
        ] : null
    }

    /**
     * Data for the migrated outbound return delivery note print screen
     * (mirrors the legacy deliveryNote/printOutboundReturn.gsp view model).
     */
    def outboundReturnPrintData() {
        Shipment shipment = Shipment.get(params.id)
        if (!shipment) {
            response.status = HttpStatus.NOT_FOUND.value()
            render([errorCode: HttpStatus.NOT_FOUND.value(), errorMessage: "Shipment ${params.id} not found"] as JSON)
            return
        }
        def sortedItems = shipment.shipmentItems?.sort { it.product?.name } ?: []
        def sortedReceipts = shipment.receipts?.sort { it.dateCreated } ?: []
        render([data: [
                id                   : shipment.id,
                shipmentNumber       : shipment.shipmentNumber,
                name                 : shipment.name,
                origin               : locationToJson(shipment.origin),
                destination          : locationToJson(shipment.destination),
                expectedShippingDate : shipment.expectedShippingDate,
                receivedDate         : sortedReceipts ? sortedReceipts.last()?.actualDeliveryDate : null,
                referenceNumber      : shipment.referenceNumbers ? shipment.referenceNumbers.first()?.identifier : null,
                driverName           : shipment.driverName,
                additionalInformation: shipment.additionalInformation,
                shipmentItems        : sortedItems.collect { ShipmentItem item ->
                    def receiptItems = shipment.receipts?.collectMany { r ->
                        r.receiptItems?.findAll { ri -> ri.shipmentItem?.id == item.id && ri.quantityReceived > 0 } ?: []
                    } ?: []
                    [
                            id            : item.id,
                            productId     : item.product?.id,
                            productCode   : item.product?.productCode,
                            productName   : item.product?.name,
                            lotNumber     : item.lotNumber,
                            expirationDate: item.expirationDate,
                            quantity      : item.quantity,
                            receiptItems  : receiptItems.collect { ri ->
                                [
                                        id              : ri.id,
                                        productId       : ri.product?.id,
                                        productCode     : ri.product?.productCode,
                                        productName     : ri.product?.name,
                                        lotNumber       : ri.lotNumber,
                                        expirationDate  : ri.expirationDate,
                                        quantityReceived: ri.quantityReceived,
                                        comment         : ri.comment,
                                ]
                            },
                    ]
                },
        ]] as JSON)
    }

    /**
     * Data for the migrated goods receipt note print screen (mirrors the
     * legacy goodsReceiptNote/print.gsp view model). Receipt items are
     * ordered with split items first, like the legacy _body.gsp sort.
     */
    def goodsReceiptNotePrintData() {
        Shipment shipment = Shipment.get(params.id)
        if (!shipment) {
            response.status = HttpStatus.NOT_FOUND.value()
            render([errorCode: HttpStatus.NOT_FOUND.value(), errorMessage: "Shipment ${params.id} not found"] as JSON)
            return
        }
        String statusCode = shipment.status?.code?.name()
        String statusName = statusCode ? messageSource.getMessage("enum.ShipmentStatusCode.${statusCode}", null, statusCode, request?.locale) : null
        def receipts = shipment.receipts?.sort { it.dateCreated } ?: []
        def shipmentItems = shipment.sortShipmentItemsBySortOrder()?.findAll { it.receiptItems } ?: []
        render([data: [
                id                : shipment.id,
                shipmentNumber    : shipment.shipmentNumber,
                name              : shipment.name,
                status            : statusName,
                origin            : locationToJson(shipment.origin),
                destination       : locationToJson(shipment.destination),
                actualShippingDate: shipment.actualShippingDate,
                lastReceiptDate   : receipts ? receipts.last()?.actualDeliveryDate : null,
                receipts          : receipts.collect { [id: it.id, receiptNumber: it.receiptNumber] },
                shipmentItems     : shipmentItems.collect { ShipmentItem item ->
                    def receiptItems = item.receiptItems.sort { !it.isSplitItem }
                    [
                            id            : item.id,
                            productCode   : item.product?.productCode,
                            productName   : item.product?.displayNameOrDefaultName,
                            lotNumber     : item.inventoryItem?.lotNumber,
                            expirationDate: item.inventoryItem?.expirationDate,
                            unitOfMeasure : item.inventoryItem?.product?.unitOfMeasure,
                            quantityShipped: item.quantity,
                            hasSplit      : receiptItems.any { it.isSplitItem },
                            receiptItems  : receiptItems.collect { ri ->
                                [
                                        id              : ri.id,
                                        receiptId       : ri.receipt?.id,
                                        lotNumber       : ri.inventoryItem?.lotNumber,
                                        expirationDate  : ri.inventoryItem?.expirationDate,
                                        quantityShipped : ri.quantityShipped,
                                        quantityReceived: ri.quantityReceived,
                                        comment         : ri.comment,
                                        isSplitItem     : ri.isSplitItem,
                                ]
                            },
                    ]
                },
        ]] as JSON)
    }


    def shipmentService
    def inventoryService
    def locationService
    def userService
    def mailService
    def shipmentEventManager

    /**
     * Options needed by the create shipment wizard screens (mirrors the
     * selectShipmentOrigin/selectShipmentDestination/selectShipper taglibs
     * and the ShipmentType/ContainerType select boxes on the legacy GSPs).
     */
    def wizardOptions() {
        if (!requireManager()) {
            return
        }
        render([data: [
                shipmentTypes: ShipmentType.list().collect { [id: it.id, name: it.name] },
                origins      : locationService.getShipmentOrigins().sort { it?.name?.toLowerCase() }.collect {
                    [id: it.id, name: it.name, locationType: it.locationType?.name]
                },
                destinations : locationService.getShipmentDestinations().sort { it?.name?.toLowerCase() }.collect {
                    [id: it.id, name: it.name, locationType: it.locationType?.name]
                },
                shippers     : Shipper.list().sort { it?.name?.toLowerCase() }.collect { [id: it.id, name: it.name] },
                containerTypes: ContainerType.list().collect { [id: it.id, name: it.name] },
        ]] as JSON)
    }

    /**
     * Shipment details + workflow metadata for the wizard screens.
     */
    def read() {
        if (!requireManager()) {
            return
        }
        Shipment shipment = Shipment.get(params.id)
        if (!shipment) {
            renderNotFound()
            return
        }
        render([data: getWizardDetails(shipment)] as JSON)
    }

    /**
     * Mirrors the enterShipmentDetails "next"/"save" transitions: creates a
     * new shipment (no id) or updates the shipment details.
     */
    def saveDetails() {
        def jsonObject = request.JSON
        Shipment shipment
        if (params.id) {
            shipment = Shipment.get(params.id)
            if (!shipment) {
                renderNotFound()
                return
            }
        } else {
            shipment = new Shipment()
        }
        try {
            if (jsonObject.containsKey("name")) {
                shipment.name = jsonObject.name
            }
            if (jsonObject.containsKey("shipmentTypeId")) {
                shipment.shipmentType = jsonObject.shipmentTypeId ? ShipmentType.get(jsonObject.shipmentTypeId) : null
            }
            if (jsonObject.containsKey("originId")) {
                shipment.origin = jsonObject.originId ? Location.get(jsonObject.originId) : null
            }
            if (jsonObject.containsKey("destinationId")) {
                shipment.destination = jsonObject.destinationId ? Location.get(jsonObject.destinationId) : null
            }
            if (jsonObject.containsKey("expectedShippingDate")) {
                shipment.expectedShippingDate = parseDate(jsonObject.expectedShippingDate)
            }
            if (jsonObject.containsKey("expectedDeliveryDate")) {
                shipment.expectedDeliveryDate = parseDate(jsonObject.expectedDeliveryDate)
            }
            if (shipment.hasErrors() || !shipment.validate()) {
                renderValidationErrors(shipment)
                return
            }
            shipmentService.saveShipment(shipment)
        } catch (ValidationException e) {
            renderValidationException(e)
            return
        } catch (Exception e) {
            renderError(e.message)
            return
        }
        response.status = params.id ? 200 : 201
        render([data: getWizardDetails(shipment)] as JSON)
    }

    /**
     * Mirrors the enterTrackingDetails "next"/"save" transitions, including
     * the manual binding of the shipper (nested in shipmentMethod) and the
     * reference numbers declared on the shipment workflow.
     */
    def saveTracking() {
        Shipment shipment = Shipment.get(params.id)
        if (!shipment) {
            renderNotFound()
            return
        }
        def jsonObject = request.JSON
        ShipmentWorkflow shipmentWorkflow = shipmentService.getShipmentWorkflow(shipment)
        try {
            if (jsonObject.containsKey("carrierId")) {
                shipment.carrier = jsonObject.carrierId ? Person.get(jsonObject.carrierId) : null
            }
            if (jsonObject.containsKey("recipientId")) {
                shipment.recipient = jsonObject.recipientId ? Person.get(jsonObject.recipientId) : null
            }
            if (jsonObject.containsKey("statedValue")) {
                shipment.statedValue = jsonObject.statedValue != null && jsonObject.statedValue != "" ?
                        new BigDecimal(jsonObject.statedValue.toString()).floatValue() : null
            }
            if (jsonObject.containsKey("totalValue")) {
                shipment.totalValue = jsonObject.totalValue != null && jsonObject.totalValue != "" ?
                        new BigDecimal(jsonObject.totalValue.toString()).floatValue() : null
            }
            if (jsonObject.containsKey("additionalInformation")) {
                shipment.additionalInformation = jsonObject.additionalInformation
            }
            if (jsonObject.containsKey("shipperId")) {
                // mirrors bindShipper: no shipper input removes the entire shipment method
                if (jsonObject.shipperId) {
                    if (!shipment.shipmentMethod) {
                        shipment.shipmentMethod = new ShipmentMethod()
                    }
                    shipment.shipmentMethod.shipper = Shipper.get(jsonObject.shipperId)
                    shipment.shipmentMethod.trackingNumber = jsonObject.trackingNumber
                } else {
                    shipment.shipmentMethod = null
                }
            }
            if (jsonObject.containsKey("referenceNumbers")) {
                bindReferenceNumbers(shipment, shipmentWorkflow, jsonObject.referenceNumbers)
            }
            if (shipment.hasErrors() || !shipment.validate()) {
                renderValidationErrors(shipment)
                return
            }
            shipmentService.saveShipment(shipment)
        } catch (ValidationException e) {
            renderValidationException(e)
            return
        } catch (Exception e) {
            renderError(e.message)
            return
        }
        render([data: getWizardDetails(shipment)] as JSON)
    }

    /**
     * Containers and items for the packing screen (enterContainerDetails).
     */
    def packing() {
        if (!requireManager()) {
            return
        }
        Shipment shipment = Shipment.get(params.id)
        if (!shipment) {
            renderNotFound()
            return
        }
        render([data: getWizardDetails(shipment) + [
                containers   : shipment.findAllParentContainers()?.sort { it.sortOrder }?.collect { container ->
                    getContainerDetails(shipment, container)
                } ?: [],
                unpackedItems: shipment.unpackedShipmentItems?.collect { getItemDetails(it) } ?: [],
        ]] as JSON)
    }

    /**
     * Mirrors the addContainers flow event: creates one container per line of
     * the containerText for the given container type.
     */
    def createContainers() {
        Shipment shipment = Shipment.get(params.id)
        if (!shipment) {
            renderNotFound()
            return
        }
        def jsonObject = request.JSON
        try {
            shipmentService.createContainers(shipment.id, jsonObject.parentContainerId,
                    jsonObject.containerTypeId, jsonObject.containerText)
        } catch (ShipmentException e) {
            renderError(e.message)
            return
        }
        response.status = 201
        render([data: [id: shipment.id]] as JSON)
    }

    /**
     * Mirrors the deleteContainers / deleteContainersAndItems flow events.
     * When deleteItems is false a container that still contains items cannot
     * be deleted (like the legacy deleteContainers event).
     */
    def deleteContainer() {
        Shipment shipment = Shipment.get(params.id)
        Container container = Container.get(params.containerId)
        if (!shipment || !container || container.shipment?.id != shipment.id) {
            renderNotFound()
            return
        }
        boolean deleteItems = params.boolean("deleteItems", false)
        try {
            shipmentService.deleteContainers(shipment.id, [container.id], deleteItems)
        } catch (ShipmentException e) {
            renderError(e.message)
            return
        }
        render([data: [id: shipment.id]] as JSON)
    }

    /**
     * Mirrors the addShipmentItem flow event: adds an inventory item to the
     * shipment (optionally inside a container).
     */
    def addItem() {
        Shipment shipment = Shipment.get(params.id)
        if (!shipment) {
            renderNotFound()
            return
        }
        def jsonObject = request.JSON
        try {
            shipmentService.addToShipmentItems(shipment.id, jsonObject.containerId,
                    jsonObject.inventoryItemId, jsonObject.quantity as Integer)
        } catch (ValidationException e) {
            renderValidationException(e)
            return
        } catch (Exception e) {
            renderError(e.message)
            return
        }
        response.status = 201
        render([data: [id: shipment.id]] as JSON)
    }

    /**
     * Updates a shipment item (quantity and/or container), mirroring the
     * updateShipmentItem and moveItemToContainer flow events.
     */
    def updateItem() {
        Shipment shipment = Shipment.get(params.id)
        ShipmentItem shipmentItem = ShipmentItem.get(params.itemId)
        if (!shipment || !shipmentItem || shipmentItem.shipment?.id != shipment.id) {
            renderNotFound()
            return
        }
        def jsonObject = request.JSON
        try {
            if (jsonObject.containsKey("quantity")) {
                shipmentItem.quantity = jsonObject.quantity as Integer
            }
            if (jsonObject.containsKey("containerId")) {
                shipmentItem.container = jsonObject.containerId ? Container.get(jsonObject.containerId) : null
            }
            if (shipmentService.validateShipmentItem(shipmentItem)) {
                shipmentService.saveShipmentItem(shipmentItem)
            }
        } catch (ValidationException e) {
            shipmentItem.discard()
            renderValidationException(e)
            return
        } catch (Exception e) {
            shipmentItem.discard()
            renderError(e.message)
            return
        }
        render([data: getItemDetails(shipmentItem)] as JSON)
    }

    /**
     * Mirrors the deleteItem / deleteShipmentItem flow events.
     */
    def deleteItem() {
        Shipment shipment = Shipment.get(params.id)
        ShipmentItem shipmentItem = ShipmentItem.get(params.itemId)
        if (!shipment || !shipmentItem || shipmentItem.shipment?.id != shipment.id) {
            renderNotFound()
            return
        }
        try {
            shipmentService.deleteShipmentItem(shipmentItem)
        } catch (Exception e) {
            renderError(e.message)
            return
        }
        render([data: [id: shipment.id]] as JSON)
    }

    /**
     * Picklist data for the pickShipmentItems screen: shipment items in
     * picklist order plus, for each product, the quantity available in each
     * bin location at the origin.
     */
    def picklist() {
        if (!requireManager()) {
            return
        }
        Shipment shipment = Shipment.get(params.id)
        if (!shipment) {
            renderNotFound()
            return
        }
        Location location = Location.get(session.warehouse.id)
        def sortedItems = shipment.sortShipmentItems() ?: []
        def binLocationsByProduct = [:]
        sortedItems.collect { it.inventoryItem?.product }.unique().findAll { it }.each { product ->
            def binLocations = inventoryService.getProductQuantityByBinLocation(location, product)
            binLocationsByProduct[product.id] = binLocations.collect { entry ->
                [
                        binLocation  : entry.binLocation ? [id: entry.binLocation.id, name: entry.binLocation.name] : null,
                        inventoryItem: entry.inventoryItem ? [
                                id            : entry.inventoryItem.id,
                                lotNumber     : entry.inventoryItem.lotNumber,
                                expirationDate: entry.inventoryItem.expirationDate?.format("yyyy-MM-dd"),
                        ] : null,
                        quantity     : entry.quantity,
                ]
            }
        }
        render([data: getWizardDetails(shipment) + [
                shipmentItems        : sortedItems.collect { getItemDetails(it) },
                binLocationsByProduct: binLocationsByProduct,
                isOrigin             : shipment.origin?.id == session.warehouse.id,
        ]] as JSON)
    }

    /**
     * Mirrors the pickShipmentItem flow event: assigns the bin location,
     * inventory item and quantity of a picklist row.
     */
    def pickItem() {
        if (!requireManager()) {
            return
        }
        Shipment shipment = Shipment.get(params.id)
        ShipmentItem shipmentItem = ShipmentItem.get(params.itemId)
        if (!shipment || !shipmentItem || shipmentItem.shipment?.id != shipment.id) {
            renderNotFound()
            return
        }
        def jsonObject = request.JSON
        try {
            InventoryItem inventoryItem = jsonObject.inventoryItemId ?
                    InventoryItem.get(jsonObject.inventoryItemId) : null
            if (!inventoryItem) {
                renderError("Inventory item is a required field")
                return
            }
            shipmentItem.inventoryItem = inventoryItem
            shipmentItem.binLocation = jsonObject.binLocationId ? Location.get(jsonObject.binLocationId) : null
            shipmentItem.quantity = jsonObject.quantity as Integer
            if (shipmentService.validateShipmentItem(shipmentItem)) {
                shipmentItem.save(flush: true)
            }
        } catch (ValidationException e) {
            shipmentItem.discard()
            renderValidationException(e)
            return
        } catch (Exception e) {
            shipmentItem.discard()
            renderError(e.message)
            return
        }
        render([data: getItemDetails(shipmentItem)] as JSON)
    }

    /**
     * Mirrors the splitShipmentItem2 flow event: clones the shipment item
     * with quantity zero so a second bin/lot can be picked.
     */
    def splitItem() {
        if (!requireManager()) {
            return
        }
        Shipment shipment = Shipment.get(params.id)
        ShipmentItem shipmentItem = ShipmentItem.get(params.itemId)
        if (!shipment || !shipmentItem || shipmentItem.shipment?.id != shipment.id) {
            renderNotFound()
            return
        }
        ShipmentItem shipmentItemClone = shipmentItem.cloneShipmentItem()
        shipmentItemClone.quantity = 0
        shipment.addToShipmentItems(shipmentItemClone)
        shipment.save(flush: true)
        render([data: getItemDetails(shipmentItemClone)] as JSON)
    }

    /**
     * Mirrors the validatePicklist flow event. Returns per-item validation
     * errors keyed by shipment item id.
     */
    def validatePicklist() {
        if (!requireManager()) {
            return
        }
        Shipment shipment = Shipment.get(params.id)
        if (!shipment) {
            renderNotFound()
            return
        }
        try {
            shipmentService.validatePicklist(shipment)
        } catch (ValidationException e) {
            render([data: [valid: false, errors: e.errors.allErrors.collect { g.message(error: it) }]] as JSON)
            return
        }
        render([data: [valid: true, errors: []]] as JSON)
    }

    /**
     * Mirrors the clearPicklist flow event (superuser only, like the legacy
     * screen's isSuperuser-guarded button).
     */
    def clearPicklist() {
        if (!userService.isSuperuser(session?.user)) {
            response.status = 403
            render([errorCode: 403, errorMessage: "Only superusers can clear the picklist"] as JSON)
            return
        }
        Shipment shipment = Shipment.get(params.id)
        if (!shipment) {
            renderNotFound()
            return
        }
        shipmentService.clearPicklist(shipment)
        render([data: [id: shipment.id]] as JSON)
    }

    /**
     * Mirrors the sendShipmentAction flow state: validates the picklist,
     * sends the shipment (debiting stock) and triggers the notification
     * emails to the selected recipients.
     */
    def send() {
        if (!requireManager()) {
            return
        }
        Shipment shipment = Shipment.get(params.id)
        if (!shipment) {
            renderNotFound()
            return
        }
        def jsonObject = request.JSON
        User userInstance = User.get(session.user.id)
        Location warehouseInstance = Location.get(session.warehouse.id)
        try {
            shipmentService.validatePicklist(shipment)
            String shippingDateInput = jsonObject.actualShippingDate as String
            // dates with an explicit offset (like the legacy sendShipment form
            // sent) are parsed timezone-aware and validated against "now";
            // offset-less dates keep the wizard's server-timezone parsing
            boolean hasOffset = shippingDateInput && shippingDateInput ==~ /.*(Z|[+-]\d{2}:?\d{2})$/
            Date actualShippingDate = shippingDateInput ?
                    Date.parse(hasOffset ? "yyyy-MM-dd HH:mm XXX" : "yyyy-MM-dd HH:mm", shippingDateInput) : new Date()
            if (hasOffset && actualShippingDate > new Date()) {
                renderError(g.message(code: 'shipping.specifyValidShipmentDate.message') as String)
                return
            }
            boolean debitStockOnSend = jsonObject.containsKey("debitStockOnSend") ?
                    jsonObject.debitStockOnSend as Boolean : true
            shipmentService.sendShipment(shipment, jsonObject.comments as String, userInstance,
                    warehouseInstance, actualShippingDate, debitStockOnSend)
            // notification failures must never surface as a send failure
            // because the shipment has already been sent at this point
            try {
                def emailRecipients = new HashSet()
                jsonObject.emailRecipientIds?.each { recipientId ->
                    Person recipient = Person.get(recipientId)
                    if (recipient && recipient.email) {
                        emailRecipients.add(recipient)
                    }
                }
                triggerSendShipmentEmails(shipment, userInstance, emailRecipients)
            } catch (Exception e) {
                log.error("Error triggering send shipment emails: ${e.message}", e)
            }
        } catch (ValidationException e) {
            renderValidationException(e)
            return
        } catch (ShipmentException e) {
            renderError(e.message)
            return
        } catch (TransactionException e) {
            renderError(e.message)
            return
        } catch (Exception e) {
            renderError(e.message)
            return
        }
        render([data: getWizardDetails(shipment)] as JSON)
    }

    // ------------------------------------------------------------------
    // Batch 22: classic shipping screens (shipment/list, showDetails,
    // showPackingList, receiveShipment, sendShipment, shipmentItem/create)
    // ------------------------------------------------------------------

    /**
     * Backs the shipment list screen. Mirrors ShipmentController.list():
     * incoming lists shipments into the current warehouse, outgoing lists
     * shipments out of it, with the same filter set.
     */
    def list() {
        Integer max = Math.min(params.max ? params.int('max') : 100, 10000)
        boolean incoming = params?.type?.toUpperCase() == "INCOMING"
        Location origin = incoming ? (params.origin ? Location.get(params.origin) : null) : Location.get(session.warehouse.id)
        Location destination = incoming ? Location.get(session.warehouse.id) : (params.destination ? Location.get(params.destination) : null)
        ShipmentType shipmentType = params.shipmentType ? ShipmentType.get(params.shipmentType) : null
        ShipmentStatusCode statusCode = params.status ? ShipmentStatusCode.values().find { it.name() == params.status } : null
        if (params.status && !statusCode) {
            renderError("Invalid status: ${params.status}")
            return
        }
        Date lastUpdatedFrom = parseDate(params.lastUpdatedFrom)
        Date lastUpdatedTo = parseDate(params.lastUpdatedTo)

        List<Shipment> shipments = shipmentService.getShipments(params.terms, shipmentType, origin, destination,
                statusCode, null, null, lastUpdatedFrom, lastUpdatedTo, max)

        render([data: [
                shipments  : shipments.collect { getListDetails(it) },
                incoming   : incoming,
                origin     : origin?.id,
                destination: destination?.id,
                isSuperuser: userService.isSuperuser(session?.user),
        ]] as JSON)
    }

    /**
     * Filter options for the shipment list screen (mirrors the legacy
     * _filters.gsp selects).
     */
    def listOptions() {
        render([data: [
                shipmentTypes: ShipmentType.list().sort { it.sortOrder }.collect { [id: it.id, name: it.name] },
                statusCodes  : ShipmentStatusCode.values().collect { it.name() },
                locations    : Location.list().sort { it?.name?.toLowerCase() }.collect { [id: it.id, name: it.name] },
        ]] as JSON)
    }

    /**
     * Bulk actions from the shipment list screen (superuser only, like the
     * legacy isSuperuser-guarded buttons): delete, receive, markAsReceived
     * and rollback.
     */
    def bulkAction() {
        if (!userService.isSuperuser(session?.user)) {
            response.status = 403
            render([errorCode: 403, errorMessage: "Only superusers can perform bulk shipment actions"] as JSON)
            return
        }
        def jsonObject = request.JSON
        List shipmentIds = jsonObject.shipmentIds?.collect { it as String } ?: []
        String action = jsonObject.action as String
        try {
            switch (action) {
                case "delete":
                    shipmentIds.each { shipmentId ->
                        Shipment shipment = Shipment.get(shipmentId)
                        shipmentService.deleteShipment(shipment)
                    }
                    break
                case "receive":
                    shipmentService.receiveShipments(shipmentIds, null, session.user.id, session.warehouse.id, true)
                    break
                case "markAsReceived":
                    Location location = Location.load(session.warehouse.id)
                    shipmentIds.each { shipmentId ->
                        Shipment shipment = Shipment.load(shipmentId)
                        shipmentService.markAsReceived(shipment, location)
                    }
                    break
                case "rollback":
                    shipmentService.rollbackShipments(shipmentIds)
                    break
                default:
                    renderError("Unknown bulk action: ${action}")
                    return
            }
        } catch (Exception e) {
            renderError(e.message)
            return
        }
        render([data: [success: true, count: shipmentIds.size()]] as JSON)
    }

    /**
     * Backs the shipment showDetails screen: the wizard details plus the
     * contents/receipt/documents/comments/events/transactions/tracking tabs.
     */
    def showDetails() {
        Shipment shipment = Shipment.get(params.id)
        if (!shipment) {
            renderNotFound()
            return
        }
        def details = getWizardDetails(shipment)
        String trackingUrl = getTrackingUrl(shipment)
        details.putAll([
                requisitionId       : shipment.requisition?.id,
                wasReceived         : shipment.wasReceived(),
                isReceiveAllowed    : shipment.isReceiveAllowed(),
                isSendAllowed       : shipment.isSendAllowed(),
                actualDeliveryDate  : shipment.actualDeliveryDate?.format("yyyy-MM-dd HH:mm"),
                totalWeightInPounds : shipment.totalWeightInPounds(),
                timeToProcess       : shipment.timeToProcess()?.toString(),
                timeInCustoms       : shipment.timeInCustoms()?.toString(),
                timeInTransit       : shipment.timeInTransit()?.toString(),
                shipmentItems       : shipment.shipmentItems?.sort()?.collect { getShowItemDetails(it) } ?: [],
                receipt             : shipment.receipt ? getReceiptDetails(shipment.receipt) : null,
                documents           : shipment.documents?.collect {
                    [id: it.id, name: it.name, filename: it.filename, documentType: it.documentType?.name]
                } ?: [],
                comments            : shipment.comments?.sort { it.dateCreated }?.collect {
                    [id: it.id, comment: it.comment, sender: it.sender?.name, dateCreated: it.dateCreated?.format("yyyy-MM-dd HH:mm")]
                } ?: [],
                events              : shipment.events?.sort { it.eventDate }?.collect {
                    [id: it.id, eventType: it.eventType?.name, eventDate: it.eventDate?.format("yyyy-MM-dd HH:mm"), eventLocation: it.eventLocation?.name]
                } ?: [],
                transactions        : ((shipment.incomingTransactions ?: []) + (shipment.outgoingTransactions ?: [])).collect { transaction ->
                    [id: transaction.id, transactionDate: transaction.transactionDate?.format("yyyy-MM-dd HH:mm"),
                     transactionType: transaction.transactionType?.name, transactionNumber: transaction.transactionNumber]
                },
                trackingUrl         : trackingUrl,
                eventTypes          : EventType.list().collect { [id: it.id, name: it.name] },
                eventLocations      : Location.list().sort { it?.name?.toLowerCase() }.collect { [id: it.id, name: it.name] },
        ])
        render([data: details] as JSON)
    }

    /**
     * Adds a comment to a shipment (mirrors ShipmentController.saveComment).
     */
    def addComment() {
        if (!requireManager()) {
            return
        }
        Shipment shipment = Shipment.get(params.id)
        if (!shipment) {
            renderNotFound()
            return
        }
        def jsonObject = request.JSON
        User recipient = jsonObject.recipientId ? User.get(jsonObject.recipientId) : null
        shipmentService.addShipmentComment(shipment.id, jsonObject.comment as String, session.user, recipient)
        render([data: [success: true]] as JSON)
    }

    /**
     * Adds an event to a shipment (mirrors the add-event form on the legacy
     * showDetails events tab / ShipmentController.saveEvent).
     */
    def addEvent() {
        if (!requireManager()) {
            return
        }
        Shipment shipment = Shipment.get(params.id)
        if (!shipment) {
            renderNotFound()
            return
        }
        def jsonObject = request.JSON
        EventType eventType = EventType.get(jsonObject.eventTypeId)
        Location eventLocation = jsonObject.eventLocationId ? Location.get(jsonObject.eventLocationId) : Location.get(session.warehouse.id)
        Date eventDate = jsonObject.eventDate ? Date.parse("yyyy-MM-dd HH:mm", jsonObject.eventDate as String) : new Date()
        if (!eventType) {
            renderError("Event type is required")
            return
        }
        Event event = new Event(eventType: eventType, eventLocation: eventLocation, eventDate: eventDate)
        shipmentEventManager.createEvent(shipment, event)
        shipment.save(flush: true)
        render([data: [success: true]] as JSON)
    }

    /**
     * Backs the packing list screen (shipment/showPackingList): the shipment
     * items grouped by container with container dimensions.
     */
    def packingList() {
        Shipment shipment = Shipment.get(params.id)
        if (!shipment) {
            renderNotFound()
            return
        }
        render([data: [
                id           : shipment.id,
                name         : shipment.name,
                shipmentNumber: shipment.shipmentNumber,
                status       : shipment.status?.code?.name(),
                origin       : shipment.origin?.name,
                destination  : shipment.destination?.name,
                wasReceived  : shipment.wasReceived(),
                shipmentItems: shipment.shipmentItems?.sort()?.collect { ShipmentItem shipmentItem ->
                    def details = getShowItemDetails(shipmentItem)
                    Container container = shipmentItem.container
                    details.containerDetails = container ? [
                            id           : container.id,
                            name         : container.name,
                            containerType: container.containerType?.name,
                            parentName   : container.parentContainer?.name,
                            dimensions   : [height: container.height, width: container.width, length: container.length, volumeUnits: container.volumeUnits],
                            weight       : container.weight,
                            weightUnits  : container.weightUnits,
                    ] : null
                    details
                } ?: [],
        ]] as JSON)
    }

    /**
     * Backs the receive shipment screen: finds or creates the pending
     * receipt like ShipmentService.findOrCreateReceipt and returns it with
     * the bin location options of the current warehouse.
     */
    def receipt() {
        if (!requireManager()) {
            return
        }
        Shipment shipment = Shipment.get(params.id)
        if (!shipment) {
            renderNotFound()
            return
        }
        Location location = Location.get(session.warehouse.id)
        Receipt receiptInstance = shipmentService.findOrCreateReceipt(shipment)
        render([data: [
                shipment            : getWizardDetails(shipment),
                receipt             : getReceiptDetails(receiptInstance),
                isDestination       : shipment.destination?.id == location?.id,
                hasBinLocationSupport: location.hasBinLocationSupport(),
                binLocations        : location.hasBinLocationSupport() ?
                        Location.findAllByParentLocationAndActive(location, true).sort { it?.name?.toLowerCase() }.collect {
                            [id: it.id, name: it.name]
                        } : [],
        ]] as JSON)
    }

    /**
     * Saves the receipt (save / save-and-exit) or receives the shipment
     * (mirrors ShipmentController.receiveShipment POST handling).
     */
    def saveReceipt() {
        if (!requireManager()) {
            return
        }
        Shipment shipment = Shipment.get(params.id)
        if (!shipment) {
            renderNotFound()
            return
        }
        def jsonObject = request.JSON
        Receipt receiptInstance = shipment.receipt ?: shipmentService.findOrCreateReceipt(shipment)

        if (jsonObject.actualDeliveryDate) {
            receiptInstance.actualDeliveryDate = Date.parse("yyyy-MM-dd HH:mm", jsonObject.actualDeliveryDate as String)
        }
        receiptInstance.recipient = jsonObject.recipientId ? Person.get(jsonObject.recipientId) : null

        jsonObject.receiptItems?.each { itemInput ->
            ReceiptItem receiptItem = receiptInstance.receiptItems?.find { it.id == itemInput.id }
            if (receiptItem) {
                receiptItem.quantityReceived = itemInput.quantityReceived != null ? itemInput.quantityReceived as Integer : receiptItem.quantityReceived
                receiptItem.binLocation = itemInput.binLocationId ? Location.get(itemInput.binLocationId) : null
                receiptItem.comment = itemInput.comment
            }
        }

        if (receiptInstance.hasErrors() || !receiptInstance.validate()) {
            response.status = 400
            render([errorCode: 400, errorMessage: "Validation errors",
                    errors: receiptInstance.errors.allErrors.collect { g.message(error: it) }] as JSON)
            return
        }
        receiptInstance.save(flush: true)

        if (jsonObject.action == "receiveShipment") {
            try {
                shipmentService.receiveShipment(shipment.id, jsonObject.comment as String, session?.user?.id, session.warehouse?.id, true)
                // notification failures must never surface as a receive
                // failure because the shipment has already been received
                try {
                    triggerReceiveShipmentEmails(shipment, User.get(session.user.id))
                } catch (Exception e) {
                    log.error("Error triggering receive shipment emails: ${e.message}", e)
                }
            } catch (ValidationException e) {
                renderValidationException(e)
                return
            } catch (ShipmentException e) {
                renderError(e.message)
                return
            } catch (Exception e) {
                renderError(e.message)
                return
            }
        }
        render([data: [id: shipment.id, received: jsonObject.action == "receiveShipment"]] as JSON)
    }

    /**
     * Deletes the pending receipt so receiving can start over (mirrors
     * ShipmentController.deleteReceipt).
     */
    def deleteReceipt() {
        if (!requireManager()) {
            return
        }
        Shipment shipment = Shipment.get(params.id)
        if (!shipment || !shipment.receipt) {
            renderNotFound()
            return
        }
        Receipt receiptInstance = shipment.receipt
        shipment.removeFromReceipts(receiptInstance)
        receiptInstance.delete(flush: true)
        render([data: [id: shipment.id]] as JSON)
    }

    /**
     * Splits a receipt item in two so a quantity can be received into two
     * bins (mirrors ShipmentController.splitReceiptItem).
     */
    def splitReceiptItem() {
        if (!requireManager()) {
            return
        }
        Shipment shipment = Shipment.get(params.id)
        ReceiptItem receiptItem = ReceiptItem.get(params.receiptItemId)
        if (!shipment || !receiptItem || receiptItem.receipt?.shipment?.id != shipment.id) {
            renderNotFound()
            return
        }
        ReceiptItem receiptItemClone = new ReceiptItem(receiptItem.properties)
        receiptItemClone.quantityReceived = 0
        receiptItem.receipt.addToReceiptItems(receiptItemClone)
        receiptItem.receipt.save(flush: true)
        render([data: [id: shipment.id]] as JSON)
    }

    /**
     * Deletes a receipt item (mirrors ShipmentController.deleteReceiptItem,
     * including the guard against deleting the last receipt item of a
     * shipment item).
     */
    def deleteReceiptItem() {
        if (!requireManager()) {
            return
        }
        Shipment shipment = Shipment.get(params.id)
        ReceiptItem receiptItem = ReceiptItem.get(params.receiptItemId)
        if (!shipment || !receiptItem || receiptItem.receipt?.shipment?.id != shipment.id) {
            renderNotFound()
            return
        }
        if (receiptItem.shipmentItem?.receiptItems?.size() <= 1) {
            renderError(g.message(code: "shipping.mustHaveAtLeastOneReceiptItemPerShimentItem", default: "Shipment must have at least one receipt item per shipment item"))
            return
        }
        receiptItem.receipt.removeFromReceiptItems(receiptItem)
        receiptItem.shipmentItem.removeFromReceiptItems(receiptItem)
        receiptItem.delete(flush: true)
        render([data: [id: shipment.id]] as JSON)
    }

    /**
     * Putaway (bin) locations with quantity on hand for a receipt item's
     * product (mirrors ShipmentController.showPutawayLocations).
     */
    def putawayLocations() {
        if (!requireManager()) {
            return
        }
        Shipment shipment = Shipment.get(params.id)
        ReceiptItem receiptItem = ReceiptItem.get(params.receiptItemId)
        if (!shipment || !receiptItem || receiptItem.receipt?.shipment?.id != shipment.id) {
            renderNotFound()
            return
        }
        Location location = Location.get(session.warehouse.id)
        Product product = receiptItem.inventoryItem?.product
        def binLocations = inventoryService.getProductQuantityByBinLocation(location, product)
        render([data: binLocations.collect {
            [binLocation: it.binLocation?.name ?: "Default", lotNumber: it.inventoryItem?.lotNumber, quantity: it.quantity]
        }] as JSON)
    }

    /**
     * Options for the admin shipmentItem/create screen (mirrors the legacy
     * scaffolded create.gsp selects).
     */
    def itemCreateOptions() {
        if (!requireManager()) {
            return
        }
        render([data: [
                shipments     : Shipment.list().sort { it?.name?.toLowerCase() }.collect { [id: it.id, name: "${it.shipmentNumber} ${it.name}".toString()] },
                containers    : Container.list().collect { [id: it.id, name: "${it.shipment?.shipmentNumber} ${it.name}".toString()] },
                products      : Product.list().sort { it?.name?.toLowerCase() }.collect { [id: it.id, name: it.name, productCode: it.productCode] },
                inventoryItems: InventoryItem.list().collect { [id: it.id, name: "${it.product?.productCode} ${it.lotNumber ?: ''}".toString()] },
                recipients    : Person.list().sort { it?.name?.toLowerCase() }.collect { [id: it.id, name: it.name] },
                donors        : Donor.list().sort { it?.name?.toLowerCase() }.collect { [id: it.id, name: it.name] },
        ]] as JSON)
    }

    /**
     * Creates a standalone shipment item (mirrors the legacy admin
     * ShipmentItemController.save).
     */
    def createItem() {
        if (!requireManager()) {
            return
        }
        def jsonObject = request.JSON
        Shipment shipment = jsonObject.shipmentId ? Shipment.get(jsonObject.shipmentId) : null
        if (!shipment) {
            renderError("Shipment is required")
            return
        }
        ShipmentItem shipmentItem = new ShipmentItem(
                container: jsonObject.containerId ? Container.get(jsonObject.containerId) : null,
                product: jsonObject.productId ? Product.get(jsonObject.productId) : null,
                lotNumber: jsonObject.lotNumber ?: null,
                expirationDate: parseDate(jsonObject.expirationDate),
                quantity: jsonObject.quantity != null ? jsonObject.quantity as Integer : 0,
                recipient: jsonObject.recipientId ? Person.get(jsonObject.recipientId) : null,
                inventoryItem: jsonObject.inventoryItemId ? InventoryItem.get(jsonObject.inventoryItemId) : null,
                donor: jsonObject.donorId ? Donor.get(jsonObject.donorId) : null,
        )
        shipment.addToShipmentItems(shipmentItem)
        if (shipmentItem.hasErrors() || !shipmentItem.validate()) {
            response.status = 400
            render([errorCode: 400, errorMessage: "Validation errors",
                    errors: shipmentItem.errors.allErrors.collect { g.message(error: it) }] as JSON)
            return
        }
        shipment.save(flush: true)
        response.status = 201
        render([data: getItemDetails(shipmentItem)] as JSON)
    }

    private Map getListDetails(Shipment shipment) {
        [
                id                  : shipment.id,
                shipmentNumber      : shipment.shipmentNumber,
                name                : shipment.name,
                status              : shipment.status?.code?.name(),
                shipmentType        : shipment.shipmentType?.name,
                origin              : shipment.origin?.name,
                destination         : shipment.destination?.name,
                shipmentItemCount   : shipment.shipmentItems?.size() ?: 0,
                hasShipped          : shipment.hasShipped(),
                wasReceived         : shipment.wasReceived(),
                expectedShippingDate: shipment.expectedShippingDate?.format("yyyy-MM-dd"),
                actualShippingDate  : shipment.actualShippingDate?.format("yyyy-MM-dd"),
                expectedDeliveryDate: shipment.expectedDeliveryDate?.format("yyyy-MM-dd"),
                actualDeliveryDate  : shipment.actualDeliveryDate?.format("yyyy-MM-dd"),
                lastUpdated         : shipment.lastUpdated?.format("yyyy-MM-dd HH:mm"),
                requisitionId       : shipment.requisition?.id,
        ]
    }

    private Map getShowItemDetails(ShipmentItem shipmentItem) {
        def details = getItemDetails(shipmentItem)
        details.putAll([
                quantityReceived        : shipmentItem.quantityReceived(),
                quantityCanceled        : shipmentItem.quantityCanceled(),
                isFullyReceived         : shipmentItem.isFullyReceived(),
                lotNumber               : shipmentItem.lotNumber,
                expirationDate          : shipmentItem.expirationDate?.format("yyyy-MM-dd"),
        ])
        return details
    }

    private Map getReceiptDetails(Receipt receipt) {
        [
                id                : receipt.id,
                receiptStatusCode : receipt.receiptStatusCode?.name(),
                actualDeliveryDate: receipt.actualDeliveryDate?.format("yyyy-MM-dd HH:mm"),
                expectedDeliveryDate: receipt.expectedDeliveryDate?.format("yyyy-MM-dd HH:mm"),
                recipient         : receipt.recipient ? [id: receipt.recipient.id, name: receipt.recipient.name] : null,
                receiptItems      : receipt.receiptItems?.sort { a, b ->
                    (a.shipmentItem <=> b.shipmentItem) ?: (a.dateCreated <=> b.dateCreated)
                }?.collect { ReceiptItem receiptItem ->
                    [
                            id               : receiptItem.id,
                            shipmentItemId   : receiptItem.shipmentItem?.id,
                            container        : receiptItem.shipmentItem?.container?.name,
                            product          : receiptItem.product ? [id: receiptItem.product.id, productCode: receiptItem.product.productCode, name: receiptItem.product.name] : null,
                            lotNumber        : receiptItem.inventoryItem?.lotNumber ?: receiptItem.lotNumber,
                            expirationDate   : receiptItem.inventoryItem?.expirationDate?.format("yyyy-MM-dd"),
                            quantityShipped  : receiptItem.quantityShipped,
                            quantityReceived : receiptItem.quantityReceived,
                            binLocation      : receiptItem.binLocation ? [id: receiptItem.binLocation.id, name: receiptItem.binLocation.name] : null,
                            comment          : receiptItem.comment,
                            isSplitAllowed   : true,
                            isDeleteAllowed  : (receiptItem.shipmentItem?.receiptItems?.size() ?: 0) > 1,
                    ]
                } ?: [],
        ]
    }

    private String getTrackingUrl(Shipment shipment) {
        String trackingUrlTemplate = shipment?.shipmentMethod?.shipper?.trackingUrl
        String trackingNumber = shipment?.shipmentMethod?.trackingNumber
        if (!trackingUrlTemplate) {
            return null
        }
        if (trackingNumber && trackingUrlTemplate.contains("%s")) {
            return String.format(trackingUrlTemplate, trackingNumber)
        }
        return StrSubstitutor.replace(trackingUrlTemplate, [trackingNumber: trackingNumber])
    }

    private void triggerReceiveShipmentEmails(Shipment shipmentInstance, User userInstance) {
        if (shipmentInstance.hasErrors()) {
            return
        }
        Set<Person> recipients = new HashSet<Person>()
        def adminList = userService.findUsersByRoleType(RoleType.ROLE_SHIPMENT_NOTIFICATION)
        adminList.each { adminUser ->
            if (adminUser?.email) {
                recipients.add(adminUser)
            }
        }
        if (userInstance?.email) {
            recipients.add(userInstance)
        }
        shipmentInstance?.recipients?.each { recipient ->
            recipients.add(recipient)
        }
        def shipmentName = "${shipmentInstance.name}"
        def shipmentType = "${shipmentInstance.shipmentType?.name}"
        def shipmentDate = "${shipmentInstance?.actualDeliveryDate?.format('MMMMM dd yyyy')}"
        def subject = "${g.message(code: 'shipment.hasBeenReceived.message', args: [shipmentType, shipmentName, shipmentDate])}"
        def body = g.render(template: "/email/shipmentReceived", model: [shipmentInstance: shipmentInstance, userInstance: userInstance])
        def toList = recipients?.collect { it?.email }?.findAll { it }?.unique()
        mailService.sendHtmlMail(subject, body.toString(), toList)
    }

    private void bindReferenceNumbers(Shipment shipment, ShipmentWorkflow workflow, referenceNumbersInput) {
        for (ReferenceNumberType type in workflow?.referenceNumberTypes) {
            ReferenceNumber referenceNumber = shipment.referenceNumbers?.find {
                it.referenceNumberType.id == type.id
            }
            def identifier = referenceNumbersInput?."${type.id}"
            if (identifier) {
                if (referenceNumber) {
                    referenceNumber.identifier = identifier
                } else {
                    shipment.addToReferenceNumbers(new ReferenceNumber(
                            identifier: identifier, referenceNumberType: type))
                }
            } else if (referenceNumber) {
                shipment.removeFromReferenceNumbers(referenceNumber)
                referenceNumber.delete()
            }
        }
    }

    private void triggerSendShipmentEmails(Shipment shipmentInstance, User userInstance, Set<Person> recipients) {
        if (!recipients) recipients = new HashSet<Person>()
        def adminList = userService.findUsersByRoleType(RoleType.ROLE_SHIPMENT_NOTIFICATION)
        adminList.each { adminUser ->
            if (adminUser?.email) {
                recipients.add(adminUser)
            }
        }
        if (userInstance) {
            recipients.add(userInstance)
        }
        if (!shipmentInstance.hasErrors()) {
            def shipmentName = "${shipmentInstance.name}"
            def shipmentType = "${shipmentInstance.shipmentType?.name}"
            def shipmentDate = "${shipmentInstance?.actualShippingDate?.format('MMMMM dd yyyy')}"
            def subject = "${g.message(code: 'shipment.hasBeenShipped.message', args: [shipmentType, shipmentName, shipmentDate])}"
            def body = g.render(template: "/email/shipmentShipped", model: [shipmentInstance: shipmentInstance, userInstance: userInstance])
            def toList = recipients?.collect { it?.email }?.unique()
            try {
                mailService.sendHtmlMail(subject, body.toString(), toList)
            } catch (Exception e) {
                log.error "Error triggering send shipment emails " + e.message
            }
        }
    }

    private Map getWizardDetails(Shipment shipment) {
        ShipmentWorkflow shipmentWorkflow = shipmentService.getShipmentWorkflow(shipment)
        [
                id                  : shipment.id,
                name                : shipment.name,
                shipmentNumber      : shipment.shipmentNumber,
                status              : shipment.status?.code?.name(),
                hasShipped          : shipment.hasShipped(),
                shipmentType        : shipment.shipmentType ? [id: shipment.shipmentType.id, name: shipment.shipmentType.name] : null,
                origin              : shipment.origin ? [id: shipment.origin.id, name: shipment.origin.name, isWarehouse: shipment.origin.isWarehouse()] : null,
                destination         : shipment.destination ? [id: shipment.destination.id, name: shipment.destination.name] : null,
                expectedShippingDate: shipment.expectedShippingDate?.format("yyyy-MM-dd"),
                expectedDeliveryDate: shipment.expectedDeliveryDate?.format("yyyy-MM-dd"),
                actualShippingDate  : shipment.actualShippingDate?.format("yyyy-MM-dd HH:mm"),
                carrier             : shipment.carrier ? [id: shipment.carrier.id, name: shipment.carrier.name, email: shipment.carrier.email] : null,
                recipient           : shipment.recipient ? [id: shipment.recipient.id, name: shipment.recipient.name, email: shipment.recipient.email] : null,
                shipper             : shipment.shipmentMethod?.shipper ? [id: shipment.shipmentMethod.shipper.id, name: shipment.shipmentMethod.shipper.name] : null,
                trackingNumber      : shipment.shipmentMethod?.trackingNumber,
                statedValue         : shipment.statedValue,
                totalValue          : shipment.totalValue,
                additionalInformation: shipment.additionalInformation,
                referenceNumbers    : shipment.referenceNumbers?.collect {
                    [id: it.id, identifier: it.identifier, referenceNumberType: [id: it.referenceNumberType?.id, name: it.referenceNumberType?.name]]
                } ?: [],
                shipmentItemCount   : shipment.shipmentItems?.size() ?: 0,
                itemRecipients      : shipment.allShipmentItems?.findAll { it.recipient }?.collect { it.recipient }?.unique { it.id }?.collect {
                    [id: it.id, name: it.name, email: it.email]
                } ?: [],
                workflow            : shipmentWorkflow ? [
                        id                  : shipmentWorkflow.id,
                        name                : shipmentWorkflow.name,
                        excludedFields      : shipmentWorkflow.excludedFields?.split(",")?.toList() ?: [],
                        referenceNumberTypes: shipmentWorkflow.referenceNumberTypes?.collect { [id: it.id, name: it.name] } ?: [],
                ] : null,
        ]
    }

    private Map getContainerDetails(Shipment shipment, Container container) {
        [
                id             : container.id,
                name           : container.name,
                sortOrder      : container.sortOrder,
                containerType  : container.containerType ? [id: container.containerType.id, name: container.containerType.name] : null,
                itemCount      : container.shipmentItems?.size() ?: 0,
                shipmentItems  : container.shipmentItems?.collect { getItemDetails(it) } ?: [],
                childContainers: shipment.findAllChildContainers(container)?.sort()?.collect { child ->
                    [
                            id           : child.id,
                            name         : child.name,
                            containerType: child.containerType ? [id: child.containerType.id, name: child.containerType.name] : null,
                            itemCount    : child.shipmentItems?.size() ?: 0,
                            shipmentItems: child.shipmentItems?.collect { getItemDetails(it) } ?: [],
                    ]
                } ?: [],
        ]
    }

    private Map getItemDetails(ShipmentItem shipmentItem) {
        Product product = shipmentItem.inventoryItem?.product ?: shipmentItem.product
        [
                id           : shipmentItem.id,
                quantity     : shipmentItem.quantity,
                product      : product ? [
                        id           : product.id,
                        productCode  : product.productCode,
                        name         : product.name,
                        unitOfMeasure: product.unitOfMeasure,
                ] : null,
                inventoryItem: shipmentItem.inventoryItem ? [
                        id            : shipmentItem.inventoryItem.id,
                        lotNumber     : shipmentItem.inventoryItem.lotNumber,
                        expirationDate: shipmentItem.inventoryItem.expirationDate?.format("yyyy-MM-dd"),
                ] : null,
                binLocation  : shipmentItem.binLocation ? [id: shipmentItem.binLocation.id, name: shipmentItem.binLocation.name] : null,
                container    : shipmentItem.container ? [id: shipmentItem.container.id, name: shipmentItem.container.name] : null,
                recipient    : shipmentItem.recipient ? [id: shipmentItem.recipient.id, name: shipmentItem.recipient.name, email: shipmentItem.recipient.email] : null,
        ]
    }

    private Date parseDate(value) {
        return value ? Date.parse("yyyy-MM-dd", value as String) : null
    }

    /**
     * The legacy webflow controller required the manager role for every
     * action (RoleInterceptor treats all *Workflow controllers as manager
     * only). Actions whose names match the interceptor's change-action
     * prefixes (save*, create*, delete*, add*, update*) are already covered;
     * this guard applies the same requirement to the remaining actions,
     * including the read-only ones the legacy workflow also gated.
     */
    private boolean requireManager() {
        if (!userService.isUserManager(session?.user)) {
            response.status = 403
            render([errorCode: 403, errorMessage: "Manager role required"] as JSON)
            return false
        }
        return true
    }

    private void renderNotFound() {
        response.status = 404
        render([errorCode: 404, errorMessage: "Shipment ${params.id} not found"] as JSON)
    }

    private void renderError(String message) {
        response.status = 400
        render([errorCode: 400, errorMessage: message] as JSON)
    }

    private void renderValidationErrors(Shipment shipment) {
        response.status = 400
        render([errorCode: 400, errorMessage: "Validation errors",
                errors: shipment.errors.allErrors.collect { g.message(error: it) }] as JSON)
    }

    private void renderValidationException(ValidationException e) {
        response.status = 400
        render([errorCode: 400, errorMessage: "Validation errors",
                errors: e.errors.allErrors.collect { g.message(error: it) }] as JSON)
    }
}
