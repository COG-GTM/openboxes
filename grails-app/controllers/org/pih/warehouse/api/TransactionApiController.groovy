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
import org.grails.web.json.JSONObject
import org.pih.warehouse.DateUtil
import org.pih.warehouse.LocalizationUtil
import org.pih.warehouse.core.ActivityCode
import org.pih.warehouse.core.Constants
import org.pih.warehouse.core.Location
import org.pih.warehouse.core.User
import org.pih.warehouse.inventory.InventoryItem
import org.pih.warehouse.inventory.InventoryService
import org.pih.warehouse.inventory.LocalTransfer
import org.pih.warehouse.inventory.Transaction
import org.pih.warehouse.inventory.TransactionCode
import org.pih.warehouse.inventory.TransactionEntry
import org.pih.warehouse.inventory.TransactionSource
import org.pih.warehouse.inventory.TransactionType
import org.pih.warehouse.product.Product
import org.springframework.dao.DataIntegrityViolationException

import java.text.SimpleDateFormat

@Transactional
class TransactionApiController {


    private static final String DATE_FORMAT = "yyyy-MM-dd"
    private static final String DATE_TIME_FORMAT = "yyyy-MM-dd HH:mm:ss"

    InventoryService inventoryService
    def userService

    def list() {
        Location location = Location.get(params.facilityId ?: session?.warehouse?.id)
        if (!location) {
            response.status = 400
            render([errorMessage: "Location is required - sign in or provide facilityId as a request parameter"] as JSON)
            return
        }

        Integer max = Math.min(params.int('max') ?: 10, 100)
        Integer offset = params.int('offset') ?: 0
        TransactionType transactionType = params.transactionTypeId ? TransactionType.get(params.transactionTypeId) : null
        SimpleDateFormat dateFormat = new SimpleDateFormat(DATE_FORMAT)
        Date transactionDateFrom = params.transactionDateFrom ? dateFormat.parse(params.transactionDateFrom) : null
        Date transactionDateTo = params.transactionDateTo ? dateFormat.parse(params.transactionDateTo) : null

        def transactions = Transaction.createCriteria().list(max: max, offset: offset) {
            eq("inventory", location.inventory)
            if (transactionType) {
                eq("transactionType", transactionType)
            }
            if (params.transactionNumber) {
                ilike("transactionNumber", "%" + params.transactionNumber + "%")
            }
            if (transactionDateFrom) {
                ge("transactionDate", transactionDateFrom)
            }
            if (transactionDateTo) {
                le("transactionDate", transactionDateTo)
            }
            order(params.sort ?: "dateCreated", params.order ?: "desc")
        }

        Map<String, Long> entryCounts = transactions ? TransactionEntry.executeQuery(
                "select te.transaction.id, count(te.id) from TransactionEntry te where te.transaction in (:transactions) group by te.transaction.id",
                [transactions: transactions.toList()]).collectEntries { [(it[0]): it[1]] } : [:]

        render([data: transactions.collect { toSummaryJson(it, entryCounts[it.id] ?: 0L) }, totalCount: transactions.totalCount] as JSON)
    }

    def listDaily() {
        SimpleDateFormat dateFormat = new SimpleDateFormat(DATE_FORMAT)
        Date dateSelected = params.date ? DateUtil.clearTime(dateFormat.parse(params.date)) : DateUtil.clearTime(new Date())

        Map<Date, List<Transaction>> transactionsByDate = Transaction.list().groupBy {
            DateUtil.clearTime(it?.transactionDate)
        }

        List dates = transactionsByDate.entrySet().sort { it.key }.reverse().collect {
            [date: dateFormat.format(it.key), count: it.value.size()]
        }

        List<Transaction> transactions = transactionsByDate[dateSelected] ?: []

        render([data: [
                dateSelected: dateFormat.format(dateSelected),
                dates       : dates,
                transactions: transactions.sort { it.dateCreated }.collect { toJson(it) },
        ]] as JSON)
    }

    def read() {
        Transaction transaction = Transaction.get(params.id)
        if (!transaction) {
            response.status = 404
            render([errorMessage: "No transaction found with ID ${params.id}"] as JSON)
            return
        }
        render([data: toDetailedJson(transaction)] as JSON)
    }

