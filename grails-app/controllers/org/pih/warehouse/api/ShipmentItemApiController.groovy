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
import grails.validation.ValidationException
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.http.HttpStatus

import org.pih.warehouse.core.Location
import org.pih.warehouse.core.Person
import org.pih.warehouse.donation.Donor
import org.pih.warehouse.inventory.InventoryItem
import org.pih.warehouse.product.Product
import org.pih.warehouse.shipping.Container
import org.pih.warehouse.shipping.Shipment
import org.pih.warehouse.shipping.ShipmentItem

/**
 * REST endpoints backing the React screens that replaced the legacy
 * shipmentItem scaffold GSPs (Phase 2, Batch 23): list, show, edit,
 * pick and split.
 */
@Transactional
class ShipmentItemApiController {

    private static final List<String> SORTABLE_PROPERTIES = [
            "id", "lotNumber", "expirationDate", "quantity", "dateCreated", "lastUpdated",
    ]

    def inventoryService
    def userService

    def list() {
        Integer max = Math.min(params.max ? params.int('max') : 10, 100)
        Integer offset = params.offset ? params.int('offset') : 0
        String sortOrder = params.order == 'desc' ? 'desc' : 'asc'
        String sort = params.sort in SORTABLE_PROPERTIES ? params.sort : 'id'
        def results = ShipmentItem.createCriteria().list(max: max, offset: offset) {
            order(sort, sortOrder)
        }
        render([data: results.collect { toListJson(it) }, totalCount: results.totalCount] as JSON)
    }

    def read() {
        ShipmentItem shipmentItem = ShipmentItem.get(params.id)
        if (!shipmentItem) {
            renderNotFound()
            return
        }
        render([data: toDetailJson(shipmentItem)] as JSON)
    }

    def update() {
        ShipmentItem shipmentItem = ShipmentItem.get(params.id)
        if (!shipmentItem) {
            renderNotFound()
            return
        }
        bindShipmentItem(shipmentItem, request.JSON)
        if (shipmentItem.hasErrors() || !shipmentItem.save(flush: true)) {
            throw new ValidationException("Invalid shipment item", shipmentItem.errors)
        }
        render([data: toDetailJson(shipmentItem)] as JSON)
    }

    def delete() {
        ShipmentItem shipmentItem = ShipmentItem.get(params.id)
        if (!shipmentItem) {
            renderNotFound()
            return
        }
        try {
            shipmentItem.delete(flush: true)
        } catch (DataIntegrityViolationException ignored) {
            transactionStatus.setRollbackOnly()
            String message = "${warehouse.message(code: 'default.not.deleted.message', args: [warehouse.message(code: 'shipmentItem.label', default: 'ShipmentItem'), params.id])}"
            response.status = HttpStatus.BAD_REQUEST.value()
            render([errorCode: HttpStatus.BAD_REQUEST.value(), errorMessage: message] as JSON)
            return
        }
        render status: HttpStatus.NO_CONTENT.value()
    }

    /**
     * Option lists for the edit screen selects. Mirrors the legacy edit GSP,
     * which rendered full Container/Product/Person/InventoryItem/Donor/
     * Shipment lists into its select boxes.
     */
    def options() {
        render([data: [
                containers    : Container.list().collect { [id: it.id, label: it.toString()] },
                products      : Product.list().collect { [id: it.id, label: it.toString()] },
                recipients    : Person.list().collect { [id: it.id, label: it.name] },
                inventoryItems: InventoryItem.list().collect { [id: it.id, label: it.toString()] },
                donors        : Donor.list().collect { [id: it.id, label: it.toString()] },
                shipments     : Shipment.list().collect { [id: it.id, label: it.name] },
        ]] as JSON)
    }

