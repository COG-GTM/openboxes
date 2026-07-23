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
import grails.validation.ValidationException
import groovy.time.TimeCategory
import grails.plugins.csv.CSVWriter
import org.pih.warehouse.core.Location
import org.pih.warehouse.core.Person
import org.pih.warehouse.core.User
import org.pih.warehouse.order.OrderItem
import org.pih.warehouse.order.OrderItemStatusCode
import org.pih.warehouse.product.Product
import org.pih.warehouse.product.ProductException
import org.pih.warehouse.requisition.RequisitionItem
import org.pih.warehouse.shipping.Container
import org.pih.warehouse.shipping.Shipment
import org.pih.warehouse.shipping.ShipmentItem
import org.pih.warehouse.shipping.ShipmentItemException
import org.pih.warehouse.DateUtil
import grails.core.GrailsApplication

import java.text.DateFormat
import java.text.SimpleDateFormat

class InventoryItemController {

    def dataService
    def inventoryService
    def shipmentService
    def requisitionService
    def orderService
    def forecastingService
    def userService
    def productAvailabilityService
    GrailsApplication grailsApplication
    InventoryItemDataService inventoryItemDataService
    StockHistoryAssembler stockHistoryAssembler

    def index() {
        redirect(controller: "inventory", action: "browse")
    }

    /**
     * Ajax method for the Record Inventory page.
     */
    def getInventoryItems() {
        def productInstance = Product.get(params?.product?.id)
        def inventoryItemList = inventoryService.getInventoryItemsByProduct(productInstance)
        render inventoryItemList as JSON
    }


    /**
     * Displays the stock card for a product
     */
    def showStockCard(StockCardCommand cmd) {
        render(view: "/common/react")
    }

    def showCurrentStock(StockCardCommand cmd) {
        def startTime = System.currentTimeMillis()
        cmd.warehouse = Location.get(session?.warehouse?.id)
        def commandInstance = inventoryService.getStockCardCommand(cmd, params)
        commandInstance.product = Product.get(params.id)
        log.info "${controllerName}.${actionName}: " + (System.currentTimeMillis() - startTime) + " ms"
        log.info "Product " + commandInstance.product
        render(template: "showCurrentStock", model: [commandInstance: commandInstance])
    }


    def showCurrentStockAllLocations(StockCardCommand cmd) {
        def startTime = System.currentTimeMillis()
        // TODO: This whole logic below should be moved to the service layer to return only POJOs used by the views
        User currentUser = User.get(session.user.id)
        Location currentLocation = Location.get(session?.warehouse?.id)
        cmd.warehouse = currentLocation
        cmd.product = Product.get(params?.product?.id ?: params.id)
        if (!cmd.product) {
            throw new ProductException("Product with identifier '${params?.product?.id ?: params.id}' could not be found")
        }
        List<Map> quantityMap = inventoryService.getCurrentStockAllLocations(cmd.product, currentUser)
        if (params.download && quantityMap) {
            def sw = new StringWriter()

            def csv = new CSVWriter(sw, {
                "Code" { it.code }
                "Product" { it.product }
                "Location Group" { it.locationGroup }
                "Location" { it.location }
                "Quantity on Hand" { it.qtyOnHand }
                "Total Value" { it.totalValue }
            })

            quantityMap.each {
                it.each { key, values ->
                    values.locations.each { value ->
                        csv << [
                                code         : cmd?.product?.productCode,
                                product      : cmd?.product?.name,
                                locationGroup: key ?: g.message(code: 'locationGroup.empty.label'),
                                location     : value?.location?.name,
                                qtyOnHand    : value.quantity,
                                totalValue   : value.value,
                        ]
                    }
                }
            }

            response.setHeader("Content-disposition", "attachment; filename=\"All-Locations-${cmd?.product?.productCode}.csv\"")
            render(contentType: "text/csv", text: sw.toString(), encoding: "UTF-8")
            return
        } else {
            def targetUri = "/inventoryItem/showStockCard/${cmd?.product?.id}"
            log.info "${controllerName}.${actionName}: " + (System.currentTimeMillis() - startTime) + " ms"

            render(template: "showCurrentStockAllLocations", model: [commandInstance: cmd, quantityMap: quantityMap, targetUri: targetUri])
        }
    }