    def update() {
        Transaction transaction = Transaction.get(params.id)
        if (!transaction) {
            response.status = 404
            render([errorMessage: "No transaction found with ID ${params.id}"] as JSON)
            return
        }

        JSONObject jsonObject = request.JSON

        if (jsonObject.has("transactionDate") && jsonObject.optString("transactionDate")) {
            transaction.transactionDate = new SimpleDateFormat(DATE_TIME_FORMAT).parse(jsonObject.getString("transactionDate"))
        }
        if (jsonObject.has("transactionType")) {
            transaction.transactionType = TransactionType.get(jsonObject.optJSONObject("transactionType")?.opt("id"))
        }
        if (jsonObject.has("source")) {
            String sourceId = jsonObject.optJSONObject("source")?.opt("id")
            transaction.source = sourceId ? Location.get(sourceId) : null
        }
        if (jsonObject.has("destination")) {
            String destinationId = jsonObject.optJSONObject("destination")?.opt("id")
            transaction.destination = destinationId ? Location.get(destinationId) : null
        }
        if (jsonObject.has("comment")) {
            transaction.comment = jsonObject.optString("comment") ?: null
        }

        jsonObject.optJSONArray("transactionEntries")?.each { entryJson ->
            TransactionEntry entry = transaction.transactionEntries?.find { it.id == entryJson.opt("id") }
            if (!entry) {
                throw new IllegalArgumentException("No transaction entry found with ID ${entryJson.opt("id")}")
            }
            if (entryJson.has("inventoryItem")) {
                InventoryItem inventoryItem = InventoryItem.get(entryJson.optJSONObject("inventoryItem")?.opt("id"))
                if (inventoryItem) {
                    entry.inventoryItem = inventoryItem
                }
            }
            if (entryJson.has("quantity")) {
                entry.quantity = entryJson.isNull("quantity") ? null : entryJson.optInt("quantity")
            }
        }

        transaction.lastUpdated = new Date()
        if (!transaction.validate() || transaction.hasErrors()) {
            throw new ValidationException("Invalid transaction", transaction.errors)
        }
        transaction.save(flush: true)

        render([data: toDetailedJson(transaction)] as JSON)
    }

    def delete() {
        if (!userService.isSuperuser(session?.user)) {
            response.status = 403
            render([errorMessage: "You are not authorized to delete transactions"] as JSON)
            return
        }
        Transaction transaction = Transaction.get(params.id)
        if (!transaction) {
            response.status = 404
            render([errorMessage: "No transaction found with ID ${params.id}"] as JSON)
            return
        }
        try {
            inventoryService.deleteTransaction(transaction)
            render([data: [id: params.id]] as JSON)
        } catch (DataIntegrityViolationException e) {
            response.status = 400
            render([errorMessage: "Transaction ${params.id} could not be deleted"] as JSON)
        }
    }

    def readEntry() {
        TransactionEntry entry = TransactionEntry.get(params.id)
        if (!entry) {
            response.status = 404
            render([errorMessage: "No transaction entry found with ID ${params.id}"] as JSON)
            return
        }
        render([data: toEntryDetailJson(entry)] as JSON)
    }

    def updateEntry() {
        TransactionEntry entry = TransactionEntry.get(params.id)
        if (!entry) {
            response.status = 404
            render([errorMessage: "No transaction entry found with ID ${params.id}"] as JSON)
            return
        }

        JSONObject jsonObject = request.JSON

        if (jsonObject.has("binLocation")) {
            String binLocationId = jsonObject.optJSONObject("binLocation")?.opt("id")
            entry.binLocation = binLocationId ? Location.get(binLocationId) : null
        }
        if (jsonObject.has("inventoryItem")) {
            InventoryItem inventoryItem = InventoryItem.get(jsonObject.optJSONObject("inventoryItem")?.opt("id"))
            if (inventoryItem) {
                entry.inventoryItem = inventoryItem
            }
        }
        if (jsonObject.has("quantity")) {
            entry.quantity = jsonObject.isNull("quantity") ? null : jsonObject.optInt("quantity")
        }
        if (jsonObject.has("comments")) {
            entry.comments = jsonObject.optString("comments") ?: null
        }

        if (!entry.validate() || entry.hasErrors()) {
            throw new ValidationException("Invalid transaction entry", entry.errors)
        }
        entry.save(flush: true)

        render([data: toEntryDetailJson(entry)] as JSON)
    }

