/**
 * Copyright (c) 2012 Partners In Health.  All rights reserved.
 * The use and distribution terms for this software are covered by the
 * Eclipse Public License 1.0 (http://opensource.org/licenses/eclipse-1.0.php)
 * which can be found in the file epl-v10.html at the root of this distribution.
 * By using this software in any fashion, you are agreeing to be bound by
 * the terms of this license.
 * You must not remove this notice, or any other, from this software.
 **/
package org.pih.warehouse.report

import grails.gorm.transactions.Transactional
import org.apache.commons.lang.StringEscapeUtils
import org.hibernate.criterion.CriteriaSpecification
import org.pih.warehouse.core.Constants
import org.pih.warehouse.inventory.Transaction
import org.pih.warehouse.inventory.TransactionCode
import org.pih.warehouse.inventory.TransactionEntry
import org.pih.warehouse.inventory.TransactionType
import org.pih.warehouse.order.OrderTypeCode
import org.pih.warehouse.reporting.ConsumptionFact
import org.pih.warehouse.reporting.ShowConsumptionCommand
import org.pih.warehouse.reporting.ShowConsumptionRowCommand
import org.pih.warehouse.core.Location
import org.pih.warehouse.product.Category
import org.pih.warehouse.product.Product

import java.text.NumberFormat
import java.text.SimpleDateFormat

@Transactional
class ConsumptionService {

    def dataService
    def sessionFactory
    def inventoryService
    def productAvailabilityService

