/**
 * Copyright (c) 2012 Partners In Health.  All rights reserved.
 * The use and distribution terms for this software are covered by the
 * Eclipse Public License 1.0 (http://opensource.org/licenses/eclipse-1.0.php)
 * which can be found in the file epl-v10.html at the root of this distribution.
 * By using this software in any fashion, you are agreeing to be bound by
 * the terms of this license.
 * You must not remove this notice, or any other, from this software.
 **/

package org.pih.warehouse.inventory

import grails.converters.JSON
import grails.gorm.transactions.Transactional
import grails.validation.Validateable
import grails.validation.ValidationException
import groovy.time.TimeCategory
import org.apache.commons.collections.FactoryUtils
import org.apache.commons.collections.list.LazyList
import org.apache.commons.lang.StringEscapeUtils
import org.pih.warehouse.core.ActivityCode
import org.pih.warehouse.core.Constants
import org.pih.warehouse.core.DefaultNullableCommand
import org.pih.warehouse.core.Tag
import org.pih.warehouse.core.User
import org.pih.warehouse.importer.CSVUtils
import org.pih.warehouse.importer.InventoryExcelImporter
import org.pih.warehouse.product.Category
import org.pih.warehouse.product.Product
import org.pih.warehouse.DateUtil
import org.pih.warehouse.core.Location
import org.pih.warehouse.report.InventoryReportCommand
import org.springframework.web.multipart.MultipartHttpServletRequest

import java.text.SimpleDateFormat

@Transactional
class InventoryController {

    def dataSource
    def productService
    def dashboardService
    def inventoryService
    def requisitionService
    def inventorySnapshotService
    def productAvailabilityService
    def userService
    def uploadService
    def documentService
    TransactionIdentifierService transactionIdentifierService
    def forecastingService
    AdjustInventoryService adjustInventoryService

    static allowedMethods = [show: "GET", search: "POST", download: "GET"]

    def index() {
        redirect(action: "browse")
    }

    def manage(ManageInventoryCommand command) {
        render(view: "/common/react")
    }

    def cycleCount() {
        render(view: "/common/react")
    }

    def binLocations() {
        Location location = Location.load(session.warehouse.id)
        List binLocations = productAvailabilityService.getQuantityOnHandByBinLocation(location)

        def data = binLocations.collect {
            [
                    it?.inventoryItem?.product?.productCode,
                    it?.inventoryItem?.product?.name,
                    it?.binLocation?.name,
                    it?.inventoryItem?.lotNumber,
                    it?.inventoryItem?.expirationDate ? Constants.EXPIRATION_DATE_FORMATTER.format(it?.inventoryItem?.expirationDate) : null,
                    it?.quantity,
                    it?.quantity,
                    "None"
            ]
        }

        def results = ["aaData": data]
        render(results as JSON)
    }

    def editBinLocation() {
        // The inventory/manage screen still loads this action as an AJAX dialog,
        // so keep serving the GSP for XHR requests; direct navigation gets the
        // React screen.
        if (request.xhr) {
            Product product = Product.findByProductCode(params.productCode)
            Location location = Location.get(session.warehouse.id)
            Location binLocation = Location.findByParentLocationAndName(location, params.binLocation)
            InventoryItem inventoryItem = inventoryService.findInventoryItemByProductAndLotNumber(product, params.lotNumber)
            Integer quantity = inventoryService.getQuantityFromBinLocation(location, binLocation, inventoryItem)
            return [location: location, binLocation: binLocation, inventoryItem: inventoryItem, quantity: quantity]
        }
        render(view: "/common/react", params: params)
    }

    def saveInventoryChanges(ManageInventoryCommand command) {
        Transaction transaction = new Transaction(params)
        try {
            //transaction.transactionDate = params.transactionDate
            transaction.createdBy = User.load(session.user.id)
            transaction.inventory = Location.load(session.warehouse.id).inventory

            command.entries.each { entry ->
                if (entry?.quantity > 0) {
                    def transactionEntry = new TransactionEntry()
                    transactionEntry.inventoryItem = entry.inventoryItem
                    transactionEntry.product = entry.inventoryItem.product
                    transactionEntry.quantity = entry.quantity
                    transaction.addToTransactionEntries(transactionEntry)
                }
            }

            log.info("size " + transaction?.transactionEntries?.size())

            if (!transaction?.transactionEntries) {
                throw new ValidationException("Transaction entries must not be empty", transaction.errors)
            }

            log.info("validate: " + transaction.validate())

            if (transaction.validate() && transaction.save()) {
                flash.message = "Transaction ${transaction.id} saved"
            } else {
                throw new ValidationException("Transaction errors", transaction.errors)
            }
        } catch (Exception e) {
            command.errors = transaction.errors
            chain(action: "manage", model: [command: command], params: params)
            return
        }

        redirect(action: "manage", params: [tags: params.tags])

    }

