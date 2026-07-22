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
import groovy.time.TimeCategory
import org.pih.warehouse.core.Location
import org.pih.warehouse.core.UserService
import org.pih.warehouse.product.Category
import org.pih.warehouse.report.ConsumptionService
import org.pih.warehouse.reporting.ConsumptionFact
import org.pih.warehouse.reporting.ShowConsumptionCommand
import org.pih.warehouse.reporting.ShowConsumptionRowCommand

import java.text.SimpleDateFormat

class ConsumptionApiController {

    ConsumptionService consumptionService
    UserService userService

    /**
     * Returns raw consumption fact rows (same payload as the legacy
     * /consumption/aggregate JSON endpoint) for the React consumption
     * list and pivot screens.
     */
    def aggregate() {
        Location location = Location.get(params.locationId ?: session?.warehouse?.id)
        if (!location) {
            throw new IllegalArgumentException("Cannot list consumption without a location - sign in or provide locationId as a request parameter")
        }
        Category category = params.categoryId ? Category.get(params.categoryId) : null

        Date startDate = parseDate(params.startDate)
        Date endDate = parseDate(params.endDate)
        use(TimeCategory) {
            endDate = endDate ?: new Date()
            startDate = startDate ?: new Date() - 6.months
        }

        List<ConsumptionFact> results = consumptionService.listConsumption(location, category, startDate, endDate)

        def data = results.collect {
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
        render([data: data] as JSON)
    }

    /**
     * Returns the consumption report rows (same computation as the legacy
     * /consumption/show screen) for the React consumption report screen.
     */
    def summary() {
        Location location = Location.get(params.locationId ?: session?.warehouse?.id)
        if (!location) {
            throw new IllegalArgumentException("Cannot build consumption report without a location - sign in or provide locationId as a request parameter")
        }

        Date fromDate = parseDate(params.startDate)
        Date toDate = parseDate(params.endDate)
        use(TimeCategory) {
            toDate = toDate ?: new Date()
            fromDate = fromDate ?: new Date() - 1.months
        }

        ShowConsumptionCommand command = new ShowConsumptionCommand()
        command.fromLocations = [location]
        command.fromDate = fromDate
        command.toDate = toDate

        boolean userHasFinanceRole = userService.hasRoleFinance(session?.user)
        consumptionService.buildShowConsumption(command, userHasFinanceRole)

        def data = command.rows.collect { product, ShowConsumptionRowCommand row ->
            [
                    productId                : product.id,
                    productCode              : product.productCode,
                    productName              : product.name,
                    category                 : product?.category?.name,
                    unitOfMeasure            : product?.unitOfMeasure,
                    unitPrice                : row.pricePerUnit,
                    issuedQuantity           : row.issuedQuantity,
                    consumedQuantity         : row.consumedQuantity,
                    returnedQuantity         : row.returnedQuantity,
                    totalConsumptionQuantity : row.totalConsumptionQuantity,
                    totalConsumptionValue    : (row.pricePerUnit ?: 0) * row.totalConsumptionQuantity,
                    monthlyQuantity          : command.numberOfDays ? finiteOrNull(row.monthlyQuantity) : null,
                    onHandQuantity           : row.onHandQuantity,
                    numberOfMonthsRemaining  : command.numberOfDays ? finiteOrNull(row.numberOfMonthsRemaining) : null,
            ]
        }
        render([data: data, totalCount: data.size()] as JSON)
    }

    private static Number finiteOrNull(Number value) {
        if (value == null) {
            return null
        }
        double doubleValue = value.doubleValue()
        return (Double.isNaN(doubleValue) || Double.isInfinite(doubleValue)) ? null : value
    }

    private static Date parseDate(String value) {
        if (!value) {
            return null
        }
        return new SimpleDateFormat("MM/dd/yyyy").parse(value)
    }
}
