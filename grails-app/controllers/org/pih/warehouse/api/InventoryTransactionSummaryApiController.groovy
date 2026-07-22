package org.pih.warehouse.api

import grails.converters.JSON
import grails.validation.ValidationException
import org.pih.warehouse.PaginatedList
import org.pih.warehouse.core.date.DateFormatter
import org.pih.warehouse.data.DataService
import org.pih.warehouse.importer.CSVUtils
import org.pih.warehouse.inventory.InventoryTransactionSummaryService
import org.pih.warehouse.inventory.InventoryTransactionsSummary
import org.pih.warehouse.inventory.InventoryTransactionsSummaryFormatter
import org.pih.warehouse.report.CycleCountReportCommand

class InventoryTransactionSummaryApiController {

    InventoryTransactionSummaryService inventoryTransactionSummaryService
    InventoryTransactionsSummaryFormatter inventoryTransactionsSummaryFormatter
    DataService dataService
    DateFormatter dateFormatter

    def getInventoryTransactionsSummary(CycleCountReportCommand command) {
        if (!command.validate()) {
            throw new ValidationException("Invalid params", command.errors)
        }

        // CSV is only selectable via the .csv URL extension; a format=csv query
        // parameter is ignored (the URL mapping's optional (.$format)? variable
        // took precedence over the query string in Grails 3)
        boolean csvRequested = request.forwardURI?.endsWith('.csv')

        // If we specify a format=csv we want to download everything
        if (csvRequested) {
            command.max = -1
        }

        PaginatedList<InventoryTransactionsSummary> inventoryTransactions = inventoryTransactionSummaryService.getInventoryTransactionsSummary(command)

        if (csvRequested) {
            String text = dataService.generateCsv(inventoryTransactionsSummaryFormatter.toCsv(inventoryTransactions))
            String fileName = "inventory-transaction-summary-${command.facility}-${dateFormatter.formatCurrentDateForFileName()}.csv"
            response.setHeader("Content-disposition", "attachment; filename=\"${fileName}.csv\"")
            render(contentType: "text/csv", text: CSVUtils.prependBomToCsvString(text), encoding: "UTF-8")
            return
        }

        render([data: inventoryTransactions.list, totalCount: inventoryTransactions.totalCount] as JSON)
    }
}
