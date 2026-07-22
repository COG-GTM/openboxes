/**
 * Copyright (c) 2012 Partners In Health.  All rights reserved.
 * The use and distribution terms for this software are covered by the
 * Eclipse Public License 1.0 (http://opensource.org/licenses/eclipse-1.0.php)
 * which can be found in the file epl-v10.html at the root of this distribution.
 * By using this software in any fashion, you are agreeing to be bound by
 * the terms of this license.
 * You must not remove this notice, or any other, from this software.
 * */
package org.pih.warehouse.reporting

import grails.converters.JSON
import grails.gorm.transactions.Transactional
import grails.validation.Validateable
import groovy.time.TimeCategory
import org.apache.commons.codec.digest.DigestUtils
import org.apache.commons.collections.FactoryUtils
import org.apache.commons.collections.list.LazyList
import org.pih.warehouse.core.Constants
import org.pih.warehouse.core.Location
import org.pih.warehouse.core.Tag
import org.pih.warehouse.core.UserService
import org.pih.warehouse.inventory.InventoryLevel
import org.pih.warehouse.inventory.InventoryService
import org.pih.warehouse.inventory.Transaction
import org.pih.warehouse.inventory.TransactionCode
import org.pih.warehouse.inventory.TransactionEntry
import org.pih.warehouse.inventory.TransactionType
import org.pih.warehouse.order.OrderTypeCode
import org.pih.warehouse.product.Category
import org.pih.warehouse.product.Product
import org.pih.warehouse.product.ProductService
import org.pih.warehouse.report.ConsumptionService
import org.pih.warehouse.report.ReportService
import org.pih.warehouse.requisition.Requisition

@Transactional
class ConsumptionController {

    def dataService
    ReportService reportService
    ProductService productService
    InventoryService inventoryService
    ConsumptionService consumptionService
    UserService userService
    def productAvailabilityService

    def show(ShowConsumptionCommand command) {

        if (command.hasErrors()) {
            render(view: "show", model: [command: command])
            return
        }

        // If any parameters have changed we need to reset filters
        if (command.parametersHash && command.hasParameterChanged()) {
            command.selectedProperties = []
            command.selectedTags = []
            command.selectedLocations = []
            command.selectedCategories = []

            if (params.format == "csv") {
                params.remove("format")
                flash.message = "Unable to download CSV as parameters have changed. Please try download again."
            }
        }

        // Hack to fix PIMS-2728
        if (command.selectedProperties) {
            if (command.selectedProperties instanceof java.lang.String) {
                command.selectedProperties = [command.selectedProperties]
            }
        }

        boolean fromLocationsEmpty = command.fromLocations.empty

        // Export as CSV (the React screen fetches its data through
        // /api/consumption/summary, so only compute the report here)
        if (params.format == "csv") {
            def userHasFinanceRole = userService.hasRoleFinance(session?.user)
            consumptionService.buildShowConsumption(command, userHasFinanceRole)

            def csvrows = []
            command.rows.each { key, ShowConsumptionRowCommand row ->
                def valueConsumed = (row?.totalConsumptionQuantity ?: 0) * (row.pricePerUnit ?: 0)

                def csvrow = [
                        'Product code'                                : row.product.productCode ?: '',
                        'Product'                                     : row.product.displayNameWithLocaleCode,
                        'Product family'                              : row.product?.productFamily?.name ?: '',
                        'Category'                                    : row.product?.category?.name,
                        'Formulary'                                   : row.product?.productCatalogsToString(),
                        'Tag'                                         : row.product?.tagsToString(),
                        'Unit Price'                                  : g.formatNumber(number: row.pricePerUnit, format: '###.#', maxFractionDigits: 4) ?: '',
                        'UoM'                                         : row.product.unitOfMeasure ?: '',
                        'Qty Issued'                                  : g.formatNumber(number: row.issuedQuantity, format: '###.#', maxFractionDigits: 1) ?: '',
                        'Qty Consumed'                                : g.formatNumber(number: row.consumedQuantity, format: '###.#', maxFractionDigits: 1) ?: '',
                        'Qty Returned'                                : g.formatNumber(number: row.returnedQuantity, format: '###.#', maxFractionDigits: 1) ?: '',
                        'Total Consumption (Issued+Consumed-Returned)': g.formatNumber(number: row.totalConsumptionQuantity, format: '###.#', maxFractionDigits: 1) ?: '',
                        'Value Consumed'                              : g.formatNumber(number: valueConsumed, format: '###.#', maxFractionDigits: 2),
                        'Average Monthly Consumption'                 : g.formatNumber(number: row.monthlyQuantity, format: '###.#', maxFractionDigits: 4) ?: '',
                        'Quantity on hand'                            : g.formatNumber(number: row.onHandQuantity, format: '###.#', maxFractionDigits: 1) ?: '',
                        'Months remaining'                            : g.formatNumber(number: row.numberOfMonthsRemaining, format: '###.#', maxFractionDigits: 0) ?: '',
                ]

                if (command.selectedProperties) {
                    command.selectedProperties.each { property ->
                        csvrow[property] = row.product."${property}"
                    }
                }

                if (command.includeMonthlyBreakdown) {
                    command.selectedDates.each { date ->
                        csvrow[date.toString()] = row.transferOutMonthlyMap[date] ?: ""
                    }
                }

                if (command.includeLocationBreakdown) {
                    command.selectedLocations.each { location ->
                        csvrow[location?.name] = row.transferOutMap[location] ?: ""
                    }
                }

                csvrows << csvrow

            }

            csvrows.sort { it["Product code"] }

            def csv = dataService.generateCsv(csvrows)
            response.setHeader("Content-disposition", "attachment; filename=\"Consumption-" +
                    "${!fromLocationsEmpty && command.fromLocations.size() > 1 ? command.fromLocations : command.fromLocations.first()}" +
                    "-${new Date().format("dd MMM yyyy hhmmss")}.csv\"")
            render(contentType: "text/csv", text: csv.toString(), encoding: "UTF-8")
            return
        } else {
            render(view: "/common/react", params: params)
        }
    }