    def showAssociatedProducts(StockCardCommand cmd) {
        def startTime = System.currentTimeMillis()
        def product = Product.get(params.id)
        def location = Location.get(session?.warehouse?.id)

        def associations = product?.associations
        def products = product?.associatedProducts() as List
        log.info "Products " + products
        def quantityAvailableMap = [:]
        if (!products.isEmpty()) {
            quantityAvailableMap = productAvailabilityService.getQuantityAvailableToPromiseByProduct(location, products)
        }

        def totalQuantity = quantityAvailableMap.values().sum() ?: 0

        log.info "${controllerName}.${actionName}: " + (System.currentTimeMillis() - startTime) + " ms"

        render(template: "showProductAssociations", model: [
            product: product,
            associations: associations?.sort { it.code },
            quantityAvailableMap: quantityAvailableMap,
            totalQuantity: totalQuantity,
        ])
    }


    def showStockHistory(StockCardCommand cmd) {
        def startTime = System.currentTimeMillis()
        cmd.warehouse = Location.get(session?.warehouse?.id)

        StockHistoryPageModel pageModel = stockHistoryAssembler.assembleStockHistoryPage(cmd, params)

        log.info "${controllerName}.${actionName}: " + (System.currentTimeMillis() - startTime) + " ms"

        StockHistoryResult stockHistory = pageModel.stockHistory

        if (params.print) {
            render(template: "printStockHistory", model: [
                    commandInstance     : pageModel.commandInstance,
                    stockHistoryList    : stockHistory.stockHistoryList,
                    totalBalance        : stockHistory.totalBalance,
                    totalCount          : stockHistory.totalCount,
                    totalCredit         : stockHistory.totalCredit,
                    totalDebit          : stockHistory.totalDebit
            ])
        } else {
            StockHistoryDisplayContext displayContext = pageModel.displayContext
            render(template: "showStockHistory", model: [
                    productId             : pageModel.commandInstance.product.id,
                    stockHistoryList      : pageModel.groupedStockHistoryList,
                    shipmentDtoById       : displayContext.shipmentDtoById,
                    requisitionDtoById    : displayContext.requisitionDtoById,
                    orderDtoById          : displayContext.orderDtoById,
                    totalBalance          : stockHistory.totalBalance,
                    totalCount            : stockHistory.totalCount,
                    totalCredit           : stockHistory.totalCredit,
                    totalDebit            : stockHistory.totalDebit
            ])
        }
    }

    def showSuppliers() {

        def productInstance = Product.get(params.id)
        Location currentLocation = Location.get(session?.warehouse?.id)

        render(template: "showSuppliers", model: [productInstance: productInstance, currentLocation: currentLocation])
    }


    def showPendingInbound() {

        Product product = Product.get(params.id)
        Location location = Location.get(session?.warehouse?.id)
        def itemsMap = [:]
        def shipmentItems, orderItems = []

        shipmentItems = shipmentService.getPendingInboundShipmentItems(location, product)
        shipmentItems.sort { it.shipment.currentStatus }.groupBy { it.shipment }.collect { k, v ->
            itemsMap.put(k, [
                    quantityRemaining: v.quantityRemaining.sum(),
                    quantityPurchased: 0,
                    shipDate: k.expectedShippingDate,
                    type: 'Stock Movement'
            ]
            )
        }
        orderItems = orderService.getPendingInboundOrderItems(location, product)
        orderItems.findAll {orderItem -> orderItem.orderItemStatusCode != OrderItemStatusCode.CANCELED}.collect {
            def existingItem = itemsMap.find {k, v -> k instanceof OrderItem && k.actualReadyDate == it.actualReadyDate && k.order == it.order}
            if (!existingItem) {
                itemsMap.put(it, [
                        quantityRemaining: 0,
                        quantityPurchased: (it.quantityRemaining * it.quantityPerUom).toInteger(),
                        shipDate         : it.actualReadyDate,
                        type             : 'Purchase Order',
                ]
                )
            } else {
                itemsMap[existingItem.getKey()].quantityPurchased += (it.quantityRemaining * it.quantityPerUom).toInteger()
            }
        }


        log.info "itemsMap: " + itemsMap

        render(template: "showPendingInboundStock", model: [product: product, itemsMap: itemsMap])
    }