    /**
     * Builds the consumption report rows for the given command (extracted from
     * ConsumptionController.show so the API controller can share the computation).
     */
    void buildShowConsumption(ShowConsumptionCommand command, boolean userHasFinanceRole) {

        String[] defaultTransactionTypeIds = [
                Constants.TRANSFER_OUT_TRANSACTION_TYPE_ID,
                Constants.CONSUMPTION_TRANSACTION_TYPE_ID
        ]

        command.defaultTransactionTypes = defaultTransactionTypeIds.collect { TransactionType.get(it) }
        command.selectedTransactionTypes = command.defaultTransactionTypes
        command.transactionTypes = command.defaultTransactionTypes

        def tags = command.selectedTags.collect { it.tag }.asList()
        def products = tags ? inventoryService.getProductsByTags(tags) : null

        // Add an entire day to account for the 24 hour period on the end date
        Date toDate = command.toDate ? command.toDate + 1 : null

        // Set to midnight
        if (toDate) {
            toDate.clearTime()
        }

        // Get all transactions
        command.debits = inventoryService.getDebitsBetweenDates(command.fromLocations,
                command.selectedLocations, command.fromDate, toDate,
                command.selectedTransactionTypes)
        // Get credits for INBOUND RETURNS, selectedLocations = sources, fromLocation = destination inventory
        command.credits = inventoryService.getCreditsBetweenDates(command.selectedLocations, command.fromLocations, command.fromDate, toDate)

        def transactions = []
        transactions.addAll(command.debits)
        transactions.addAll(command.credits?.findAll { it.incomingShipment?.isFromReturnOrder })

        // Sort transaction by date ascending
        transactions = transactions.sort { it.transactionDate }

        // Used within the transaction block to see if we need to add all destinations to command.toLocations
        // which occurs if there are no toLocations selected
        boolean toLocationsEmpty = command.toLocations.empty
        boolean fromLocationsEmpty = command.fromLocations.empty

        // Some transactions don't have a destination (e.g. expired, consumed, etc)
        if (toLocationsEmpty) {
            def debitLocations = transactions.findAll { it.destination != null }.collect {
                it.destination
            }
            def creditLocations = transactions.findAll { it.source != null && it.incomingShipment?.isFromReturnOrder }.collect {
                it.source
            }
            command.toLocations.addAll(debitLocations)
            command.toLocations.addAll(creditLocations)
        }

        // Keep track of all the transaction types (we may want to select a subset of these)
        // FIXME Hard-code transaction types (OBPIH-2059)
        command.transactionTypes = transactions*.transactionType.unique()

        // Iterate over all transactions
        transactions.each { Transaction transaction ->

            // Iterate over all transaction entries
            transaction.transactionEntries.each { TransactionEntry transactionEntry ->
                def product = transactionEntry.inventoryItem.product
                def currentRow = command.rows[product]
                if (!currentRow) {
                    command.rows[product] = new ShowConsumptionRowCommand()
                    command.rows[product].command = command
                    command.rows[product].product = product
                    command.rows[product].pricePerUnit = userHasFinanceRole ? product?.pricePerUnit : 0
                }

                // Keep track of quantity out based on transaction type
                if (transaction.transactionType.id == Constants.TRANSFER_OUT_TRANSACTION_TYPE_ID) {
                    command.rows[product].transferOutQuantity += transactionEntry.quantity
                    command.rows[product].transferOutTransactions << transaction

                    // Initialize transfer out by location map
                    if (transaction.destination && transaction.destination != transaction.source) {
                        def transferOutQuantity = command.rows[product].transferOutMap[transaction.destination]

                        if (!transferOutQuantity) {
                            command.rows[product].transferOutMap[transaction.destination] = 0
                        }

                        command.rows[product].transferOutMap[transaction.destination] += transactionEntry.quantity
                    }

                    def isFromPutawayOrder = transaction?.outgoingShipment?.isFromPutawayOrder
                    def isFromTransferOrder = transaction?.outgoingShipment?.isFromTransferOrder
                    def isInternalTransfer = isFromPutawayOrder || isFromTransferOrder
                    def isFromReturnOrder = transaction?.outgoingShipment?.isFromReturnOrder

                    if (isFromReturnOrder || !isInternalTransfer) {
                        command.rows[product].issuedQuantity += transactionEntry.quantity
                    }
                } else if (transaction.transactionType.id == Constants.EXPIRATION_TRANSACTION_TYPE_ID) {
                    command.rows[product].expiredQuantity += transactionEntry.quantity
                    command.rows[product].expiredTransactions << transaction
                } else if (transaction.transactionType.id == Constants.DAMAGE_TRANSACTION_TYPE_ID) {
                    command.rows[product].damagedQuantity += transactionEntry.quantity
                    command.rows[product].damagedTransactions << transaction
                } else if (transaction.transactionType.id == Constants.TRANSFER_IN_TRANSACTION_TYPE_ID) {
                    command.rows[product].transferInQuantity += transactionEntry.quantity
                    command.rows[product].transferInTransactions << transaction

                    // Initialize transfer out by location map
                    def transferInQuantity = command.rows[product].transferInMap[transaction.source]
                    if (!transferInQuantity) {
                        command.rows[product].transferInMap[transaction.source] = 0
                    }

                    if (transaction?.incomingShipment?.isFromReturnOrder) {
                        command.rows[product].returnedQuantity += transactionEntry.quantity
                    }

                    // Add to the total transfer out per location
                    command.rows[product].transferInMap[transaction.source] += transactionEntry.quantity

                } else if (transaction.transactionType.id == Constants.CONSUMPTION_TRANSACTION_TYPE_ID) {
                    command.rows[product].consumedQuantity += transactionEntry.quantity
                }

                command.rows[product].totalConsumptionQuantity = command.rows[product].issuedQuantity + command.rows[product].consumedQuantity - command.rows[product].returnedQuantity

                String dateKey = transaction.transactionDate.format("yyyy-MM")
                command.selectedDates.add(dateKey)

                // Capture month breakdown for all debits and credits
                if (transaction.transactionType.transactionCode == TransactionCode.DEBIT) {
                    // Add to total transfer out by month (initialize transfer out by month map)
                    def transferOutMonthlyQuantity = command.rows[product].transferOutMonthlyMap[dateKey]
                    if (!transferOutMonthlyQuantity) {
                        command.rows[product].transferOutMonthlyMap[dateKey] = 0
                    }

                    if (transaction.transactionType.id == Constants.TRANSFER_OUT_TRANSACTION_TYPE_ID) {
                        if (transaction?.order?.orderType?.code != Constants.PUTAWAY_ORDER && transaction?.order?.orderType?.code != OrderTypeCode.TRANSFER_ORDER.name()) {
                            command.rows[product].transferOutMonthlyMap[dateKey] += transactionEntry.quantity
                        }
                    } else if (transaction.transactionType.id == Constants.CONSUMPTION_TRANSACTION_TYPE_ID) {
                        command.rows[product].transferOutMonthlyMap[dateKey] += transactionEntry.quantity
                    }

                } else if (transaction.transactionType.transactionCode == TransactionCode.CREDIT) {
                    // Add to total transfer in by month (initialize transfer out by month map)
                    def transferInMonthlyQuantity = command.rows[product].transferInMonthlyMap[dateKey]
                    if (!transferInMonthlyQuantity) {
                        command.rows[product].transferInMonthlyMap[dateKey] = 0
                    }

                    if (transaction.transactionType.id == Constants.TRANSFER_IN_TRANSACTION_TYPE_ID
                            && transaction?.order?.orderType?.code == Constants.RETURN_ORDER) {
                        command.rows[product].transferInMonthlyMap[dateKey] -= transactionEntry.quantity

                    }
                }

                // All transactions
                command.rows[product].transactions << transaction
            }
        }

        // Calculate the on hand quantity for all products returned by the getTransactions() call above
        if (command.fromLocations) {
            products = command.rows.keySet().asList()

            // Filter products by selected products
            if (command.selectedProducts) {
                List<String> selectedIds = command.selectedProducts*.id
                command.rows.keySet().removeAll { row -> !(row.id in selectedIds) }
            }

            // Filter products by tags
            if (command.selectedTags) {
                def productsToRemove = products.findAll { product ->
                    !command.selectedTags.intersect(product.tags)
                }

                def iterator = command.rows.keySet().iterator()
                while (iterator.hasNext()) {
                    if (productsToRemove.contains(iterator.next())) {
                        iterator.remove()
                    }
                }
            }

            // Filter products by categories
            if (command.selectedCategories) {
                def productsToRemove = products.findAll { product ->
                    !command.selectedCategories.contains(product.category)
                }

                def iterator = command.rows.keySet().iterator()
                while (iterator.hasNext()) {
                    if (productsToRemove.contains(iterator.next())) {
                        iterator.remove()
                    }
                }
            }
            products = command.rows.keySet().asList()

            // Calculate quantity on hand for filtered products
            if (!fromLocationsEmpty && command.includeQuantityOnHand) {
                command.fromLocations.each { location ->
                    if (location.inventory) {
                        def onHandQuantityMap = productAvailabilityService.getCurrentInventory(location)

                        // For each product, add to the onhand quantity map
                        products.each { product ->
                            def onHandQuantity = onHandQuantityMap[product]
                            if (onHandQuantity) {
                                command.rows[product].onHandQuantity += onHandQuantity
                            }
                        }
                    }
                }
            }
        }

        // We want to sort the transaction types and toLocations
        command?.transactionTypes?.unique()?.sort()
        command?.toLocations?.unique()?.sort()

        // If there are no selected locations, we select all of the possible destinations
        if (!command?.selectedLocations) {
            command.selectedLocations = command.toLocations
        }

        if (!command?.selectedTransactionTypes) {
            command.selectedTransactionTypes = command.transactionTypes
        }
    }