    def index() {
        redirect(action: "list")
    }


    def delete() {
        long startTime = System.currentTimeMillis()
        Integer deletedRecords = consumptionService.deleteConsumptionRecords()
        flash.message = "Deleted ${deletedRecords} consumption records in ${System.currentTimeMillis() - startTime}"
        log.info "Deleted ${deletedRecords} consumption records in ${System.currentTimeMillis() - startTime}"
        redirect(controller: "consumption", action: "list")
    }

    def refresh(ConsumptionCommand command) {
        reportService.buildConsumptionFact()
        redirect(controller: "consumption", action: "list")
    }


    def pivot(ConsumptionCommand command) {
        render(view: "/common/react", params: params)
    }

    def list(ConsumptionCommand command) {

        log.info "Params: " + params

        Location location = Location.get(session?.warehouse?.id)

        use(TimeCategory) {
            command.endDate = command?.endDate ?: new Date()
            command.startDate = command?.startDate ?: new Date() - 6.months
        }

        if (command.download) {
            def data = consumptionService.listConsumption(command.location, command.category, command.startDate, command.endDate)
            def crosstab = consumptionService.generateCrossTab(data, command.startDate, command.endDate, null)
            log.info "crosstab " + crosstab
            String csv = dataService.generateCsv(crosstab)
            response.setHeader("Content-disposition", "attachment; filename=Consumption-${location.name}-${new Date().format("dd-MMM-yyyy-hhmmss")}.csv")
            render(contentType: "text/csv", text: csv.toString(), encoding: "UTF-8")
            return
        }

        render(view: "/common/react", params: params)
    }

    def aggregate(ConsumptionCommand command) {

        String locationId = command?.location?.id ?: session?.warehouse?.id
        Location location = Location.get(locationId)

        use(TimeCategory) {
            command.endDate = command?.endDate ?: new Date()
            command.startDate = command?.startDate ?: new Date() - 6.months
        }


        List<ConsumptionFact> results = consumptionService.listConsumption(location, command?.category, command.startDate, command.endDate)

        results = results.collect {
            [
                    id          : it.id,
                    productCode : it?.productKey?.productCode,
                    productName : it.productKey?.productName,
                    categoryName: it?.productKey?.categoryName,
                    year        : it?.transactionDateKey?.year,
                    month       : it?.transactionDateKey?.month,
                    day         : it?.transactionDateKey?.dayOfMonth,
                    quantity    : it?.quantity,
                    unitCost    : it?.unitCost,
                    unitPrice   : it?.unitPrice
            ]
        }
        render results as JSON
    }

    def product() {
        Product product = Product.get(params.id)
        render(template: "product", model: [product: product])
    }

}


class ShowConsumptionCommand implements Validateable {

    // Map of product to ShowConsumptionRowCommand
    def rows = new TreeMap()

    // Parameters
    Date fromDate
    Date toDate
    List<Location> fromLocations = LazyList.decorate(new ArrayList(), FactoryUtils.instantiateFactory(Location.class))

    // State
    String parametersHash

