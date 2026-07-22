package org.pih.warehouse.api

import grails.converters.JSON
import grails.gorm.transactions.Transactional
import grails.validation.ValidationException
import org.grails.web.json.JSONObject
import org.pih.warehouse.DateUtil
import org.pih.warehouse.LocalizationUtil
import org.pih.warehouse.core.Location
import org.pih.warehouse.inventory.InventoryItem
import org.pih.warehouse.inventory.Transaction
import org.pih.warehouse.inventory.TransactionEntry
import org.pih.warehouse.inventory.TransactionType

import java.text.SimpleDateFormat

@Transactional
class TransactionApiController {

    private static final String DATE_FORMAT = "yyyy-MM-dd"
    private static final String DATE_TIME_FORMAT = "yyyy-MM-dd HH:mm:ss"

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
}