    /**
     * Data for the pick/split screens: shipment item details plus the
     * quantity available in each bin location for the item's product at the
     * current location (like the legacy pick/split GSP models), and the
     * previous/next items in picklist order.
     */
    def pickContext() {
        ShipmentItem shipmentItem = ShipmentItem.get(params.id)
        if (!shipmentItem) {
            renderNotFound()
            return
        }
        Location location = Location.get(session.warehouse.id)
        List binLocations = inventoryService.getProductQuantityByBinLocation(location, shipmentItem.product)
        List sortedItems = shipmentItem.shipment?.sortShipmentItems() ?: []
        Integer index = sortedItems.findIndexOf { it.id == shipmentItem.id }
        ShipmentItem previousItem = sortedItems ? sortedItems.get(index <= 0 ? sortedItems.size() - 1 : index - 1) : null
        ShipmentItem nextItem = sortedItems ? sortedItems.get(index >= sortedItems.size() - 1 ? 0 : index + 1) : null
        render([data: [
                shipmentItem  : toDetailJson(shipmentItem),
                shipmentId    : shipmentItem.shipment?.id,
                previousItemId: previousItem?.id,
                nextItemId    : nextItem?.id,
                binLocations  : binLocations.collect { entry ->
                    [
                            binLocation  : entry.binLocation ? [id: entry.binLocation.id, name: entry.binLocation.name] : null,
                            inventoryItem: entry.inventoryItem ? [
                                    id            : entry.inventoryItem.id,
                                    lotNumber     : entry.inventoryItem.lotNumber,
                                    expirationDate: entry.inventoryItem.expirationDate?.format("yyyy-MM-dd"),
                            ] : null,
                            quantity     : entry.quantity,
                    ]
                },
        ]] as JSON)
    }

    /**
     * Mirrors the legacy splitShipmentItem flow event: reduces the original
     * item by the split quantity and clones it into a new item with the
     * selected bin location, inventory item and split quantity.
     */
    def split() {
        if (!requireManager()) {
            return
        }
        ShipmentItem shipmentItem = ShipmentItem.get(params.id)
        if (!shipmentItem) {
            renderNotFound()
            return
        }
        def jsonObject = request.JSON
        Integer currentQuantity = shipmentItem.quantity
        Integer splitQuantity
        try {
            splitQuantity = jsonObject.splitQuantity as Integer
        } catch (Exception ignored) {
            renderError("Quantity is invalid")
            return
        }
        Integer newQuantity = currentQuantity - (splitQuantity ?: 0)
        if (!splitQuantity || splitQuantity <= 0 || newQuantity <= 0) {
            renderError("Quantity is invalid")
            return
        }
        InventoryItem inventoryItem = jsonObject.inventoryItemId ?
                InventoryItem.get(jsonObject.inventoryItemId) : null
        if (!inventoryItem) {
            renderError("Inventory item is a required field")
            return
        }
        Location binLocation = jsonObject.binLocationId ? Location.get(jsonObject.binLocationId) : null

        shipmentItem.quantity = newQuantity
        ShipmentItem splitItem = shipmentItem.cloneShipmentItem()
        splitItem.inventoryItem = inventoryItem
        splitItem.binLocation = binLocation
        splitItem.quantity = splitQuantity
        shipmentItem.shipment.addToShipmentItems(splitItem)
        if (!shipmentItem.shipment.save(flush: true)) {
            transactionStatus.setRollbackOnly()
            List<String> errorMessages = shipmentItem.shipment.errors.allErrors.collect {
                g.message(error: it) as String
            }
            renderError(errorMessages ? errorMessages.join("; ") : "Failed to split shipment item due to an unknown error")
            return
        }
        render([data: [
                originalItem: toDetailJson(shipmentItem),
                splitItem   : toDetailJson(splitItem),
        ]] as JSON)
    }

    /**
     * The legacy SecurityFilters already require a manager role for change
     * actions matched by name (save*, create*, delete*, add*, update*); this
     * guard applies the same requirement to split, which that convention
     * does not cover.
     */
    private boolean requireManager() {
        if (!userService.isUserManager(session?.user)) {
            response.status = 403
            render([errorCode: 403, errorMessage: "Manager role required"] as JSON)
            return false
        }
        return true
    }