    /**
     * Allows a user to browse the inventory for a particular warehouse.
     */
    //@Cacheable("inventoryControllerCache")
    def browse(InventoryCommand command) {
        render(view: "/common/react", params: params)
    }

    /**
     *
     */
    def show() {
        def quantityMap = [:]
        def startTime = System.currentTimeMillis()
        def location = Location.get(session.warehouse.id)
        def inventoryInstance = Inventory.get(params.id)
        if (!inventoryInstance) {
            inventoryInstance = location.inventory
        }
        if (!inventoryInstance) {
            flash.message = "${warehouse.message(code: 'default.not.found.message', args: [warehouse.message(code: 'inventory.label', default: 'Inventory'), params.id])}"
            redirect(action: "list")
            return
        }


        def elapsedTime = (System.currentTimeMillis() - startTime)
        log.info("Show current inventory: " + (System.currentTimeMillis() - startTime) + " ms")
        [
                //inventoryMapping: inventoryMapping,
                location   : location,
                elapsedTime: elapsedTime,
                quantityMap: quantityMap
        ]

    }

    def download(QuantityOnHandReportCommand command) {

        println "search " + params
        println "search " + command.location + " " + command.startDate
        def quantityMap = inventoryService.getQuantityOnHandAsOfDate(command.location, command.startDate, command.tags)
        if (quantityMap) {
            def statusMap = dashboardService.getInventoryStatus(command.location)
            def inventoryItems = []

            quantityMap.each { Product product, quantity ->
                def inventoryLevel = product.getInventoryLevel(command.location?.id)
                def quantityAvailableToPromise = inventoryService.getQuantityAvailableToPromise(product, command.location)

                inventoryItems << [
                        status: statusMap[product],
                        product: product,
                        quantity: quantity,
                        quantityAvailableToPromise: quantityAvailableToPromise,
                        inventoryLevel: inventoryLevel
                ]
            }

            def filename = "Stock report - " +
                    (command?.tag ? command?.tag?.tag : "All Products") + " - " +
                    command?.location?.name + " - " +
                    command?.startDate?.format("yyyyMMMdd") + ".csv"
            response.setHeader("Content-disposition", "attachment; filename=\"${filename}\"")
            render(contentType: "text/csv", text: getCsvForProductMap(inventoryItems))
            return
        }
        flash.message = "There are no search results available to download - please try again."
        redirect(action: "show")

    }


    def addToInventory() {
        def inventoryInstance = Inventory.get(params.id)
        def productInstance = Product.get(params.product.id)

        if (!productInstance) {
            flash.message = "${warehouse.message(code: 'default.not.found.message', args: [warehouse.message(code: 'product.label', default: 'Product'), params?.product?.id])}"
            redirect(action: "browse")
        } else {
            def itemInstance = new InventoryItem(product: productInstance)
            if (!itemInstance.hasErrors() && itemInstance.save(flush: true)) {
                flash.message = "${warehouse.message(code: 'default.updated.message', args: [warehouse.message(code: 'inventory.label', default: 'Inventory'), inventoryInstance.id])}"
                redirect(action: "browse", id: inventoryInstance.id)
            } else {
                flash.message = "${warehouse.message(code: 'inventory.unableToCreateItem.message')}"
            }
        }
    }


    def edit() {
        def inventoryInstance = Inventory.get(params.id)
        if (!inventoryInstance) {
            flash.message = "${warehouse.message(code: 'default.not.found.message', args: [warehouse.message(code: 'inventory.label', default: 'Inventory'), params.id])}"
            redirect(action: "list")
        } else {
            def productInstanceMap = Product.getAll().groupBy { it.productType }

            return [inventoryInstance: inventoryInstance, productInstanceMap: productInstanceMap]
        }
    }

