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
import org.pih.warehouse.product.ProductService

class InventoryLevelApiController {

    DataService dataService
    DocumentService documentService
    InventoryLevelImportDataService inventoryLevelImportDataService
    ProductService productService

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
     * Paged inventory level listing backing the React inventoryLevel/list
     * screen. Mirrors the legacy InventoryLevelController.list criteria:
     * optional product search terms (q) and facility filter; when q matches
     * no products the filter is dropped (legacy parity). format=csv exports
     * all matching rows.
     */
    def search() {
        Map criteriaParams = [:]
        criteriaParams.max = Math.min(params.max ? params.int('max') : 10, 100)
        criteriaParams.offset = params.offset ? params.int('offset') : 0
        if (params.sort) {
            criteriaParams.sort = params.sort
            criteriaParams.order = params.order ?: "asc"
        }

        def terms = params.q ? params.q.split(" ") : null
        def products = terms ? productService.searchProducts(terms, null) : []
        Location location = params.locationId ? Location.get(params.locationId) : null

        if (params.format == "csv") {
            criteriaParams.remove("max")
            criteriaParams.remove("offset")
        }

        def inventoryLevels = InventoryLevel.createCriteria().list(criteriaParams) {
            if (location?.inventory) {
                eq("inventory", location.inventory)
            }
            if (products) {
                'in'("product", products)
            }
        }

        if (params.format == "csv") {
            String text = inventoryLevels ? inventoryLevelImportDataService.exportInventoryLevels(inventoryLevels) : ""
            response.contentType = "text/csv"
            response.setHeader("Content-disposition", "attachment; filename=\"inventoryLevels.csv\"")
            render(contentType: "text/csv", text: text)
            return
        }

        render([data: inventoryLevels.collect { toListJson(it) }, totalCount: inventoryLevels.totalCount] as JSON)
    }

    def getById() {
        InventoryLevel inventoryLevel = InventoryLevel.get(params.id)
        if (!inventoryLevel) {
            response.status = 404
            render([errorMessage: "Inventory level with id ${params.id} not found"] as JSON)
            return
        }
        render([data: toDetailJson(inventoryLevel)] as JSON)
    }

    /**
     * Creates an inventory level, mirroring the legacy
     * InventoryLevelController.save duplicate check on
     * (product, inventory, internalLocation).
     */
    @Transactional
    def create() {
        def json = request.JSON
        Product product = Product.get(json?.product?.id)
        Location location = Location.get(json?.location?.id ?: session?.warehouse?.id)
        if (!product || !location) {
            response.status = 400
            render([errorMessage: "Product and location are required"] as JSON)
            return
        }
        Location internalLocation = json?.internalLocation?.id ? Location.get(json.internalLocation.id) : null

        int existing = InventoryLevel.createCriteria().count {
            eq("product", product)
            eq("inventory", location.inventory)
            if (internalLocation) {
                eq("internalLocation", internalLocation)
            } else {
                isNull("internalLocation")
            }
        }
        if (existing) {
            response.status = 400
            render([errorMessage: "Inventory level already exists for '${product?.name}' in location '${location?.name}', bin location '${internalLocation?.name ?: ''}'"] as JSON)
            return
        }

        InventoryLevel inventoryLevel = new InventoryLevel()
        inventoryLevel.inventory = location.inventory
        inventoryLevel.product = product
        try {
            bindProperties(inventoryLevel, json)
        }
        catch (IllegalArgumentException e) {
            response.status = 400
            render([errorMessage: e.message] as JSON)
            return
        }

        if (!inventoryLevel.hasErrors() && inventoryLevel.save(flush: true)) {
            render([data: toDetailJson(inventoryLevel)] as JSON)
        } else {
            response.status = 400
            render([errorMessages: inventoryLevel.errors.allErrors.collect { it.toString() }] as JSON)
        }
    }

    /**
     * Updates an inventory level, mirroring the legacy
     * InventoryLevelController.update optimistic locking check.
     */
    @Transactional
    def updateById() {
        InventoryLevel inventoryLevel = InventoryLevel.get(params.id)
        if (!inventoryLevel) {
            response.status = 404
            render([errorMessage: "Inventory level with id ${params.id} not found"] as JSON)
            return
        }
        def json = request.JSON
        if (json?.version != null && inventoryLevel.version > (json.version as Long)) {
            response.status = 400
            render([errorMessage: "Another user has updated this inventory level while you were editing"] as JSON)
            return
        }
        try {
            bindProperties(inventoryLevel, json)
        }
        catch (IllegalArgumentException e) {
            response.status = 400
            render([errorMessage: e.message] as JSON)
            return
        }

        if (!inventoryLevel.hasErrors() && inventoryLevel.save(flush: true)) {
            render([data: toDetailJson(inventoryLevel)] as JSON)
        } else {
            response.status = 400
            render([errorMessages: inventoryLevel.errors.allErrors.collect { it.toString() }] as JSON)
        }
    }