    private Map toEntryDetailJson(TransactionEntry entry) {
        Transaction transaction = entry.transaction
        Product product = entry.inventoryItem?.product
        Location transactionLocation = transaction?.inventory?.warehouse ?: Location.get(session?.warehouse?.id)
        List<Location> binLocations = transactionLocation?.hasBinLocationSupport() ?
                Location.findAllByParentLocationAndActive(transactionLocation, true).sort { it?.name?.toLowerCase() } : []
        List<InventoryItem> inventoryItems = product ? InventoryItem.findAllByProduct(product) : []
        [
                id                    : entry.id,
                quantity              : entry.quantity,
                comments              : entry.comments,
                binLocation           : entry.binLocation ? [id: entry.binLocation.id, name: entry.binLocation.name] : null,
                inventoryItem         : entry.inventoryItem ? [
                        id            : entry.inventoryItem.id,
                        lotNumber     : entry.inventoryItem.lotNumber,
                        expirationDate: entry.inventoryItem.expirationDate?.format(DATE_FORMAT),
                ] : null,
                product               : product ? [
                        id           : product.id,
                        productCode  : product.productCode,
                        name         : product.name,
                        unitOfMeasure: product.unitOfMeasure,
                ] : null,
                transaction           : [
                        id               : transaction?.id,
                        transactionNumber: transaction?.transactionNumber,
                        transactionDate  : transaction?.transactionDate?.format(DATE_TIME_FORMAT),
                        transactionType  : [
                                id  : transaction?.transactionType?.id,
                                name: transaction?.transactionType ? LocalizationUtil.getLocalizedString(transaction.transactionType.name) : null,
                        ],
                        source           : transaction?.source ? [id: transaction.source.id, name: transaction.source.name] : null,
                        destination      : transaction?.destination ? [id: transaction.destination.id, name: transaction.destination.name] : null,
                        inventory        : [id: transaction?.inventory?.id, name: transaction?.inventory?.warehouse?.name],
                        comment          : transaction?.comment,
                ],
                availableInventoryItems: inventoryItems.collect {
                    [
                            id            : it.id,
                            lotNumber     : it.lotNumber,
                            expirationDate: it.expirationDate?.format(DATE_FORMAT),
                    ]
                },
                availableBinLocations : binLocations.collect { [id: it.id, name: it.name] },
        ]
    }

    def deleteEntry() {
        Transaction transaction = Transaction.get(params.id)
        TransactionEntry entry = TransactionEntry.get(params.entryId)
        if (!transaction || !entry || entry.transaction?.id != transaction.id) {
            response.status = 404
            render([errorMessage: "No transaction entry found with ID ${params.entryId} for transaction ${params.id}"] as JSON)
            return
        }
        transaction.removeFromTransactionEntries(entry)
        entry.delete(flush: true)
        render([data: toDetailedJson(transaction)] as JSON)
    }

    def transactionTypes() {
        List<TransactionType> transactionTypes = TransactionType.list()
        render([data: transactionTypes.collect {
            [
                    id             : it.id,
                    name           : LocalizationUtil.getLocalizedString(it.name),
                    transactionCode: it.transactionCode?.name(),
            ]
        }] as JSON)
    }

    def locationOptions() {
        List<Location> locations = Location.findAllByParentLocationIsNull()
        render([data: locations.sort { it.name?.toLowerCase() }.collect { [id: it.id, name: it.name] }] as JSON)
    }

    private Map toSummaryJson(Transaction transaction, Long entryCount) {
        [
                id               : transaction.id,
                transactionNumber: transaction.transactionNumber,
                transactionDate  : transaction.transactionDate?.format(DATE_TIME_FORMAT),
                dateCreated      : transaction.dateCreated?.format(DATE_TIME_FORMAT),
                transactionType  : [
                        id  : transaction.transactionType?.id,
                        name: transaction.transactionType ? LocalizationUtil.getLocalizedString(transaction.transactionType.name) : null,
                ],
                inventory        : [id: transaction.inventory?.id, name: transaction.inventory?.warehouse?.name],
                source           : transaction.source ? [id: transaction.source.id, name: transaction.source.name] : null,
                destination      : transaction.destination ? [id: transaction.destination.id, name: transaction.destination.name] : null,
                createdBy        : transaction.createdBy ? [id: transaction.createdBy.id, name: transaction.createdBy.name] : null,
                entryCount       : entryCount,
        ]
    }