    def delete() {
        def inventoryInstance = Inventory.get(params.id)
        if (inventoryInstance) {
            try {
                inventoryInstance.delete(flush: true)
                flash.message = "${warehouse.message(code: 'default.deleted.message', args: [warehouse.message(code: 'inventory.label', default: 'Inventory'), params.id])}"
                redirect(action: "list")
            }
            catch (org.springframework.dao.DataIntegrityViolationException e) {
                flash.message = "${warehouse.message(code: 'default.not.deleted.message', args: [warehouse.message(code: 'inventory.label', default: 'Inventory'), params.id])}"
                redirect(action: "show", id: params.id)
            }
        } else {
            flash.message = "${warehouse.message(code: 'default.not.found.message', args: [warehouse.message(code: 'inventory.label', default: 'Inventory'), params.id])}"
            redirect(action: "list")
        }
    }

    def deleteItem() {
        def itemInstance = InventoryItem.get(params.id)
        if (itemInstance) {
            try {
                itemInstance.delete(flush: true)
                flash.message = "${warehouse.message(code: 'default.deleted.message', args: [warehouse.message(code: 'inventoryItem.label', default: 'Inventory item'), params.id])}"
                redirect(action: "show", id: params.inventory.id)
            }
            catch (org.springframework.dao.DataIntegrityViolationException e) {
                flash.message = "${warehouse.message(code: 'default.not.deleted.message', args: [warehouse.message(code: 'inventoryItem.label', default: 'Inventory item'), params.id])}"
                redirect(action: "show", id: params.inventory.id)
            }
        } else {
            flash.message = "${warehouse.message(code: 'default.not.found.message', args: [warehouse.message(code: 'inventory.label', default: 'Inventory'), params.id])}"
            redirect(action: "show", id: params.inventory.id)
        }
    }

    def listDailyTransactions() {
        render(view: "/common/react")
    }

    private def determineCategories(params) {
        List<Category> categories = params.list('categories') ?
                Category.findAllByIdInList(params.list('categories')) : []

        // When accessing the page for the first time, the flag should be set to true
        // Initially there no parameter _includeSubcategories, only after running the report manually it is set
        params.includeSubcategories = params.containsKey("_includeSubcategories") ? params.includeSubcategories : true
        if (params.includeSubcategories) {
            categories = inventoryService.getExplodedCategories(categories)
        }
        return categories;
    }

    private def listStock(Map params, String methodName, String fileNamePrefix) {
        def location = Location.get(session.warehouse.id)
        List<Category> categories = this.determineCategories(params)

        def inventoryItems = dashboardService."$methodName"(location, categories)

        if (params.button == "download") {
            def filename = fileNamePrefix + location.name + ".csv"
            response.setHeader("Content-disposition", "attachment; filename=\"${filename}\"")
            render(contentType: "text/csv", text: getCsvForProductMap(inventoryItems))
            return
        }

        render(view: "list", model: [availableItems: inventoryItems])
    }

    def list() {
        if (params.button == "download") {
            this.listStock(params, "getInventoryItems", "")
            return
        }
        render(view: "/common/react")
    }

    def listReconditionedStock() {
        this.listStock(params, "getReconditionedStock", "Reconditioned stock - ")
    }

    def listTotalStock() {
        this.listStock(params, "getTotalStock", "Total stock - ")
    }

    def listInStock() {
        this.listStock(params, "getInStock", "In stock - ")
    }

    def listLowStock() {
        if (params.button == "download") {
            this.listStock(params, "getLowStock", "Low stock - ")
            return
        }
        render(view: "/common/react")
    }

    def listReorderStock() {
        if (params.button == "download") {
            this.listStock(params, "getReorderStock", "Reorder stock - ")
            return
        }
        render(view: "/common/react")
    }

    def reorderReport() {
        render(view: "/common/react")
    }

    def listQuantityOnHandZero() {
        this.listStock(params, "getQuantityOnHandZero", "Out of stock  - all - ")
    }

    def listHealthyStock() {
        this.listStock(params, "getHealthyStock", "Overstock - ")
    }

    def listOverStock() {
        this.listStock(params, "getOverStock", "Overstock - ")
    }

    def listExpiredStock(InventoryReportCommand command) {
        if (params.format == "csv") {
            command.location = Location.get(session.warehouse.id)
            Boolean withBinLocation = params.boolean("withBinLocation")

            List<InventoryItem> inventoryItems = dashboardService.getExpiredStock(command)

            List<Map> data = []
            if (!inventoryItems.isEmpty()) {
                data = withBinLocation
                        ? productAvailabilityService.getAvailableQuantityOnHandByBinLocation(command.location, inventoryItems)
                        : productAvailabilityService.getQuantityOnHandByInventoryItem(command.location, inventoryItems)
                        .collect{ key, val -> [ inventoryItem: key, quantity: val ] }
            }

            def filename = "Expired stock | " + command.location?.name + ".csv"
            response.setHeader("Content-disposition", "attachment; filename=\"${filename}\"")
            render(contentType: "text/csv", text: getCsvForInventoryMap(data, withBinLocation))
            return
        }

        render(view: "/common/react")
    }