    def showPendingOutbound() {
        Product product = Product.get(params.id)
        Location location = Location.get(session?.warehouse?.id)
        def itemsMap = [:]
        def requisitionItems

        requisitionItems = requisitionService.getPendingRequisitionItems(location, product)
        requisitionItems.groupBy { it.requisition }.collect { k, v ->
            itemsMap.put(k, [
                    picklistItemsByLot: k?.picklist?.getPicklistItemsByLot(product),
                    quantityRequested: v.quantity.sum(),
                    quantityRequired: v.sum() { RequisitionItem requisitionItem -> requisitionItem.calculateQuantityRequired() },
                    quantityPicked: v.sum() { RequisitionItem requisitionItem -> requisitionItem.calculateQuantityPicked() },
            ]
            )
        }

        log.info "itemsMap: " + itemsMap

        render(template: "showPendingOutboundStock", model: [product: product, itemsMap: itemsMap])
    }

    def showDemand(StockCardCommand cmd) {
        use(TimeCategory) {
            DateFormat dateFormat = new SimpleDateFormat("MM/dd/yyyy")
            // By default set last 12 months
            Integer demandPeriod = grailsApplication.config.openboxes.forecasting.demandPeriod?:365
            // Use the first day of current month as the starting point for the start date calculation
            Map defaultStartDateRange = DateUtil.getDateRange(new Date(), 0)
            params.startDate = params.startDate ? dateFormat.parse(params.startDate) : defaultStartDateRange.startDate - demandPeriod.days
            // Use the last day of previous month as the end date
            Map defaultEndDateRange = DateUtil.getDateRange(new Date(), -1)
            params.endDate = params.endDate ? dateFormat.parse(params.endDate) : defaultEndDateRange.endDate
        }

        // add the current warehouse to the command object
        cmd.warehouse = Location.get(session?.warehouse?.id)
        Location destination = params.destination ? Location.get(params.destination.id) : null

        // now populate the rest of the commmand object
        def commandInstance = inventoryService.getStockCardCommand(cmd, params)

        DateFormat monthFormat = new SimpleDateFormat("MMM yyyy")
        monthFormat.timeZone = TimeZone.default

        def requisitionItemsDemandDetails = forecastingService.getDemandDetails(
            cmd.warehouse,
            destination,
            commandInstance?.product,
            params.startDate,
            params.endDate
        )

        def destinations = forecastingService.getAvailableDestinationsForDemandDetails(
                cmd.warehouse,
                commandInstance?.product,
                params.startDate,
                params.endDate
        )

        requisitionItemsDemandDetails = requisitionItemsDemandDetails.collect {
            [
                    status           : it?.request_status,
                    productCode      : it?.product_code,
                    productName      : it?.product_name,
                    origin           : it?.origin_name,
                    requisitionId    : it?.request_id,
                    requestNumber    : it?.request_number,
                    destination      : it?.destination_name,
                    dateIssued       : it?.date_issued,
                    monthIssued      : it?.date_issued ? monthFormat.format(it?.date_issued) : null,
                    dateRequested    : it?.date_requested,
                    monthRequested   : monthFormat.format(it?.date_requested),
                    quantityRequested: it?.quantity_requested ?: 0,
                    quantityIssued   : it?.quantity_picked ?: 0,
                    quantityDemand   : it?.quantity_demand ?: 0,
                    reasonCode       : it?.reason_code_classification,
            ]
        }

        // Create list of months to display including all months between first requested date and selected end date
        def monthKeys = (params.startDate..params.endDate).collect {
            monthFormat.format(it)
        }.unique()

        render(template: "showDemand",
                model: [commandInstance : commandInstance,
                        requisitionItems: requisitionItemsDemandDetails,
                        numberOfMonths  : monthKeys?.size() ?: 1,
                        monthKeys       : monthKeys,
                        params          : params,
                        destinations    : destinations])
    }

