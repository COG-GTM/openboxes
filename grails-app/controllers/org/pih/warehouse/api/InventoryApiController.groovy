package org.pih.warehouse.api

import grails.converters.JSON
import grails.validation.ValidationException
import org.pih.warehouse.PaginatedList
import org.pih.warehouse.auth.AuthService
import org.pih.warehouse.core.DashboardService
import org.pih.warehouse.core.Location
import org.pih.warehouse.importer.CSVUtils
import org.pih.warehouse.importer.ImportDataCommand
import org.pih.warehouse.importer.InventoryImportDataService
import org.pih.warehouse.inventory.ExpirationHistoryReportFilterCommand
import org.pih.warehouse.inventory.ExpirationHistoryReportRow
import org.pih.warehouse.inventory.InventoryService
import org.pih.warehouse.inventory.ReorderReportFilterCommand
import org.pih.warehouse.inventory.ReorderReportItemDto
import org.pih.warehouse.inventory.InventoryItem
import org.pih.warehouse.inventory.TransactionEntry
import org.pih.warehouse.inventory.product.ExpirationHistoryReport
import org.pih.warehouse.product.Category
import org.pih.warehouse.core.UserService
import org.pih.warehouse.report.InventoryReportCommand

class InventoryApiController {

    InventoryImportDataService inventoryImportDataService
    DashboardService dashboardService
    InventoryService inventoryService
    UserService userService
    def productAvailabilityService

    def importCsv() {
        String fileData = request.inputStream.text

        if (fileData.isEmpty()) {
            throw new IllegalArgumentException("File cannot be empty")
        }

        if (request.contentType != "text/csv") {
            throw new IllegalArgumentException("File must be in CSV format")
        }

        ImportDataCommand command = new ImportDataCommand(
                data: CSVUtils.csvToObjects(fileData),
                date: new Date(System.currentTimeMillis() - 1000),
                location: Location.get(params.facilityId)
        )

        inventoryImportDataService.calculateAndApplyInventoryDifferences(command)
        inventoryImportDataService.validateData(command)
        inventoryImportDataService.importData(command)

        render(status: 200)
    }

    def getInventorySummary() {
        Location location = Location.get(params.facilityId ?: session?.warehouse?.id)
        if (!location) {
            renderMissingLocation()
            return
        }

        List<Category> categories = params.list('categories') ?
                Category.findAllByIdInList(params.list('categories')) : []
        // Same default as the legacy screen: include subcategories unless explicitly disabled
        boolean includeSubcategories = params.containsKey("includeSubcategories") ?
                params.boolean("includeSubcategories") : true
        if (includeSubcategories) {
            categories = inventoryService.getExplodedCategories(categories)
        }

        List inventoryItems = params.status == "lowStock" ?
                dashboardService.getLowStock(location, categories) :
                dashboardService.getInventoryItems(location, categories)

        Boolean hasRoleFinance = userService.hasRoleFinance(AuthService.currentUser)
        List data = inventoryItems.collect {
            BigDecimal unitPrice = hasRoleFinance ? (it.product?.pricePerUnit ?: 0.0) : null
            [
                    status                    : it.status?.toString(),
                    product                   : [
                            id           : it.product?.id,
                            productCode  : it.product?.productCode,
                            name         : it.product?.name,
                            productFamily: it.product?.productFamily?.name,
                            category     : it.product?.category?.name,
                            unitOfMeasure: it.product?.unitOfMeasure,
                    ],
                    abcClass                  : it.inventoryLevel?.abcClass,
                    minQuantity               : it.inventoryLevel?.minQuantity,
                    reorderQuantity           : it.inventoryLevel?.reorderQuantity,
                    maxQuantity               : it.inventoryLevel?.maxQuantity,
                    quantityOnHand            : it.quantity,
                    quantityAvailableToPromise: it.quantityAvailableToPromise,
                    unitPrice                 : unitPrice,
                    totalValue                : hasRoleFinance ?
                            ((it.product?.pricePerUnit && it.quantity) ? it.product.pricePerUnit * it.quantity : 0.0) : null,
            ]
        }

        render([data: data, totalCount: data.size()] as JSON)
    }