    def listExpiringStock(InventoryReportCommand command) {
        if (params.format == "csv") {
            command.location = Location.get(session.warehouse.id)
            Boolean withBinLocation = params.boolean("withBinLocation")

            List<InventoryItem> inventoryItems = dashboardService.getExpiringStock(command)

            List<Map> data = []
            if (!inventoryItems?.isEmpty()) {
                data = withBinLocation
                        ? productAvailabilityService.getAvailableQuantityOnHandByBinLocation(command.location, inventoryItems)
                        : productAvailabilityService.getQuantityOnHandByInventoryItem(command.location, inventoryItems)
                        .collect{ key, val -> [ inventoryItem: key, quantity: val ] }
            }

            def filename = "Expiring stock | " + command.location.name + ".csv"
            response.setHeader("Content-disposition", "attachment; filename=\"${filename}\"")
            render(contentType: "text/csv", text: getCsvForInventoryMap(data, withBinLocation))
            return
        }

        render(view: "/common/react")
    }

    def exportLatestInventoryDate() {
        println params
        def location = Location.get(session.warehouse.id)

        if (location) {
            def date = new Date()
            response.setHeader("Content-disposition",
                    "attachment; filename=\"MostRecentStockCount-${date.format("yyyyMMdd-hhmmss")}.csv\"")
            response.contentType = "text/csv"
            render dashboardService.exportLatestInventoryDate(location)
        } else {
            //render(text: 'No products found', status: 404)
            response.sendError(404)
        }
    }

    /**
     * Used to create default inventory items.
     * @return
     */
    def createDefaultInventoryItems() {
        def products = inventoryService.findProductsWithoutEmptyLotNumber()
        products.each { product ->
            def inventoryItem = new InventoryItem()
            inventoryItem.product = product
            inventoryItem.lotNumber = null
            inventoryItem.expirationDate = null
            inventoryItem.save()
        }
        redirect(controller: "inventory", action: "showProducts")
    }


    def showProducts() {
        render(view: "/common/react")
    }

    def listTransactions() {
        render(view: "/common/react")
    }

    def listAllTransactions() {
        redirect(action: "listTransactions")
    }

    def deleteTransaction() {
        def transactionInstance = Transaction.get(params.id)

        if (transactionInstance) {
            try {

                inventoryService.deleteTransaction(transactionInstance)
                flash.message = "${warehouse.message(code: 'default.deleted.message', args: [warehouse.message(code: 'transaction.label', default: 'Transaction'), params.id])}"
                redirect(action: "listTransactions")
            }
            catch (org.springframework.dao.DataIntegrityViolationException e) {
                flash.message = "${warehouse.message(code: 'default.not.deleted.message', args: [warehouse.message(code: 'transaction.label', default: 'Transaction'), params.id])}"
                redirect(action: "editTransaction", id: params.id)
            }
        } else {
            flash.message = "${warehouse.message(code: 'default.not.found.message', args: [warehouse.message(code: 'transaction.label', default: 'Transaction'), params.id])}"
            redirect(action: "listTransactions")
        }
    }


    def saveTransaction() {
        log.debug "save transaction: " + params
        def transactionInstance = Transaction.get(params.id)
        // def inventoryInstance = Inventory.get(params.inventory.id);

        if (!transactionInstance) {
            transactionInstance = new Transaction()
        }

        transactionInstance.properties = params

        // either save as a local transfer, or a generic transaction
        // (catch any exceptions so that we display "nice" error messages)
        Boolean saved = null
        if (transactionInstance.validate() && !transactionInstance.hasErrors()) {
            try {
                transactionInstance.lastUpdated = new Date()
                saved = transactionInstance.save(flush: true)
            }
            catch (Exception e) {
                log.error("Unable to save transaction ", e)
            }
        }

        if (saved) {
            flash.message = "${warehouse.message(code: 'inventory.transactionSaved.message')}"
            redirect(action: "editTransaction", id: transactionInstance?.id)
        } else {
            flash.message = "${warehouse.message(code: 'inventory.unableToSaveTransaction.message')}"
            flash.errors = transactionInstance.errors
            redirect(action: "editTransaction", id: transactionInstance?.id)
        }
    }