    def showProductDemand() {
        Product product = Product.get(params.id)
        Location location = Location.get(session.warehouse.id)
        if (params.format == 'csv') {
            def data = forecastingService.getDemandDetails(location, product)
            def csv = dataService.generateCsv(data)
            def filename = "Product Demand ${product.productCode} ${location.name}.csv"
            response.setHeader("Content-disposition", "attachment; filename=\"${filename}\"")
            render(contentType: "text/csv", text: csv)

            return
        }

        render(template: "showProductDemand", model: [product: product])
    }


    def showInventorySnapshot() {
        def location = Location.get(session.warehouse.id)
        def product = Product.get(params.id)
        def inventorySnapshots = InventorySnapshot.findAllByProductAndLocation(product, location)
        render(template: "showInventorySnapshot", model: [inventorySnapshots: inventorySnapshots, product: product])

    }


    def showDocuments() {
        def productInstance = Product.get(params.id)
        render(template: "showDocuments", model: [productInstance: productInstance])
    }


    /**
     * Displays the stock card for a product
     */
    def showLotNumbers(StockCardCommand cmd) {
        render(view: "/common/react")
    }

    /**
     * Displays the stock card for a product
     */
    def showTransactionLog(StockCardCommand cmd) {
        render(view: "/common/react")
    }


    /**
     * Displays the stock card for a product
     */
    def showGraph(StockCardCommand cmd) {
        render(view: "/common/react")
    }

    /**
     * Display the Record Inventory form for the product
     */
    def showRecordInventory(RecordInventoryCommand commandInstance) {
        render(view: "/common/react")
    }

    def saveRecordInventory(RecordInventoryCommand commandInstance) {
        inventoryService.saveRecordInventoryCommand(commandInstance, params)
        if (!commandInstance.hasErrors()) {
            // We disabled recalculating product availability during the record stock operation (to avoid
            // recalculating it multiple times) so now we need to refresh it manually.
            productAvailabilityService.refreshProductsAvailability(commandInstance?.inventory?.warehouse?.id,
                    [commandInstance?.product?.id], false)

            redirect(action: "showStockCard", params: ['product.id': commandInstance.product.id])
            return
        }

        // We pass the data to flash to preserve data after a redirect, so it can be used in the showRecordInventory method (OBPIH-7438)
        flash.recordInventoryRows = commandInstance.recordInventoryRows
        flash.errors = commandInstance.errors
        redirect(action: "showRecordInventory", params: ['product.id': commandInstance.product.id])
    }

    def showTransactions() {

        def warehouseInstance = Location.get(session?.warehouse?.id)
        def productInstance = Product.get(params?.product?.id)
        def inventoryInstance = warehouseInstance.inventory
        def inventoryItemList = inventoryService.getInventoryItemsByProductAndInventory(productInstance, inventoryInstance)
        def transactionEntryList = TransactionEntry.findAllByProductAndInventory(productInstance, inventoryInstance)
        def inventoryLevelInstance = InventoryLevel.findByProductAndInventory(productInstance, inventoryInstance)

        [inventoryInstance     : inventoryInstance,
         inventoryLevelInstance: inventoryLevelInstance,
         productInstance       : productInstance,
         inventoryItemList     : inventoryItemList,
         transactionEntryList  : transactionEntryList,
         transactionEntryMap   : transactionEntryList.groupBy { it.transaction }]
    }


    def createInventoryItem() {

        flash.message = "${warehouse.message(code: 'inventoryItem.temporaryCreateInventoryItem.message')}"

        def productInstance = Product.get(params?.product?.id)
        def inventoryInstance = Inventory.get(params?.inventory?.id)
        def itemInstance = new InventoryItem(product: productInstance)
        def inventoryLevelInstance = inventoryService.getInventoryLevelByProductAndInventory(productInstance, inventoryInstance)
        def inventoryItems = inventoryService.getInventoryItemsByProduct(productInstance)
        [itemInstance: itemInstance, inventoryInstance: inventoryInstance, inventoryItems: inventoryItems, inventoryLevelInstance: inventoryLevelInstance, totalQuantity: totalQuantity]
    }