    def getExpiredStock(InventoryReportCommand command) {
        command.location = Location.get(params.facilityId ?: session?.warehouse?.id)
        if (!command.location) {
            renderMissingLocation()
            return
        }
        render([data: getExpirationStockData(command, true)] as JSON)
    }

    def getExpiringStock(InventoryReportCommand command) {
        command.location = Location.get(params.facilityId ?: session?.warehouse?.id)
        if (!command.location) {
            renderMissingLocation()
            return
        }
        render([data: getExpirationStockData(command, false)] as JSON)
    }

    private void renderMissingLocation() {
        response.status = 400
        render([errorMessage: "Location is required - sign in or provide facilityId as a request parameter"] as JSON)
    }

    private Map getExpirationStockData(InventoryReportCommand command, boolean expired) {

        List<InventoryItem> inventoryItems = expired ?
                dashboardService.getExpiredStock(command) :
                dashboardService.getExpiringStock(command)
        List<Category> categories = inventoryItems*.product*.category.findAll { it }.unique().sort { it.name ?: '' }

        Map<InventoryItem, Integer> quantityMap = inventoryItems.isEmpty() ? [:] :
                productAvailabilityService.getQuantityOnHandByInventoryItem(command.location, inventoryItems)

        // Same as the legacy screens: only items with an availability record are listed
        List data = quantityMap.collect { inventoryItem, quantity ->
            [
                    inventoryItem: [
                            id            : inventoryItem.id,
                            lotNumber     : inventoryItem.lotNumber,
                            expirationDate: inventoryItem.expirationDate?.format("yyyy-MM-dd"),
                    ],
                    product      : [
                            id           : inventoryItem.product?.id,
                            productCode  : inventoryItem.product?.productCode,
                            name         : inventoryItem.product?.name,
                            category     : inventoryItem.product?.category?.name,
                            unitOfMeasure: inventoryItem.product?.unitOfMeasure,
                    ],
                    quantity     : quantity ?: 0,
            ]
        }

        return [
                items     : data,
                categories: categories.collect { [id: it.id, name: it.name] },
                totalCount: data.size(),
        ]
    }

    def getReorderReport(ReorderReportFilterCommand command) {
        if (command.hasErrors()) {
            throw new ValidationException("Invalid filters", command.errors)
        }
        List<ReorderReportItemDto> reorderReport = dashboardService.getReorderReport(command)

        withFormat {
            "csv" {
                String csv = dashboardService.getReorderReportCsv(reorderReport)
                String filename = "Reorder report - ${AuthService.currentLocation?.name}.csv"
                response.setHeader("Content-disposition", "attachment; filename=\"${filename}\"")
                render(contentType: "text/csv", text: csv, encoding: "UTF-8")
                return
            }
            "*" {
                render([data: reorderReport] as JSON)
            }
        }
    }

    def getExpirationHistoryReport(ExpirationHistoryReportFilterCommand command) {
        if (command.hasErrors()) {
            throw new ValidationException("Invalid filters", command.errors)
        }
        withFormat {
            "csv" {
                String csv = inventoryService.getExpirationHistoryReportCsv(command)
                response.contentType = "text/csv"
                String filename = "Expiration history report - ${AuthService.currentLocation?.name}.csv"
                response.setHeader("Content-disposition", "attachment; filename=\"${filename}\"")
                render(text: csv, encoding: "UTF-8")
                return
            }
            "*" {
                ExpirationHistoryReport report = inventoryService.getExpirationHistoryReport(command)
                render([
                        data                     : report.rows,
                        totalCount               : report.rows.totalCount,
                        totalQuantityLostToExpiry: report.totalQuantityLostToExpiry,
                        totalValueLostToExpiry   : report.totalValueLostToExpiry
                ] as JSON)
            }
        }
    }
}