    /**
     * Show the transaction.
     */
    def showTransaction() {
        def transactionInstance = Transaction.get(params.id)
        if (!transactionInstance) {
            flash.message = "${warehouse.message(code: 'inventory.noTransactionWithId.message', args: [params.id])}"
            transactionInstance = new Transaction()
        }

        render(view: "/common/react")
    }

    def confirmTransaction() {
        def transactionInstance = Transaction.get(params?.id)
        if (transactionInstance?.confirmed) {
            transactionInstance?.confirmed = Boolean.FALSE
            transactionInstance?.confirmedBy = null
            transactionInstance?.dateConfirmed = null
            flash.message = "${warehouse.message(code: 'inventory.transactionHasBeenUnconfirmed.message')}"
        } else {
            transactionInstance?.confirmed = Boolean.TRUE
            transactionInstance?.confirmedBy = User.get(session?.user?.id)
            transactionInstance?.dateConfirmed = new Date()
            flash.message = "${warehouse.message(code: 'inventory.transactionHasBeenConfirmed.message')}"
        }
        redirect(action: "listTransactions")
    }

    def createInboundTransfer() {
        Location location = Location.get(session.warehouse.id)
        if (!location.supports(ActivityCode.RECEIVE_STOCK)) {
            throw new UnsupportedOperationException("Location ${location.name} does not support receipt transactions")
        }
        params.transactionType = Constants.TRANSFER_IN_TRANSACTION_TYPE_ID
        redirect(action: "createTransaction", params: createTransactionRedirectParams())
    }

    def createOutboundTransfer() {
        Location location = Location.get(session.warehouse.id)
        if (!location.supports(ActivityCode.SEND_STOCK)) {
            throw new UnsupportedOperationException("Location ${location.name} does not support transfer transactions")
        }
        params.transactionType = Constants.TRANSFER_OUT_TRANSACTION_TYPE_ID
        redirect(action: "createTransaction", params: createTransactionRedirectParams())
    }

    def createAdjustment() {
        Location location = Location.get(session.warehouse.id)
        if (!location.supports(ActivityCode.ADJUST_INVENTORY)) {
            throw new UnsupportedOperationException("Location ${location.name} does not support adjustment transactions")
        }
        params.transactionType = Constants.ADJUSTMENT_CREDIT_TRANSACTION_TYPE_ID
        redirect(action: "createTransaction", params: createTransactionRedirectParams())
    }

    def createConsumed() {
        Location location = Location.get(session.warehouse.id)
        if (!location.supports(ActivityCode.CONSUME_STOCK)) {
            throw new UnsupportedOperationException("Location ${location.name} does not support consumption transactions")
        }
        params.transactionType = Constants.CONSUMPTION_TRANSACTION_TYPE_ID
        redirect(action: "createTransaction", params: createTransactionRedirectParams())
    }

    def createExpired() {
        params.transactionType = Constants.EXPIRATION_TRANSACTION_TYPE_ID
        redirect(action: "createTransaction", params: createTransactionRedirectParams())
    }

    def createDamaged() {
        params.transactionType = Constants.DAMAGE_TRANSACTION_TYPE_ID
        redirect(action: "createTransaction", params: createTransactionRedirectParams())
    }

    // The legacy shortcut actions above and the expiring/expired stock list
    // forms carry their selection in POST bodies or non-routable URLs, so
    // normalize everything into query parameters the React screen can read.
    private Map createTransactionRedirectParams() {
        [
                'transactionType.id': params['transactionType.id'] ?: params.transactionType,
                'product.id'        : params.list('product.id'),
                'inventoryItem.id'  : params.list('inventoryItem.id'),
        ].findAll { it.value }
    }

    def createTransaction() {
        if (request.method == "POST") {
            redirect(action: "createTransaction", params: createTransactionRedirectParams())
            return
        }
        render(view: "/common/react", params: params)
    }

    /**
     * Save a transaction that debits stock from the given inventory.
     *
     * TRANSFER_OUT, CONSUMED, DAMAGED, EXPIRED
     */

    def editTransaction() {
        def transactionInstance = Transaction.get(params?.id)
        if (!transactionInstance) {
            flash.message = "${warehouse.message(code: 'inventory.noTransactionWithId.message', args: [params.id])}"
            redirect(action: "listTransactions")
            return
        }

        render(view: "/common/react")
    }