    def edit() {
        def itemInstance = InventoryItem.get(params.id)
        if (!itemInstance) {
            flash.message = "${warehouse.message(code: 'default.not.found.message', args: [warehouse.message(code: 'inventoryItem.label', default: 'Inventory item'), params.id])}"
            redirect(action: "show", id: itemInstance.id)
        } else {
            return [itemInstance: itemInstance]
        }
    }

    def editInventoryLevel() {
        render(view: "/common/react")
    }

    /**
     * Handles form submission from Show Stock Card > Adjust Stock dialog.
     */
    def adjustStock(AdjustStockCommand command) {
        InventoryItem inventoryItem = command.inventoryItem
        try {
            inventoryService.adjustStock(command)
            if (!command.hasErrors()) {
                flash.message = "${warehouse.message(code: 'default.updated.message', args: [warehouse.message(code: 'inventoryItem.label', default: 'Inventory item'), inventoryItem.id])}"
            }
        } catch (ValidationException e) {
            command.errors = e.errors
        }

        if (params.redirectUri) {
            redirect(uri: params.redirectUri)
            return
        }


        chain(controller: "inventoryItem", action: "showStockCard",
                id: inventoryItem?.product?.id, params: ['inventoryItem.id': inventoryItem?.id], model: [command: command])
    }

    def showDialog() {
        def location = Location.get(session.warehouse.id)
        def inventoryItem = InventoryItem.get(params.id)
        def binLocation = Location.get(params.binLocation)
        def quantityAvailable = inventoryService.getQuantityFromBinLocation(location, binLocation, inventoryItem)
        def existsInOtherLocation = inventoryService.isInventoryItemInOtherLocation(location.inventory, inventoryItem)

        render(template: params.template, model: [location         : location,
                                                  binLocation      : binLocation,
                                                  inventoryItem    : inventoryItem,
                                                  quantityAvailable: quantityAvailable,
                                                  existsInOtherLocation: existsInOtherLocation])
    }

    def refreshBinLocation() {
        log.info "params: " + params
        render g.selectBinLocationByLocation(params)
    }


    def transferStock(TransferStockCommand command) {
        log.info "Transfer stock " + params
        log.info "Command " + command

        InventoryItem inventoryItem = command.inventoryItem

        if (inventoryItem) {

            Transaction transaction
            try {
                transaction = inventoryService.transferStock(command)

                if (!transaction.hasErrors()) {
                    flash.message = "${warehouse.message(code: 'default.updated.message', args: [warehouse.message(code: 'inventoryItem.label', default: 'Inventory item'), inventoryItem.id])}"
                } else {
                    chain(controller: "inventoryItem", action: "showStockCard", id: inventoryItem?.product?.id, model: [transaction: transaction])
                    return
                }

            } catch (Exception e) {
                log.error("Error transferring stock " + e.message, e)
                flash.transaction = transaction
                chain(controller: "inventoryItem", action: "showStockCard", id: inventoryItem?.product?.id, model: [transaction: transaction, itemInstance: inventoryItem])
                return
            }
            log.info("transaction " + transaction + " " + transaction?.id)


        }
        redirect(controller: "inventoryItem", action: "showStockCard", id: inventoryItem?.product?.id, params: ['inventoryItem.id': inventoryItem?.id])
    }

    @Transactional
    def deleteTransactionEntry() {
        def transactionEntry = TransactionEntry.get(params.id)
        def productInstance
        if (transactionEntry) {
            productInstance = transactionEntry.inventoryItem.product
            transactionEntry.delete()
        }
        redirect(action: 'showStockCard', params: ['product.id': productInstance?.id])
    }