    // Filters
    List<Tag> tags = []
    List<Category> categories = []
    List<Product> products = []
    List<Location> toLocations = LazyList.decorate(new ArrayList(), FactoryUtils.instantiateFactory(Location.class))
    List<TransactionType> transactionTypes = []
    List<TransactionType> selectedTransactionTypes = []
    List<TransactionType> defaultTransactionTypes = []
    List<String> selectedDates = LazyList.decorate(new ArrayList(), FactoryUtils.instantiateFactory(String.class))
    List<Location> selectedLocations = LazyList.decorate(new ArrayList(), FactoryUtils.instantiateFactory(Location.class))
    List<Category> selectedCategories = LazyList.decorate(new ArrayList(), FactoryUtils.instantiateFactory(Category.class))
    List<Product> selectedProducts = LazyList.decorate(new ArrayList(), FactoryUtils.instantiateFactory(Product.class))
    List<Tag> selectedTags = LazyList.decorate(new ArrayList(), FactoryUtils.instantiateFactory(Tag.class))

    Boolean includeLocationBreakdown = Boolean.TRUE
    Boolean includeMonthlyBreakdown = Boolean.TRUE
    Boolean includeQuantityOnHand = Boolean.TRUE

    List<String> selectedProperties = LazyList.decorate(new ArrayList(), FactoryUtils.instantiateFactory(String.class))

    // Payload
    Set<Transaction> debits = []
    Set<Transaction> credits = []
    Set<Requisition> requisitions = []
    Set<TransactionEntry> transactionEntries = []
    def productMap = new TreeMap()
    def onHandQuantityMap = new TreeMap()
    def transferOutMap = [:]

    static transients = ["numberOfDays", "numberOfWeeks", "numberOfMonths"]

    static constraints = {
        fromLocations(nullable: false)
        toLocations(nullable: true)
        fromDate(nullable: true)
        toDate(nullable: true)
        parametersHash(nullable: true)
    }

    Boolean hasParameterChanged() {
        String newParametersHash = generateParametersHash()
        return !parametersHash.equals(newParametersHash)
    }

    String generateParametersHash() {
        if (!fromDate && !toDate && !fromLocations) {
            return null
        }
        String parameters = "${fromDate}:${toDate}:${fromLocations}"
        return DigestUtils.md5Hex(parameters.bytes)
    }

    Integer getNumberOfDays() {
        if (toDate && fromDate) {
            return (toDate - fromDate)
        }
        return 0
    }

    Float getNumberOfWeeks() {
        return numberOfDays / 7
    }

    Float getNumberOfMonths() {
        return numberOfDays / 30
    }
}

class ShowConsumptionRowCommand implements Validateable {

    Product product
    ShowConsumptionCommand command
    InventoryLevel inventoryLevel

    Double pricePerUnit = 0

    Integer onHandQuantity = 0
    Integer transferInQuantity = 0
    Integer transferOutQuantity = 0
    Integer expiredQuantity = 0
    Integer damagedQuantity = 0
    Integer otherQuantity = 0
    Integer debitQuantity = 0

    Integer issuedQuantity = 0
    Integer consumedQuantity = 0
    Integer returnedQuantity = 0
    Integer totalConsumptionQuantity = 0

    Set<Transaction> transferOutTransactions = []
    Set<Transaction> expiredTransactions = []
    Set<Transaction> damagedTransactions = []
    Set<Transaction> transactions = []
    Set<Transaction> transferInTransactions = []
    Set<Transaction> otherTransactions = []

    // Location breakdown
    Map<Location, Integer> transferInMap = new TreeMap<Location, Integer>()
    Map<Location, Integer> transferOutMap = new TreeMap<Location, Integer>()

    // Monthly breakdown
    Map<String, Integer> transferInMonthlyMap = new TreeMap<String, Integer>()
    Map<String, Integer> transferOutMonthlyMap = new TreeMap<String, Integer>()

    static constraints = {

    }

    Integer getTransferBalance() {
        transferOutQuantity + expiredQuantity + damagedQuantity + otherQuantity
    }

    Float getMonthlyQuantity() {
        totalConsumptionQuantity / command.numberOfDays * 30
    }

    Float getWeeklyQuantity() {
        transferBalance / command.numberOfWeeks
    }

    Float getDailyQuantity() {
        transferBalance / command.numberOfDays
    }

    Float getNumberOfMonthsRemaining() {
        if (getMonthlyQuantity() > 0) {
            return onHandQuantity / getMonthlyQuantity()
        } else {
            return 0.0
        }
    }

    String transferOutLocations(List<Location> locations) {
        String transferOutLocations = ""
        if (locations) {
            locations.each { location ->
                transferOutLocations += transferOutMap[location] ?: '0' + ","
            }
        }
        return transferOutLocations
    }
}

class ConsumptionCommand implements Validateable {

    Category category
    Location location
    String groupBy
    Date startDate
    Date endDate

    Boolean aggregate = Boolean.FALSE
    Boolean download = Boolean.FALSE

    static constraints = {
        category(nullable: true)
        location(nullable: true)
        startDate(nullable: true)
        endDate(nullable: true)
        groupBy(nullable: true)

    }
}
