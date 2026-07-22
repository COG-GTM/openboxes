package org.pih.warehouse.api

import grails.converters.JSON
import grails.validation.ValidationException
import org.pih.warehouse.PaginatedList
import org.pih.warehouse.auth.AuthService
import org.pih.warehouse.core.ActivityCode
import org.pih.warehouse.core.DashboardService
import org.pih.warehouse.core.Location
import org.pih.warehouse.importer.CSVUtils
import org.pih.warehouse.importer.ImportDataCommand
import org.pih.warehouse.importer.InventoryImportDataService
import org.pih.warehouse.core.ReasonCode
import org.pih.warehouse.inventory.AdjustStockCommand
import org.pih.warehouse.inventory.ExpirationHistoryReportFilterCommand
import org.pih.warehouse.inventory.ExpirationHistoryReportRow
import org.pih.warehouse.inventory.InventoryCommand
import org.pih.warehouse.inventory.InventoryItem
import org.pih.warehouse.inventory.InventoryService
import org.pih.warehouse.inventory.ReorderReportFilterCommand
import org.pih.warehouse.inventory.ReorderReportItemDto
import org.pih.warehouse.inventory.InventoryItem
import org.pih.warehouse.inventory.TransactionEntry
import org.pih.warehouse.inventory.TransactionType
import org.pih.warehouse.inventory.product.ExpirationHistoryReport
import org.pih.warehouse.core.Tag
import org.pih.warehouse.product.Category
import org.pih.warehouse.product.Product
import org.pih.warehouse.product.ProductCatalog
import org.pih.warehouse.core.UserService
import org.pih.warehouse.report.InventoryReportCommand
import org.springframework.web.multipart.MultipartFile
import org.springframework.web.multipart.MultipartHttpServletRequest
import org.apache.commons.io.FilenameUtils
import org.pih.warehouse.importer.InventoryExcelImporter

import java.text.NumberFormat

class InventoryApiController {

    InventoryImportDataService inventoryImportDataService
    DashboardService dashboardService
    InventoryService inventoryService
    UserService userService
    def productAvailabilityService
    def uploadService
    def productService
    def reportService