    def addToInventory() {
        def product = Product.get(params.id)
        render warehouse.message(code: 'inventoryItem.productAddedToInventory.message', args: [product.name])
        //return product as XML
    }
    /**
     * Add a shipment item to a shipment
     */
    @Transactional
    def addToShipment() {
        log.info "params" + params
        def shipmentInstance = null
        def containerInstance = null
        def productInstance = Product.get(params?.product?.id)
        def personInstance = Person.get(params?.recipient?.id)
        def binLocation = Location.get(params?.binLocation?.id)
        def inventoryItem = InventoryItem.get(params?.inventoryItem?.id)

        def shipmentContainer = params.shipmentContainer?.split(":")

        shipmentInstance = Shipment.get(shipmentContainer[0])
        containerInstance = Container.get(shipmentContainer[1])

        log.info("shipment " + shipmentInstance)
        log.info("container " + containerInstance)


        def shipmentItem = new ShipmentItem(
                product: productInstance,
                binLocation: binLocation,
                lotNumber: inventoryItem.lotNumber ?: '',
                expirationDate: inventoryItem?.expirationDate,
                inventoryItem: inventoryItem,
                quantity: params.quantity,
                recipient: personInstance,
                shipment: shipmentInstance,
                container: containerInstance)

        try {

            shipmentService.validateShipmentItem(shipmentItem)

            if (shipmentItem.hasErrors() || !shipmentItem.validate()) {
                flash.message = "${warehouse.message(code: 'inventoryItem.errorValidatingItem.message')}\n"
                shipmentItem.errors.each { flash.message += it }

            }

            if (!shipmentItem.hasErrors()) {
                if (!shipmentInstance.addToShipmentItems(shipmentItem).save()) {
                    log.error("Sorry, unable to add new item to shipment.  Please try again.")
                    flash.message = "${warehouse.message(code: 'inventoryItem.unableToAddItemToShipment.message')}"
                } else {
                    def productDescription = format.product(product: productInstance).decodeHTML() + (inventoryItem?.lotNumber) ? " #" + inventoryItem?.lotNumber : ""
                    flash.message = "${warehouse.message(code: 'inventoryItem.addedItemToShipment.message', args: [productDescription, shipmentInstance?.name])}"
                }
            }

        } catch (ShipmentItemException e) {
            flash['errors'] = e.shipmentItem.errors
        } catch (ValidationException e) {
            flash['errors'] = e.errors
        }

        redirect(action: "showStockCard", params: ['product.id': productInstance?.id])
    }

    @Transactional
    def saveInventoryLevel() {
        // Get existing inventory level
        def inventoryLevelInstance = InventoryLevel.get(params.id)
        def productInstance = Product.get(params?.product?.id)

        if (inventoryLevelInstance) {
            inventoryLevelInstance.properties = params
        } else {
            inventoryLevelInstance = new InventoryLevel(params)
        }

        if (!inventoryLevelInstance.hasErrors() && inventoryLevelInstance.save()) {

        } else {
            flash.message = "${warehouse.message(code: 'inventoryItem.errorSavingInventoryLevels.message')}<br/>"
            inventoryLevelInstance.errors.allErrors.each {
                flash.message += it + "<br/>"
            }
        }
        redirect(action: 'showStockCard', params: ['product.id': productInstance?.id])
    }

    @Transactional
    def create() {
        def inventoryItem = new InventoryItem(params)
        if (InventoryItem && inventoryItem.save()) {
            flash.message = "${warehouse.message(code: 'default.created.message', args: [warehouse.message(code: 'inventoryItem.label'), params.id])}"
        } else {
            flash.message = "${warehouse.message(code: 'default.not.created.message', args: [warehouse.message(code: 'inventoryItem.label')])}"
        }
        redirect(action: 'showLotNumbers', params: ['product.id': inventoryItem?.product?.id])
    }


    def delete() {
        InventoryItem inventoryItem = inventoryItemDataService.getWithProduct(params.id)
        if (inventoryItem) {
            try {
                inventoryItemDataService.delete(inventoryItem.id)
                flash.message = "${warehouse.message(code: 'default.deleted.message', args: [warehouse.message(code: 'inventoryItem.label', default: 'Attribute'), params.id])}"
            }
            catch (org.springframework.dao.DataIntegrityViolationException e) {
                flash.message = "${warehouse.message(code: 'default.not.deleted.message', args: [warehouse.message(code: 'inventoryItem.label', default: 'Attribute'), params.id])}"
            }
        } else {
            flash.message = "${warehouse.message(code: 'default.not.found.message', args: [warehouse.message(code: 'inventoryItem.label', default: 'Attribute'), params.id])}"
        }

        redirect(action: 'showLotNumbers', params: ['product.id': inventoryItem?.product?.id])
    }

