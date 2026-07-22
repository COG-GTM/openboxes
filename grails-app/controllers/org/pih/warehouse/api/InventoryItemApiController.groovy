package org.pih.warehouse.api

import grails.converters.JSON
import grails.gorm.transactions.Transactional
import org.pih.warehouse.core.Constants
import org.pih.warehouse.core.Location
import org.pih.warehouse.inventory.InventoryItem
import org.pih.warehouse.inventory.InventoryItemDataService
import org.pih.warehouse.product.Product

/**
 * REST API for managing inventory items (lot numbers) backing the React
 * "Lot Numbers" screen (Phase 2 Batch 4). Mirrors the behavior and
 * permission checks of the legacy InventoryItemController actions
 * (create/update/delete/recall/revertRecall).
 */
class InventoryItemApiController {

    def inventoryService
    def userService
    def productAvailabilityService
    InventoryItemDataService inventoryItemDataService

    def list() {
        Product product = Product.get(params.productId ?: params?.product?.id)
        if (!product) {
            response.status = 404
            render([errorMessage: "Product not found"] as JSON)
            return
        }
        List<InventoryItem> inventoryItems = inventoryService.getInventoryItemsByProduct(product)
        render([data: inventoryItems.collect { toJson(it) }] as JSON)
    }

    @Transactional
    def create() {
        Product product = Product.get(request.JSON?.product?.id ?: params?.product?.id)
        if (!product) {
            response.status = 400
            render([errorMessage: "Product is required"] as JSON)
            return
        }
        String lotNumber = request.JSON?.lotNumber ?: params.lotNumber
        Date expirationDate = parseDate(request.JSON?.expirationDate ?: params.expirationDate)

        if (product.lotAndExpiryControl && (!expirationDate || !lotNumber)) {
            response.status = 400
            render([errorMessage: g.message(code: 'inventoryItem.lotAndExpiryControl.message')] as JSON)
            return
        }
        if (!product.lotAndExpiryControl && !lotNumber) {
            response.status = 400
            render([errorMessage: g.message(code: 'inventoryItem.blankLot.message')] as JSON)
            return
        }

        InventoryItem inventoryItem = new InventoryItem(product: product, lotNumber: lotNumber, expirationDate: expirationDate)
        if (inventoryItem.save(flush: true)) {
            render([data: toJson(inventoryItem)] as JSON)
        } else {
            response.status = 400
            render([errorMessages: inventoryItem.errors.allErrors.collect { g.message(error: it) }] as JSON)
        }
    }

    @Transactional
    def update() {
        InventoryItem inventoryItem = InventoryItem.get(params.id)
        if (!inventoryItem) {
            response.status = 404
            render([errorMessage: "Inventory item not found"] as JSON)
            return
        }
        if (!userService.isSuperuser(session?.user)) {
            response.status = 403
            render([errorMessage: g.message(code: 'errors.noPermissions.label')] as JSON)
            return
        }

        String lotNumber = request.JSON?.containsKey("lotNumber") ? request.JSON.lotNumber : inventoryItem.lotNumber
        Date expirationDate = request.JSON?.containsKey("expirationDate") ?
                parseDate(request.JSON.expirationDate) : inventoryItem.expirationDate

        if (inventoryItem.product?.lotAndExpiryControl && (!expirationDate || !lotNumber)) {
            response.status = 400
            render([errorMessage: g.message(code: 'inventoryItem.lotAndExpiryControl.message')] as JSON)
            return
        }
        if (!inventoryItem.product.lotAndExpiryControl && !lotNumber) {
            response.status = 400
            render([errorMessage: g.message(code: 'inventoryItem.blankLot.message')] as JSON)
            return
        }

        Date minDate = Constants.EXPIRATION_DATE_FORMATTER.parse(
                grailsApplication.config.openboxes.expirationDate.minValue.toString())
        if (expirationDate && expirationDate < minDate) {
            response.status = 400
            render([errorMessage: "This date is invalid. Please enter a date after ${minDate.getYear() + 1900}."] as JSON)
            return
        }

        inventoryItem.lotNumber = lotNumber
        inventoryItem.expirationDate = expirationDate

        if (!inventoryItem.hasErrors() && inventoryItemDataService.save(inventoryItem)) {
            render([data: toJson(inventoryItem)] as JSON)
        } else {
            response.status = 400
            render([errorMessages: inventoryItem.errors.allErrors.collect { g.message(error: it) }] as JSON)
        }
    }

    def delete() {
        InventoryItem inventoryItem = inventoryItemDataService.getWithProduct(params.id)
        if (!inventoryItem) {
            response.status = 404
            render([errorMessage: "Inventory item not found"] as JSON)
            return
        }
        if (!userService.isSuperuser(session?.user)) {
            response.status = 403
            render([errorMessage: g.message(code: 'errors.noPermissions.label')] as JSON)
            return
        }
        try {
            inventoryItemDataService.delete(inventoryItem.id)
            render(status: 204)
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            response.status = 400
            render([errorMessage: g.message(code: 'default.not.deleted.message',
                    args: [g.message(code: 'inventoryItem.label', default: 'Inventory item'), params.id])] as JSON)
        }
    }

    @Transactional
    def recall() {
        InventoryItem inventoryItem = InventoryItem.get(params.id)
        if (!inventoryItem) {
            response.status = 404
            render([errorMessage: "Inventory item not found"] as JSON)
            return
        }
        if (!userService.isUserAdmin(session?.user)) {
            response.status = 403
            render([errorMessage: g.message(code: 'errors.noPermissions.label')] as JSON)
            return
        }
        if (!inventoryItem.lotNumber) {
            response.status = 400
            render([errorMessage: g.message(code: 'inventoryItem.recallError.message')] as JSON)
            return
        }
        inventoryService.recallInventoryItem(inventoryItem)
        productAvailabilityService.refreshProductsAvailability(null, [inventoryItem?.product?.id], false)
        render([data: toJson(inventoryItem)] as JSON)
    }

    @Transactional
    def revertRecall() {
        InventoryItem inventoryItem = InventoryItem.get(params.id)
        if (!inventoryItem) {
            response.status = 404
            render([errorMessage: "Inventory item not found"] as JSON)
            return
        }
        if (!userService.isUserAdmin(session?.user)) {
            response.status = 403
            render([errorMessage: g.message(code: 'errors.noPermissions.label')] as JSON)
            return
        }
        inventoryService.revertRecallInventoryItem(inventoryItem)
        productAvailabilityService.refreshProductsAvailability(null, [inventoryItem?.product?.id], false)
        render([data: toJson(inventoryItem)] as JSON)
    }

    private static Date parseDate(value) {
        if (!value) {
            return null
        }
        if (value instanceof Date) {
            return value
        }
        return Date.parse("yyyy-MM-dd", value.toString().take(10))
    }

    private static Map toJson(InventoryItem inventoryItem) {
        return [
                id            : inventoryItem.id,
                version       : inventoryItem.version,
                lotNumber     : inventoryItem.lotNumber,
                expirationDate: inventoryItem.expirationDate?.format("yyyy-MM-dd"),
                lotStatus     : inventoryItem.lotStatus?.name(),
                product       : [id: inventoryItem.product?.id],
        ]
    }
}