    /**
     * TODO These are the same methods used in the inventory browser.  Need to figure out a better
     * way to handle this (e.g. through a generic ajax call or taglib).
     */
    def removeCategoryFilter() {
        def category = Category.get(params?.categoryId)
        if (category)
            session.inventoryCategoryFilters.remove(category?.id)
        redirect(action: browse)
    }

    def clearAllFilters() {
        session.inventoryCategoryFilters = []
        session.inventorySearchTerms = []
        redirect(action: browse)
    }
    def addCategoryFilter() {
        def category = Category.get(params?.categoryId)
        if (category && !session.inventoryCategoryFilters.contains(category?.id))
            session.inventoryCategoryFilters << category?.id
        redirect(action: browse)
    }
    def narrowCategoryFilter() {
        def category = Category.get(params?.categoryId)
        session.inventoryCategoryFilters = []
        if (category && !session.inventoryCategoryFilters.contains(category?.id))
            session.inventoryCategoryFilters << category?.id
        redirect(action: browse)
    }
    def removeSearchTerm() {
        if (params.searchTerm)
            session.inventorySearchTerms.remove(params.searchTerm)
        redirect(action: browse)
    }


    def upload() {
        render(view: "/common/react")
    }

    def downloadTemplate() {
        Location location = Location.load(session.warehouse.id)
        List data = productAvailabilityService.getQuantityOnHandByBinLocation(location)
        def rows = []

        if (!data) {
            def row = [
                    'Product code'    : '',
                    'Product name'    : '',
                    'Lot number'      : '',
                    'Expiration date' : '',
                    'Bin location'    : '',
                    'OB QOH'          : '',
                    'Physical QOH'    : '',
                    'Comment'         : '',
            ]

            rows << row
        }

        data.findAll { it.quantity }.each {
            def row = [
                    'Product code'    : it.product?.productCode,
                    'Product name'    : it.product?.name,
                    'Lot number'      : it.inventoryItem?.lotNumber,
                    'Expiration date' : it.inventoryItem?.expirationDate?.format("MM/dd/yyyy"),
                    'Bin location'    : it.binLocation?.name,
                    'OB QOH'          : it.quantity,
                    'Physical QOH'    : '',
                    'Comment'         : '',
            ]

            rows << row
        }
        response.setHeader("Content-disposition", "attachment; filename=\"inventory.xls\"")
        response.setContentType("application/vnd.ms-excel")
        documentService.generateInventoryTemplate(response.outputStream, rows)
        response.outputStream.flush()
    }

    private def mergeQuantityMap(oldQuantityMap, newQuantityMap) {
        oldQuantityMap.each { product, oldQuantity ->
            def newQuantity = newQuantityMap[product] ?: 0
            oldQuantityMap[product] = newQuantity + oldQuantity

        }
        return oldQuantityMap
    }

    private def getDatesBetween(startDate, endDate, frequency) {

        def count = 0
        def dates = []
        if (startDate.before(endDate)) {
            def date = startDate
            def end = endDate
            use(TimeCategory) {
                end = endDate.plus(1.day)
            }
            while (date.before(end)) {
                println "Start date = " + date + " endDate = " + endDate

                dates << date
                if (params.frequency in ['Daily']) {
                    use(TimeCategory) {
                        date = date.plus(1.day)
                    }
                } else if (params.frequency in ['Weekly']) {
                    use(TimeCategory) {
                        date = date.plus(1.week)
                    }
                } else if (params.frequency in ['Monthly']) {
                    use(TimeCategory) {
                        date = date.plus(1.month)
                    }
                } else if (params.frequency in ['Quarterly']) {
                    use(TimeCategory) {
                        date = date.plus(3.month)
                    }
                } else if (params.frequency in ['Annually']) {
                    use(TimeCategory) {
                        date = date.plus(1.year)
                    }
                } else {
                    use(TimeCategory) {
                        date = date.plus(1.day)
                    }

                }
                count++
            }
        }
        return dates
    }