    @Transactional
    def deleteInventoryItem() {
        def inventoryItem = InventoryItem.get(params.id)
        def productInstance = inventoryItem?.product
        def inventoryInstance = Inventory.get(inventoryItem?.inventory?.id)

        if (inventoryItem && inventoryInstance) {
            inventoryInstance.removeFromInventoryItems(inventoryItem).save()
            inventoryItem.delete()
        } else {
            inventoryItem.errors.reject("inventoryItem.error", "Could not delete inventory item")
            params.put("product.id", productInstance?.id)
            params.put("inventory.id", inventoryInstance?.id)
            log.info "Params " + params
            chain(action: "createInventoryItem", model: [inventoryItem: inventoryItem], params: params)
            return
        }
        redirect(action: 'showStockCard', params: ['product.id': productInstance?.id])

    }

    @Transactional
    def saveTransactionEntry() {
        def productInstance = Product.get(params?.product?.id)
        if (!productInstance) {
            flash.message = "${warehouse.message(code: 'default.notfound.message', args: [warehouse.message(code: 'product.label', default: 'Product'), productInstance.id])}"
            redirect(action: "showStockCard", id: productInstance?.id)
        } else {
            def inventoryItem = inventoryService.findByProductAndLotNumber(productInstance, params.lotNumber ?: null)
            if (!inventoryItem) {
                flash.message = "${warehouse.message(code: 'default.notfound.message', args: [warehouse.message(code: 'inventoryItem.label', default: 'Inventory item'), params.lotNumber])}"
            } else {
                def transactionInstance = new Transaction(params)
                def transactionEntry = new TransactionEntry(params)

                // If we're transferring stock to another location OR consuming stock,
                // then we need to make sure the quantity is negative
                if (transactionInstance?.destination?.id != session?.warehouse?.id
                        || transactionInstance?.transactionType?.name == 'Consumption') {
                    if (transactionEntry.quantity > 0) {
                        transactionEntry.quantity = -transactionEntry.quantity
                    }
                }

                transactionEntry.inventoryItem = inventoryItem
                if (!transactionEntry.hasErrors() &&
                        transactionInstance.addToTransactionEntries(transactionEntry).save(flush: true)) {
                    flash.message = "${warehouse.message(code: 'inventoryItem.savedTransactionEntry.label')}"
                } else {
                    transactionInstance.errors.each { log.info "${it}" }
                    transactionEntry.errors.each { log.info "${it}" }
                    flash.message = "${warehouse.message(code: 'inventoryItem.inventoryItem.unableToSaveTransactionEntry.message.label')}"
                }
            }
        }
        redirect(action: "showStockCard", params: ['product.id': productInstance?.id])
    }

    def recall() {
        InventoryItem inventoryItem = InventoryItem.get(params.id)
        if (userService.isUserAdmin(session.user)) {
            if (inventoryItem.lotNumber) {
                inventoryService.recallInventoryItem(inventoryItem)
                productAvailabilityService.refreshProductsAvailability(null, [inventoryItem?.product?.id], false)
                flash.message = "${warehouse.message(code: 'inventoryItem.recall.message')}"
            } else {
                flash.message = "${warehouse.message(code: 'inventoryItem.recallError.message')}"
            }
        } else {
            flash.message = "${warehouse.message(code: 'errors.noPermissions.label')}"
        }
        redirect(action: 'showLotNumbers', params: ['product.id': inventoryItem?.product?.id])
    }

    def revertRecall() {
        InventoryItem inventoryItem = InventoryItem.get(params.id)
        if (userService.isUserAdmin(session.user)) {
            inventoryService.revertRecallInventoryItem(inventoryItem)
            productAvailabilityService.refreshProductsAvailability(null, [inventoryItem?.product?.id], false)
            flash.message = "${warehouse.message(code: 'inventoryItem.revertRecall.message')}"
        } else {
            flash.message = "${warehouse.message(code: 'errors.noPermissions.label')}"
        }
        redirect(action: 'showLotNumbers', params: ['product.id': inventoryItem?.product?.id])
    }
}