    private Map toJson(Transaction transaction) {
        [
                id               : transaction.id,
                transactionNumber: transaction.transactionNumber,
                transactionDate  : transaction.transactionDate?.format(DATE_TIME_FORMAT),
                dateCreated      : transaction.dateCreated?.format(DATE_TIME_FORMAT),
                transactionType  : [
                        id  : transaction.transactionType?.id,
                        name: transaction.transactionType ? LocalizationUtil.getLocalizedString(transaction.transactionType.name) : null,
                ],
                source           : transaction.source ? [id: transaction.source.id, name: transaction.source.name] : null,
                destination      : transaction.destination ? [id: transaction.destination.id, name: transaction.destination.name] : null,
                comment          : transaction.comment,
                transactionEntries: transaction.transactionEntries?.collect { TransactionEntry entry ->
                    [
                            id           : entry.id,
                            quantity     : entry.quantity,
                            binLocation  : entry.binLocation ? [id: entry.binLocation.id, name: entry.binLocation.name] : null,
                            inventoryItem: [
                                    id            : entry.inventoryItem?.id,
                                    lotNumber     : entry.inventoryItem?.lotNumber,
                                    expirationDate: entry.inventoryItem?.expirationDate?.format(DATE_FORMAT),
                            ],
                            product      : [
                                    id         : entry.inventoryItem?.product?.id,
                                    productCode: entry.inventoryItem?.product?.productCode,
                                    name       : entry.inventoryItem?.product?.name,
                            ],
                    ]
                } ?: [],
        ]
    }

    private Map toDetailedJson(Transaction transaction) {
        List products = transaction.transactionEntries?.collect { it.inventoryItem?.product }?.findAll { it }?.unique { it.id } ?: []
        List<InventoryItem> inventoryItems = products ? InventoryItem.findAllByProductInList(products) : []
        Map json = toJson(transaction)
        json.confirmed = transaction.confirmed
        json.inventory = [id: transaction.inventory?.id, name: transaction.inventory?.warehouse?.name]
        json.createdBy = transaction.createdBy ? [id: transaction.createdBy.id, name: transaction.createdBy.name] : null
        json.updatedBy = transaction.updatedBy ? [id: transaction.updatedBy.id, name: transaction.updatedBy.name] : null
        json.lastUpdated = transaction.lastUpdated?.format(DATE_TIME_FORMAT)
        json.outgoingShipment = transaction.outgoingShipment ?
                [id: transaction.outgoingShipment.id, shipmentNumber: transaction.outgoingShipment.shipmentNumber] : null
        json.incomingShipment = transaction.incomingShipment ?
                [id: transaction.incomingShipment.id, shipmentNumber: transaction.incomingShipment.shipmentNumber] : null
        json.receipt = transaction.receipt ?
                [id: transaction.receipt.id, receiptNumber: transaction.receipt.receiptNumber] : null
        json.order = transaction.order ?
                [id: transaction.order.id, name: transaction.order.name] : null
        LocalTransfer localTransfer = transaction.localTransfer
        json.localTransfer = localTransfer ? [
                id                    : localTransfer.id,
                sourceTransaction     : localTransfer.sourceTransaction ? [
                        id               : localTransfer.sourceTransaction.id,
                        transactionNumber: localTransfer.sourceTransaction.transactionNumber,
                ] : null,
                destinationTransaction: localTransfer.destinationTransaction ? [
                        id               : localTransfer.destinationTransaction.id,
                        transactionNumber: localTransfer.destinationTransaction.transactionNumber,
                ] : null,
        ] : null
        json.inventoryItemsByProduct = inventoryItems.groupBy { it.product.id }.collectEntries { productId, items ->
            [(productId): items.collect {
                [
                        id            : it.id,
                        lotNumber     : it.lotNumber,
                        expirationDate: it.expirationDate?.format(DATE_FORMAT),
                ]
            }]
        }
        return json
    }


    // Activity a location must support per transaction type, mirroring the
    // guards on InventoryController.createAdjustment/createConsumed/
    // createInboundTransfer/createOutboundTransfer.
    private static final Map<String, ActivityCode> REQUIRED_ACTIVITY_BY_TRANSACTION_TYPE = [
            (Constants.ADJUSTMENT_CREDIT_TRANSACTION_TYPE_ID): ActivityCode.ADJUST_INVENTORY,
            (Constants.ADJUSTMENT_DEBIT_TRANSACTION_TYPE_ID) : ActivityCode.ADJUST_INVENTORY,
            (Constants.CONSUMPTION_TRANSACTION_TYPE_ID)      : ActivityCode.CONSUME_STOCK,
            (Constants.TRANSFER_IN_TRANSACTION_TYPE_ID)      : ActivityCode.RECEIVE_STOCK,
            (Constants.TRANSFER_OUT_TRANSACTION_TYPE_ID)     : ActivityCode.SEND_STOCK,
    ].asImmutable()

    def adjustInventoryService
    def transactionIdentifierService