    private def getCsvForInventoryMap(List<Map> data, Boolean includeBinLocation = false) {
        def csv = ""
        csv += '"' + "${warehouse.message(code: 'inventoryLevel.status.label')}" + '"' + ","
        csv += '"' + "${warehouse.message(code: 'product.productCode.label')}" + '"' + ","
        csv += '"' + "${warehouse.message(code: 'product.label')}" + '"' + ","
        csv += '"' + "${warehouse.message(code: 'inventoryItem.lotNumber.label')}" + '"' + ","
        csv += '"' + "${warehouse.message(code: 'inventoryItem.expirationDate.label')}" + '"' + ","
        csv += '"' + "${warehouse.message(code: 'product.productFamily.label')}" + '"' + ","
        csv += '"' + "${warehouse.message(code: 'category.label')}" + '"' + ","
        csv += '"' + "${warehouse.message(code: 'product.tags.label', default: 'Tags')}" + '"' + ","
        if (includeBinLocation) {
            csv += '"' + "${warehouse.message(code: 'inventoryLevel.binLocation.label')}" + '"' + ","
        }
        csv += '"' + "${warehouse.message(code: 'product.unitOfMeasure.label')}" + '"' + ","
        csv += '"' + "${warehouse.message(code: 'inventoryLevel.minQuantity.label')}" + '"' + ","
        csv += '"' + "${warehouse.message(code: 'inventoryLevel.reorderQuantity.label')}" + '"' + ","
        csv += '"' + "${warehouse.message(code: 'inventoryLevel.maxQuantity.label')}" + '"' + ","
        csv += '"' + "${warehouse.message(code: 'inventoryLevel.forecastQuantity.label')}" + '"' + ","
        csv += '"' + "${warehouse.message(code: 'inventoryLevel.currentQuantity.label', default: 'Current quantity')}" + '"' + ","
        csv += '"' + "${warehouse.message(code: 'product.pricePerUnit.label')}" + '"' + ","
        csv += '"' + "${warehouse.message(code: 'product.totalValue.label')}" + '"'
        csv += "\n"

        def hasRoleFinance = userService.hasRoleFinance(session.user)

        data.each { it ->

            Product product = it.inventoryItem?.product
            InventoryLevel inventoryLevel = product?.getInventoryLevel(session.warehouse.id)
            BigDecimal quantity = it.quantity ?: 0
            BigDecimal totalValue = (product?.pricePerUnit ?: 0) * (quantity)
            String status = inventoryLevel?.statusMessage(quantity as Long)
            if (!status) {
                status = quantity > 0 ? "IN_STOCK" : "STOCK_OUT"
            }
            String statusMessage = "${warehouse.message(code: 'enum.InventoryLevelStatusCsv.' + status, default: status)}"

            csv += '"' + (statusMessage ?: "") + '"' + ","
            csv += '"' + (product.productCode ?: "") + '"' + ","
            csv += StringEscapeUtils.escapeCsv(product?.displayNameWithLocaleCode ?: "") + ","
            csv += StringEscapeUtils.escapeCsv(it.inventoryItem?.lotNumber ?: "") + ","
            csv += '"' + formatDate(date: it.inventoryItem?.expirationDate, format: 'dd/MM/yyyy') + '"' + ","
            csv += '"' + (product?.productFamily?.name ?: "") + '"' + ','
            csv += StringEscapeUtils.escapeCsv(product?.category?.name ?: "") + ","
            csv += '"' + (product?.tagsToString() ?: "") + '"' + ","
            if (includeBinLocation) {
                csv += '"' + (it.binLocation ?: "") + '"' + ","
            }
            csv += '"' + (product?.unitOfMeasure ?: "") + '"' + ","
            csv += (inventoryLevel?.minQuantity ?: "") + ","
            csv += (inventoryLevel?.reorderQuantity ?: "") + ","
            csv += (inventoryLevel?.maxQuantity ?: "") + ","
            csv += (inventoryLevel?.forecastQuantity ?: "") + ","
            csv += '' + quantity + '' + ","
            csv += (hasRoleFinance ? (product?.pricePerUnit ?: "") : "") + ","
            csv += (hasRoleFinance ? (totalValue ?: "") : "")
            csv += "\n"
        }
        return CSVUtils.prependBomToCsvString(csv)
    }

