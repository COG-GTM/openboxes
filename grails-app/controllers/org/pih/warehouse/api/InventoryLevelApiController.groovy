package org.pih.warehouse.api

import grails.converters.JSON
import grails.gorm.transactions.Transactional
import org.pih.warehouse.core.DocumentService
import org.pih.warehouse.core.Location
import org.pih.warehouse.data.DataService
import org.pih.warehouse.importer.InventoryLevelImportDataService
import org.pih.warehouse.inventory.InventoryLevel
import org.pih.warehouse.inventory.InventoryStatus
import org.pih.warehouse.product.Product

class InventoryLevelApiController {

    DataService dataService
    DocumentService documentService
    InventoryLevelImportDataService inventoryLevelImportDataService

    def list() {
        Location facility = Location.get(params.facilityId)
        if (!facility)
            throw new IllegalArgumentException("Unable to locate facility with id ${params.facilityId}")

        List inventoryLevels = InventoryLevel.createCriteria().list {
            eq("inventory", facility.inventory)
            isNull("internalLocation")
        }

        withFormat {
            "xls" {
                def data = dataService.transformObjects(inventoryLevels, InventoryLevel.PROPERTIES)
                documentService.generateExcel(response.outputStream, data)
                response.setHeader 'Content-disposition', "attachment; filename=\"inventory-levels.xls\""
                response.outputStream.flush()
                return
            }
            "csv" {
                String text = inventoryLevelImportDataService.exportInventoryLevels(inventoryLevels)
                response.contentType = "text/csv"
                response.setHeader("Content-disposition", "attachment; filename=\"inventory-levels.csv\"")
                render(text)
                return
            }

            "*" {
                render([data: inventoryLevels] as JSON)
            }
        }
    }

    /**
     * Returns the facility-level inventory level (min/reorder/max/status) for a
     * product, backing the React "Edit Inventory Level" screen. Mirrors the
     * legacy InventoryItemController.editInventoryLevel lookup.
     */
    def read() {
        Location facility = Location.get(params.facilityId)
        if (!facility) {
            throw new IllegalArgumentException("Unable to locate facility with id ${params.facilityId}")
        }
        Product product = Product.get(params.productId)
        if (!product) {
            throw new IllegalArgumentException("Unable to locate product with id ${params.productId}")
        }

        InventoryLevel inventoryLevel = InventoryLevel.findByProductAndInventory(product, facility.inventory)

        render([data: [
                id       : inventoryLevel?.id,
                status   : inventoryLevel?.status?.name(),
                product  : [id: product.id, productCode: product.productCode, name: product.name],
                inventory: [id: facility.inventory?.id, warehouse: facility.name],
        ]] as JSON)
    }

    /**
     * Creates or updates the facility-level inventory level status for a
     * product. Mirrors the legacy InventoryItemController.updateInventoryLevel
     * action (whose form only edits the status field).
     */
    @Transactional
    def update() {
        Location facility = Location.get(params.facilityId)
        if (!facility) {
            throw new IllegalArgumentException("Unable to locate facility with id ${params.facilityId}")
        }
        Product product = Product.get(params.productId)
        if (!product) {
            throw new IllegalArgumentException("Unable to locate product with id ${params.productId}")
        }

        InventoryLevel inventoryLevel = InventoryLevel.findByProductAndInventory(product, facility.inventory)
        if (!inventoryLevel) {
            inventoryLevel = new InventoryLevel(product: product, inventory: facility.inventory)
        }

        String status = request.JSON?.containsKey("status") ? request.JSON.status : params.status
        InventoryStatus inventoryStatus = null
        if (status) {
            inventoryStatus = InventoryStatus.values().find { it.name() == status }
            if (!inventoryStatus) {
                response.status = 400
                render([errorMessage: "Invalid inventory status '${status}'"] as JSON)
                return
            }
        }
        inventoryLevel.status = inventoryStatus

        if (!inventoryLevel.hasErrors() && inventoryLevel.save()) {
            render([data: [
                    id     : inventoryLevel.id,
                    status : inventoryLevel.status?.name(),
                    product: [id: product.id],
            ]] as JSON)
        } else {
            response.status = 400
            render([errorMessages: inventoryLevel.errors.allErrors.collect { it.toString() }] as JSON)
        }
    }
}