    @Transactional
    def deleteById() {
        InventoryLevel inventoryLevel = InventoryLevel.get(params.id)
        if (!inventoryLevel) {
            response.status = 404
            render([errorMessage: "Inventory level with id ${params.id} not found"] as JSON)
            return
        }
        try {
            inventoryLevel.delete(flush: true)
            render([data: [id: params.id, deleted: true]] as JSON)
        }
        catch (org.springframework.dao.DataIntegrityViolationException e) {
            response.status = 400
            render([errorMessage: "Inventory level with id ${params.id} could not be deleted"] as JSON)
        }
    }

    private void bindProperties(InventoryLevel inventoryLevel, def json) {
        if (json?.containsKey("status")) {
            InventoryStatus status = json.status ? InventoryStatus.values().find { it.name() == json.status } : null
            if (json.status && !status) {
                throw new IllegalArgumentException("Invalid inventory status '${json.status}'")
            }
            inventoryLevel.status = status
        }
        if (json?.containsKey("internalLocation")) {
            inventoryLevel.internalLocation = json.internalLocation?.id ? Location.get(json.internalLocation.id) : null
        }
        if (json?.containsKey("preferredBinLocation")) {
            inventoryLevel.preferredBinLocation = json.preferredBinLocation?.id ? Location.get(json.preferredBinLocation.id) : null
        }
        if (json?.containsKey("replenishmentLocation")) {
            inventoryLevel.replenishmentLocation = json.replenishmentLocation?.id ? Location.get(json.replenishmentLocation.id) : null
        }
        ["abcClass", "comments"].each { field ->
            if (json?.containsKey(field)) {
                inventoryLevel.setProperty(field, json[field] ?: null)
            }
        }
        ["minQuantity", "reorderQuantity", "maxQuantity"].each { field ->
            if (json?.containsKey(field)) {
                inventoryLevel.setProperty(field, json[field] != null && json[field] != "" ? (json[field] as Integer) : null)
            }
        }
        ["forecastQuantity", "forecastPeriodDays", "expectedLeadTimeDays", "replenishmentPeriodDays"].each { field ->
            if (json?.containsKey(field)) {
                inventoryLevel.setProperty(field, json[field] != null && json[field] != "" ? (json[field] as BigDecimal) : null)
            }
        }
    }

    private Map toListJson(InventoryLevel inventoryLevel) {
        return [
                id             : inventoryLevel.id,
                status         : inventoryLevel.status?.name(),
                product        : [
                        id         : inventoryLevel.product?.id,
                        productCode: inventoryLevel.product?.productCode,
                        name       : inventoryLevel.product?.name,
                ],
                inventory      : [
                        id       : inventoryLevel.inventory?.id,
                        warehouse: inventoryLevel.inventory?.warehouse?.name,
                ],
                minQuantity    : inventoryLevel.minQuantity,
                reorderQuantity: inventoryLevel.reorderQuantity,
                maxQuantity    : inventoryLevel.maxQuantity,
                dateCreated    : inventoryLevel.dateCreated?.format("yyyy-MM-dd'T'HH:mm:ssXXX"),
        ]
    }

    private Map toDetailJson(InventoryLevel inventoryLevel) {
        return toListJson(inventoryLevel) + [
                version                : inventoryLevel.version,
                facility               : inventoryLevel.inventory?.warehouse ? [id: inventoryLevel.inventory.warehouse.id, name: inventoryLevel.inventory.warehouse.name] : null,
                supported              : inventoryLevel.status ? inventoryLevel.status in InventoryStatus.listEnabled() : null,
                internalLocation       : inventoryLevel.internalLocation ? [id: inventoryLevel.internalLocation.id, name: inventoryLevel.internalLocation.name] : null,
                preferredBinLocation   : inventoryLevel.preferredBinLocation ? [id: inventoryLevel.preferredBinLocation.id, name: inventoryLevel.preferredBinLocation.name] : null,
                replenishmentLocation  : inventoryLevel.replenishmentLocation ? [id: inventoryLevel.replenishmentLocation.id, name: inventoryLevel.replenishmentLocation.name] : null,
                abcClass               : inventoryLevel.abcClass,
                comments               : inventoryLevel.comments,
                forecastQuantity       : inventoryLevel.forecastQuantity,
                forecastPeriodDays     : inventoryLevel.forecastPeriodDays,
                expectedLeadTimeDays   : inventoryLevel.expectedLeadTimeDays,
                replenishmentPeriodDays: inventoryLevel.replenishmentPeriodDays,
                lastUpdated            : inventoryLevel.lastUpdated?.format("yyyy-MM-dd'T'HH:mm:ssXXX"),
        ]
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