    Integer deleteConsumptionRecords() {
        return ConsumptionFact.executeUpdate("""delete ConsumptionFact c""")
    }

    def aggregateConsumption(Location location, Category category, Date startDate, Date endDate) {
        def results = ConsumptionFact.createCriteria().list {
            resultTransformer(CriteriaSpecification.ALIAS_TO_ENTITY_MAP)
            projections {
                groupProperty('product', "product")
                groupProperty('productCode', "Product Code")
                groupProperty('productName', "Product Name")
                groupProperty("categoryName", "Category Name")
                groupProperty("day", "Day")
                groupProperty("week", "Week")
                groupProperty("month", "Month")
                groupProperty("year", "Year")
                sum("quantity", "Quantity")
            }

            if (startDate && endDate) {
                between('transactionDate', startDate, endDate)
            }
            if (category) {
                eq("categoryName", category.name)
            }
            eq("location", location)
            order("productName", "asc")
        }
        return results

    }


    def listConsumption(Location location, Category category, Date startDate, Date endDate) {

        def results = ConsumptionFact.createCriteria().list {
            // TODO Use resultTransformer(CriteriaSpecification.ALIAS_TO_ENTITY_MAP)

            if (startDate && endDate) {
                transactionDateKey {
                    between('date', startDate, endDate)
                }
            }
            locationKey {
                eq("locationId", location.id)
            }
            productKey {
                if (category) {
                    eq("categoryName", category.name)
                }
                order("productName", "asc")
            }
        }

        return results
    }