    def importCsv() {
        String fileData = request.inputStream.text

        if (fileData.isEmpty()) {
            throw new IllegalArgumentException("File cannot be empty")
        }

        if (request.contentType != "text/csv") {
            throw new IllegalArgumentException("File must be in CSV format")
        }

        // N.B. don't name this local variable "command": the Grails 4 controller
        // action transformer resolves same-named command-object parameters of the
        // other actions against it and generates a broken cast (GroovyCastException)
        ImportDataCommand importDataCommand = new ImportDataCommand(
                data: CSVUtils.csvToObjects(fileData),
                date: new Date(System.currentTimeMillis() - 1000),
                location: Location.get(params.facilityId)
        )

        inventoryImportDataService.calculateAndApplyInventoryDifferences(importDataCommand)
        inventoryImportDataService.validateData(importDataCommand)
        inventoryImportDataService.importData(importDataCommand)

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

        List inventoryItems
        switch (params.status) {
            case "lowStock":
                inventoryItems = dashboardService.getLowStock(location, categories)
                break
            case "reorderStock":
                inventoryItems = dashboardService.getReorderStock(location, categories)
                break
            default:
                inventoryItems = dashboardService.getInventoryItems(location, categories)
        }

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

    /**
     * Backs the React inventory browser screen (legacy inventoryBrowser/list).
     * Wraps reportService.calculateQuantityOnHandByProductGroup the same way as
     * the legacy JsonController.getQuantityOnHandByProductGroup /
     * getSummaryByProductGroup ajax endpoints did.
     */
    def getProductGroupSummary() {
        Location location = Location.get(params.facilityId ?: session?.warehouse?.id)
        if (!location) {
            renderMissingLocation()
            return
        }

        def data = reportService.calculateQuantityOnHandByProductGroup(location.id)

        def rows = new HashSet()
        List statuses = params.list("status")
        statuses.each {
            def entry = data.productGroupDetails[it]
            if (entry) {
                rows += entry.values()
            }
        }

        def totalValue = rows.sum { it.totalValue ?: 0 } ?: 0
        NumberFormat numberFormat = NumberFormat.getNumberInstance()
        String currencyCode = grailsApplication.config.openboxes.locale.defaultCurrencyCode ?: "USD"
        numberFormat.currency = Currency.getInstance(currencyCode)
        numberFormat.maximumFractionDigits = 2
        numberFormat.minimumFractionDigits = 2

        render([data: [
                rows               : rows,
                summary            : data.productGroupSummary,
                totalValue         : totalValue,
                totalValueFormatted: numberFormat.format(totalValue),
        ]] as JSON)
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

    def getBinLocations() {
        Location location = Location.get(params.facilityId ?: session?.warehouse?.id)
        if (!location) {
            renderMissingLocation()
            return
        }

        List binLocations = productAvailabilityService.getQuantityOnHandByBinLocation(location)
        List data = binLocations.collect {
            [
                    product       : [
                            id         : it?.inventoryItem?.product?.id,
                            productCode: it?.inventoryItem?.product?.productCode,
                            name       : it?.inventoryItem?.product?.name,
                    ],
                    inventoryItem : [
                            id            : it?.inventoryItem?.id,
                            lotNumber     : it?.inventoryItem?.lotNumber,
                            expirationDate: it?.inventoryItem?.expirationDate?.format("yyyy-MM-dd"),
                    ],
                    binLocation   : it?.binLocation ? [id: it.binLocation.id, name: it.binLocation.name] : null,
                    quantityOnHand: it?.quantity,
            ]
        }

        render([data: data, totalCount: data.size()] as JSON)
    }

    def getProductsWithoutDefaultInventoryItem() {
        List<Product> products = inventoryService.findProductsWithoutEmptyLotNumber()
        List data = products.collect {
            [
                    id         : it.id,
                    productCode: it.productCode,
                    name       : it.name,
                    category   : it.category?.name,
            ]
        }
        render([data: data, totalCount: data.size()] as JSON)
    }

    def createDefaultInventoryItems() {
        if (!userService.isUserAdmin(session?.user)) {
            response.status = 403
            render([errorMessage: "You are not authorized to create default inventory items"] as JSON)
            return
        }
        Integer created = inventoryService.createDefaultInventoryItems()
        render([data: [created: created]] as JSON)
    }

    def uploadInventory() {
        if (!(request instanceof MultipartHttpServletRequest)) {
            response.status = 400
            render([errorMessage: "File is required - submit as multipart/form-data with a 'file' part"] as JSON)
            return
        }
        MultipartFile uploadFile = ((MultipartHttpServletRequest) request).getFile("file")
        if (!uploadFile || uploadFile.empty) {
            response.status = 400
            render([errorMessage: "File cannot be empty"] as JSON)
            return
        }

        String filename = FilenameUtils.getName(uploadFile.originalFilename)
        File localFile = uploadService.createLocalFile(filename)
        uploadFile.transferTo(localFile)

        InventoryExcelImporter excelImporter = new InventoryExcelImporter(localFile.absolutePath)
        List<Map> rows = excelImporter.data.collect {
            [
                    productCode   : it.productCode,
                    product       : it.product,
                    lotNumber     : it.lotNumber,
                    expirationDate: it.expirationDate instanceof Date ? it.expirationDate.format("yyyy-MM-dd") : it.expirationDate,
                    binLocation   : it.binLocation,
                    quantityOnHand: it.quantityOnHand,
                    quantity      : it.quantity,
                    comments      : it.comments,
            ]
        }

        render([data: rows, totalCount: rows.size()] as JSON)
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

    /**
     * Paginated product search with quantity on hand for the React
     * inventory browser (mirrors InventoryController.browse).
     */
    def browse() {
        Location location = Location.get(params.locationId ?: session?.warehouse?.id)
        requireLocation(location)

        InventoryCommand inventoryCommand = new InventoryCommand()
        inventoryCommand.location = location
        inventoryCommand.searchTerms = params.searchTerms ?: null
        def category = params.categoryId ? Category.get(params.categoryId) : productService.getRootCategory()
        inventoryCommand.category = category?.id ? category : null
        inventoryCommand.tags = params.list("tags") ? Tag.getAll(params.list("tags")) : null
        inventoryCommand.catalogs = params.list("catalogs") ? ProductCatalog.getAll(params.list("catalogs")) : null
        inventoryCommand.maxResults = params.max ? params.int("max") : 10
        inventoryCommand.offset = params.offset ? params.int("offset") : 0

        PaginatedList searchResults = productAvailabilityService.searchProducts(inventoryCommand)

        def data = searchResults.list.collect { result ->
            Product product = result.product
            [
                    id            : product.id,
                    productCode   : product.productCode,
                    name          : product.name,
                    displayName   : product.displayNameOrDefaultName,
                    color         : product.color,
                    productType   : product.productType?.name,
                    category      : [id: product.category?.id, name: product.category?.name],
                    tags          : product.tags?.collect { [id: it.id, tag: it.tag] } ?: [],
                    catalogs      : product.productCatalogs?.collect { [id: it.id, name: it.name] } ?: [],
                    quantityOnHand: result.quantityOnHand,
            ]
        }
        render([data: data, totalCount: searchResults.totalCount] as JSON)
    }

    /**
     * Returns per-bin inventory item rows for the given products, used by the
     * React record-transaction screen (mirrors InventoryController.createTransaction).
     */
    def getTransactionCandidates() {
        Location location = Location.get(params.locationId ?: session?.warehouse?.id)
        requireLocation(location)
        TransactionType transactionType = TransactionType.get(params.transactionTypeId)

        List<String> productIds = params.list("product.id").collect { String.valueOf(it) }
        List<String> inventoryItemIds = params.list("inventoryItem.id").collect { String.valueOf(it) }
        if (!productIds && !inventoryItemIds) {
            throw new IllegalArgumentException("You must select at least one product or inventory item")
        }
        def binLocationEntries
        if (productIds) {
            List<Product> products = Product.getAll(productIds)
            binLocationEntries = inventoryService.getProductQuantityByBinLocation(location, products)
        } else {
            List<InventoryItem> inventoryItems = InventoryItem.getAll(inventoryItemIds).findAll { it }
            binLocationEntries = inventoryService.getBinLocationsByInventoryItems(location, inventoryItems)
        }

        def data = binLocationEntries.collect { entry ->
            [
                    product      : [
                            id           : entry.product?.id,
                            productCode  : entry.product?.productCode,
                            name         : entry.product?.name,
                            unitOfMeasure: entry.product?.unitOfMeasure,
                    ],
                    binLocation  : entry.binLocation ? [id: entry.binLocation.id, name: entry.binLocation.name] : null,
                    inventoryItem: entry.inventoryItem ? [
                            id            : entry.inventoryItem.id,
                            lotNumber     : entry.inventoryItem.lotNumber,
                            expirationDate: entry.inventoryItem.expirationDate?.format("MM/dd/yyyy"),
                    ] : null,
                    quantityOnHand: entry.quantity ?: 0,
            ]
        }

        render([
                transactionType: transactionType ? [
                        id             : transactionType.id,
                        name           : transactionType.name,
                        transactionCode: transactionType.transactionCode?.name(),
                ] : null,
                data           : data,
                totalCount     : data.size(),
        ] as JSON)
    }

    /**
     * Returns details for a single bin location / lot pairing, used by the
     * React edit-bin-location (adjust stock) screen
     * (mirrors InventoryController.editBinLocation).
     */
    def getBinLocationDetails() {
        Location location = Location.get(params.locationId ?: session?.warehouse?.id)
        requireLocation(location)
        Product product = Product.findByProductCode(params.productCode)
        Location binLocation = Location.findByParentLocationAndName(location, params.binLocation)
        InventoryItem inventoryItem = inventoryService.findInventoryItemByProductAndLotNumber(product, params.lotNumber ?: null)
        Integer quantity = inventoryService.getQuantityFromBinLocation(location, binLocation, inventoryItem)

        render([data: [
                location      : [id: location?.id, name: location?.name],
                binLocation   : binLocation ? [id: binLocation.id, name: binLocation.name] : null,
                product       : product ? [
                        id           : product.id,
                        productCode  : product.productCode,
                        name         : product.name,
                        unitOfMeasure: product.unitOfMeasure,
                ] : null,
                inventoryItem : inventoryItem ? [
                        id            : inventoryItem.id,
                        lotNumber     : inventoryItem.lotNumber,
                        expirationDate: inventoryItem.expirationDate?.format("MM/dd/yyyy"),
                ] : null,
                quantityOnHand: quantity ?: 0,
        ]] as JSON)
    }

    /**
     * Adjusts the stock level for a single inventory item / bin location
     * (mirrors InventoryItemController.adjustStock, used by the React
     * edit-bin-location screen).
     */
    def adjustStock() {
        def json = request.JSON
        Location location = Location.get(json.locationId ?: session?.warehouse?.id)
        requireLocation(location)
        if (!location.supports(ActivityCode.ADJUST_INVENTORY)) {
            throw new UnsupportedOperationException("Location ${location.name} does not support adjustment transactions")
        }
        InventoryItem inventoryItem = InventoryItem.get(json.inventoryItemId as String)

        AdjustStockCommand adjustStockCommand = new AdjustStockCommand()
        adjustStockCommand.location = location
        adjustStockCommand.binLocation = json.binLocationId ? Location.get(json.binLocationId as String) : null
        adjustStockCommand.inventoryItem = inventoryItem
        adjustStockCommand.currentQuantity = json.currentQuantity != null ? json.currentQuantity as Integer : null
        adjustStockCommand.newQuantity = json.newQuantity as Integer
        adjustStockCommand.reasonCode = json.reasonCode ? ReasonCode.valueOf(json.reasonCode as String) : null
        adjustStockCommand.comment = json.comment ?: null

        inventoryService.adjustStock(adjustStockCommand)

        if (adjustStockCommand.hasErrors()) {
            throw new ValidationException("Invalid stock adjustment", adjustStockCommand.errors)
        }

        render([data: [
                inventoryItemId: inventoryItem?.id,
                productId      : inventoryItem?.product?.id,
                newQuantity    : adjustStockCommand.newQuantity,
        ]] as JSON)
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

    private static void requireLocation(Location location) {
        if (!location) {
            throw new IllegalArgumentException("Cannot access inventory without a location - sign in or provide locationId as a request parameter")
        }
    }
}