    private def getCsvForProductMap(inventoryItems) {
        def hasRoleFinance = userService.hasRoleFinance(session.user)

        def csv = ""
        csv += '"' + "${warehouse.message(code: 'inventoryLevel.status.label')}" + '"' + ","
        csv += '"' + "${warehouse.message(code: 'product.productCode.label')}" + '"' + ","
        csv += '"' + "${warehouse.message(code: 'product.label')}" + '"' + ","
        csv += '"' + "${warehouse.message(code: 'product.productFamily.label')}" + '"' + ","
        csv += '"' + "${warehouse.message(code: 'category.label')}" + '"' + ","
        csv += '"' + "${warehouse.message(code: 'product.tags.label', default: 'Tags')}" + '"' + ","
        csv += '"' + "${warehouse.message(code: 'inventoryLevel.abcClass.label', default: 'ABC Class')}" + '"' + ","
        csv += '"' + "${warehouse.message(code: 'product.unitOfMeasure.label')}" + '"' + ","
        csv += '"' + "${warehouse.message(code: 'inventoryLevel.minQuantity.label')}" + '"' + ","
        csv += '"' + "${warehouse.message(code: 'inventoryLevel.reorderQuantity.label')}" + '"' + ","
        csv += '"' + "${warehouse.message(code: 'inventoryLevel.maxQuantity.label')}" + '"' + ","
        csv += '"' + "${warehouse.message(code: 'inventoryLevel.forecastQuantity.label')}" + '"' + ","
        csv += '"' + "${warehouse.message(code: 'inventoryLevel.currentQuantity.label', default: 'Current quantity')}" + '"' + ","
        csv += '"' + "${warehouse.message(code: 'default.quantityAvailableToPromise.label', default: 'Quantity ATP')}" + '"' + ","
        csv += '"' + "${warehouse.message(code: 'product.pricePerUnit.label')}" + '"' + ","
        csv += '"' + "${warehouse.message(code: 'product.totalValue.label')}" + '"'
        csv += "\n"

        inventoryItems.each { inventoryItem ->
            Product product = inventoryItem.product
            def quantity = inventoryItem.quantity
            InventoryLevel inventoryLevel = inventoryItem.inventoryLevel
            def status = inventoryItem.status
            def totalValue = (product?.pricePerUnit ?: 0) * (quantity ?: 0)
            def statusMessage = "${warehouse.message(code: 'enum.InventoryLevelStatusCsv.' + status)}"

            csv += '"' + (statusMessage ?: "") + '"' + ","
            csv += '"' + (product.productCode ?: "") + '"' + ","
            csv += StringEscapeUtils.escapeCsv(product.displayNameWithLocaleCode) + ","
            csv += '"' + (product?.productFamily?.name ?: "") + '"' + ","
            csv += '"' + (product?.category?.getHierarchyAsString(" > ") ?: "") + '"' + ","
            csv += '"' + (product?.tagsToString() ?: "") + '"' + ","
            csv += '"' + (inventoryLevel?.abcClass ?: "") + '"' + ","
            csv += '"' + (product?.unitOfMeasure ?: "") + '"' + ","
            csv += (inventoryLevel?.minQuantity ?: "") + ","
            csv += (inventoryLevel?.reorderQuantity ?: "") + ","
            csv += (inventoryLevel?.maxQuantity ?: "") + ","
            csv += (inventoryLevel?.forecastQuantity ?: "") + ","
            csv += (quantity ?: "0") + ","
            csv += (inventoryItem.quantityAvailableToPromise ?: "0") + ","
            csv += (hasRoleFinance ? (product?.pricePerUnit ?: "") : "") + ","
            csv += (hasRoleFinance ? (totalValue ?: "") : "")
            csv += "\n"
        }
        return CSVUtils.prependBomToCsvString(csv)
    }

}


class QuantityOnHandReportCommand implements Validateable {
    List<Location> locations = LazyList.decorate(new ArrayList(), FactoryUtils.instantiateFactory(Location.class))
    List dates = []
    List products = []
    List tags = []
    Tag tag
    Date startDate = new Date()
    Date endDate
    String frequency


    static constraints = {
        locations(nullable: false,
                validator: { value, obj -> value?.size() >= 1 })
        startDate(nullable: false,
                validator: { value, obj -> !obj.endDate || value.before(obj.endDate) })
        endDate(nullable: false)
        frequency(nullable: false, blank: false)
        tag(nullable: true)
    }
}

class ManageInventoryCommand extends DefaultNullableCommand {

    List<ManageInventoryEntryCommand> entries = LazyList.decorate(new ArrayList(), FactoryUtils.instantiateFactory(ManageInventoryEntryCommand.class))
    List inventoryItems = []
    List binLocations = []
    String productCodes
    List tags = []
}

class ManageInventoryEntryCommand extends DefaultNullableCommand {
    InventoryItem inventoryItem
    Integer quantity

}