    def generateCrossTab(List<ConsumptionFact> consumptionFactList, Date startDate, Date endDate, String groupBy) {

        def calendar = Calendar.instance
        def dateFormat = new SimpleDateFormat("ddMMyyyy")

        def dateKeys = (startDate..endDate).collect { date ->
            calendar.setTime(date)
            [
                    date : date,
                    day  : calendar.get(Calendar.DAY_OF_MONTH),
                    week : calendar.get(Calendar.WEEK_OF_YEAR),
                    month: calendar.get(Calendar.MONTH),
                    year : calendar.get(Calendar.YEAR),
                    key  : dateFormat.format(date)
            ]
        }.sort { it.date }


        def daysBetween = (groupBy != "default") ? -1 : endDate - startDate
        if (daysBetween > 365 || groupBy.equals("yearly")) {
            dateFormat = Constants.yearFormat
        } else if ((daysBetween > 61 && daysBetween < 365) || groupBy.equals("monthly")) {
            dateFormat = Constants.yearMonthFormat
        } else if (daysBetween > 14 && daysBetween < 60 || groupBy.equals("weekly")) {
            dateFormat = Constants.weekFormat
        } else if (daysBetween > 0 && daysBetween <= 14 || groupBy.equals("daily")) {
            dateFormat = Constants.dayFormat
        } else {
            dateFormat = Constants.yearMonthFormat
        }
        dateKeys = dateKeys.collect { dateFormat.format(it.date) }.unique()

        log.info("consumptionFactList: " + consumptionFactList)

        def consumptionFactMap = consumptionFactList.inject([:]) { result, consumptionFact ->
            def productId = consumptionFact?.productKey?.productId
            def transactionDate = consumptionFact?.transactionDateKey?.date
            def quantityIssued = consumptionFact?.quantity
            def dateKey = dateFormat.format(transactionDate)
            def quantityMap = result[productId]
            if (!quantityMap) {
                quantityMap = [:]
            }
            def quantity = quantityMap[dateKey] ?: 0
            quantity += quantityIssued
            quantityMap[dateKey] = quantity
            result[productId] = quantityMap
            result
        }
        log.info "Consumption map: " + consumptionFactMap

        def crosstabRows = []
        def products = consumptionFactList.collect {
            Product.get(it?.productKey?.productId)
        }.unique()
        products.each { Product product ->
            BigDecimal totalIssued = 0
            BigDecimal totalDemand = 0
            BigDecimal totalCanceled = 0
            BigDecimal unitCost = product?.costPerUnit ?: product?.pricePerUnit ?: 0
            Map row = [
                    "Code"     : product?.productCode,
                    "Name"     : product?.name,
                    "Tags"     : StringEscapeUtils.escapeCsv(product.tagsToString()),
                    "Catalogs" : StringEscapeUtils.escapeCsv(product.productCatalogsToString()),
                    "Unit Cost": NumberFormat.getNumberInstance().format(unitCost)
            ]

            def consumptionAggregated = consumptionFactMap[product?.id]
            dateKeys.each { dateKey ->
                def quantityIssued = consumptionAggregated[dateKey] ?: 0
                totalIssued += quantityIssued
                row += ["${dateKey}": quantityIssued]
            }
            BigDecimal averageIssued = totalIssued / dateKeys.size()

            row += [
                    "Total Demand"  : totalDemand,
                    "Total Canceled": totalCanceled,
                    "Total Issued"  : totalIssued,
                    "Total Cost"    : NumberFormat.getNumberInstance().format(totalIssued * unitCost),
                    "Average Issued": averageIssued,
                    "Average Cost"  : NumberFormat.getNumberInstance().format(averageIssued * unitCost)
            ]
            crosstabRows << row
        }
        log.info "crosstabRows: " + crosstabRows
        return crosstabRows
    }
}