    def create() {
        Location location = Location.get(params.locationId ?: session?.warehouse?.id)
        if (!location) {
            throw new IllegalArgumentException("Cannot create transactions without a location - sign in or provide locationId as a request parameter")
        }

        def json = request.JSON
        TransactionType transactionType = TransactionType.get(json.transactionTypeId as String)
        if (!transactionType) {
            throw new IllegalArgumentException("Invalid or missing transactionTypeId")
        }

        ActivityCode requiredActivity = REQUIRED_ACTIVITY_BY_TRANSACTION_TYPE[transactionType.id]
        if (requiredActivity && !location.supports(requiredActivity)) {
            throw new UnsupportedOperationException("Location ${location.name} does not support ${transactionType.name} transactions")
        }

        Transaction transaction = new Transaction()
        transaction.transactionType = transactionType
        transaction.inventory = location.inventory
        transaction.transactionDate = json.transactionDate ?
                new SimpleDateFormat("MM/dd/yyyy HH:mm").parse(json.transactionDate as String) : new Date()
        transaction.comment = json.comment ?: null
        transaction.createdBy = User.load(session.user.id)

        boolean isAdjustment = transactionType.id in [
                Constants.ADJUSTMENT_CREDIT_TRANSACTION_TYPE_ID,
                Constants.ADJUSTMENT_DEBIT_TRANSACTION_TYPE_ID,
        ]

        if (transactionType.id == Constants.TRANSFER_OUT_TRANSACTION_TYPE_ID && json.destinationId) {
            transaction.destination = Location.get(json.destinationId as String)
        }
        if (transactionType.id == Constants.TRANSFER_IN_TRANSACTION_TYPE_ID && json.sourceId) {
            transaction.source = Location.get(json.sourceId as String)
        }

        def entries = json.entries ?: []
        if (!entries) {
            throw new IllegalArgumentException("Transaction entries must not be empty")
        }

        if (transactionType.transactionCode == TransactionCode.DEBIT && !isAdjustment) {
            transaction.transactionNumber = transactionIdentifierService.generate(transaction)
        }

        List<Product> products = []
        entries.each { entry ->
            InventoryItem inventoryItem = resolveInventoryItem(entry)
            if (!inventoryItem) {
                throw new IllegalArgumentException("Unable to resolve inventory item for entry ${entry}")
            }

            Integer quantity = entry.quantity as Integer
            if (quantity == null || quantity == 0) {
                return
            }

            if (transactionType.transactionCode == TransactionCode.DEBIT && !isAdjustment) {
                Integer onHandQuantity = inventoryService.getQuantity(location.inventory, inventoryItem)
                if (quantity > onHandQuantity) {
                    throw new IllegalArgumentException("Quantity for lot number ${inventoryItem.lotNumber ?: 'default'} cannot be greater than on-hand quantity")
                }
            }
            if ((transactionType.transactionCode == TransactionCode.CREDIT || isAdjustment) && quantity < 0) {
                throw new IllegalArgumentException("Quantity for lot number ${inventoryItem.lotNumber ?: 'default'} must not be negative")
            }

            TransactionEntry transactionEntry = new TransactionEntry()
            transactionEntry.inventoryItem = inventoryItem
            transactionEntry.product = inventoryItem.product
            transactionEntry.quantity = quantity
            transactionEntry.binLocation = entry.binLocationId ? Location.get(entry.binLocationId as String) : null
            transactionEntry.comments = entry.comment ?: null
            transactionEntry.reasonCode = entry.reasonCode ?: null
            transaction.addToTransactionEntries(transactionEntry)
            products << inventoryItem.product
        }

        if (!transaction.transactionEntries) {
            throw new IllegalArgumentException("Transaction entries must not be empty")
        }

        if (isAdjustment) {
            TransactionSource transactionSource =
                    adjustInventoryService.createAdjustInventoryTransactionSource(location)
            transaction.transactionSource = transactionSource
        }

        if (!transaction.validate() || !transaction.save(flush: true)) {
            throw new ValidationException("Invalid transaction", transaction.errors)
        }

        render([data: [
                id               : transaction.id,
                transactionNumber: transaction.transactionNumber,
                transactionType  : [id: transactionType.id, name: transactionType.name],
                productIds       : products*.id.unique(),
        ]] as JSON)
    }

    private InventoryItem resolveInventoryItem(def entry) {
        if (entry.inventoryItemId) {
            return InventoryItem.get(entry.inventoryItemId as String)
        }
        if (entry.productId) {
            Product product = Product.get(entry.productId as String)
            if (!product) {
                return null
            }
            String lotNumber = entry.lotNumber ?: null
            Date expirationDate = entry.expirationDate ?
                    new SimpleDateFormat("MM/dd/yyyy").parse(entry.expirationDate as String) : null
            return inventoryService.findOrCreateInventoryItem(product, lotNumber, expirationDate)
        }
        return null
    }
}