    private void bindShipmentItem(ShipmentItem shipmentItem, jsonObject) {
        if (jsonObject.containsKey("container")) {
            shipmentItem.container = getAssociationId(jsonObject.container) ? Container.get(getAssociationId(jsonObject.container)) : null
        }
        if (jsonObject.containsKey("product")) {
            shipmentItem.product = getAssociationId(jsonObject.product) ? Product.get(getAssociationId(jsonObject.product)) : null
        }
        if (jsonObject.containsKey("lotNumber")) {
            shipmentItem.lotNumber = jsonObject.lotNumber ?: null
        }
        if (jsonObject.containsKey("expirationDate")) {
            shipmentItem.expirationDate = jsonObject.expirationDate ?
                    Date.parse("yyyy-MM-dd", jsonObject.expirationDate as String) : null
        }
        if (jsonObject.containsKey("quantity")) {
            shipmentItem.quantity = jsonObject.quantity != null && jsonObject.quantity.toString() != "" ?
                    jsonObject.quantity as Integer : null
        }
        if (jsonObject.containsKey("recipient")) {
            shipmentItem.recipient = getAssociationId(jsonObject.recipient) ? Person.get(getAssociationId(jsonObject.recipient)) : null
        }
        if (jsonObject.containsKey("inventoryItem")) {
            shipmentItem.inventoryItem = getAssociationId(jsonObject.inventoryItem) ? InventoryItem.get(getAssociationId(jsonObject.inventoryItem)) : null
        }
        if (jsonObject.containsKey("donor")) {
            shipmentItem.donor = getAssociationId(jsonObject.donor) ? Donor.get(getAssociationId(jsonObject.donor)) : null
        }
        if (jsonObject.containsKey("shipment")) {
            shipmentItem.shipment = getAssociationId(jsonObject.shipment) ? Shipment.get(getAssociationId(jsonObject.shipment)) : null
        }
        shipmentItem.validate()
    }

    private static String getAssociationId(value) {
        return value instanceof Map ? value.id : value
    }

    private static Map toListJson(ShipmentItem shipmentItem) {
        [
                id            : shipmentItem.id,
                container     : shipmentItem.container ? [id: shipmentItem.container.id, name: shipmentItem.container.toString()] : null,
                product       : shipmentItem.product ? [
                        id         : shipmentItem.product.id,
                        productCode: shipmentItem.product.productCode,
                        name       : shipmentItem.product.name,
                ] : null,
                lotNumber     : shipmentItem.lotNumber,
                expirationDate: shipmentItem.expirationDate?.format("yyyy-MM-dd"),
                quantity      : shipmentItem.quantity,
                dateCreated   : shipmentItem.dateCreated,
                lastUpdated   : shipmentItem.lastUpdated,
        ]
    }

    private static Map toDetailJson(ShipmentItem shipmentItem) {
        toListJson(shipmentItem) + [
                version      : shipmentItem.version,
                recipient    : shipmentItem.recipient ? [id: shipmentItem.recipient.id, name: shipmentItem.recipient.name] : null,
                inventoryItem: shipmentItem.inventoryItem ? [
                        id            : shipmentItem.inventoryItem.id,
                        lotNumber     : shipmentItem.inventoryItem.lotNumber,
                        expirationDate: shipmentItem.inventoryItem.expirationDate?.format("yyyy-MM-dd"),
                ] : null,
                donor        : shipmentItem.donor ? [id: shipmentItem.donor.id, name: shipmentItem.donor.toString()] : null,
                binLocation  : shipmentItem.binLocation ? [id: shipmentItem.binLocation.id, name: shipmentItem.binLocation.name] : null,
                shipment     : shipmentItem.shipment ? [id: shipmentItem.shipment.id, name: shipmentItem.shipment.name] : null,
                orderItems   : shipmentItem.orderItems?.collect { [id: it.id, name: it.toString()] } ?: [],
                unitOfMeasure: shipmentItem.product?.unitOfMeasure,
        ]
    }

    private void renderNotFound() {
        response.status = HttpStatus.NOT_FOUND.value()
        render([errorCode: HttpStatus.NOT_FOUND.value(), errorMessage: "Shipment item ${params.id} not found"] as JSON)
    }

    private void renderError(String message) {
        response.status = HttpStatus.BAD_REQUEST.value()
        render([errorCode: HttpStatus.BAD_REQUEST.value(), errorMessage: message] as JSON)
    }
}
