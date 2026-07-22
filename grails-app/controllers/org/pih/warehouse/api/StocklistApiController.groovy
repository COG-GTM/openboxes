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
import org.apache.commons.lang.StringEscapeUtils
import org.grails.web.json.JSONObject
import org.hibernate.ObjectNotFoundException
import org.pih.warehouse.requisition.Requisition
import org.pih.warehouse.core.Location
import org.pih.warehouse.requisition.RequisitionItemSortByCode
import grails.plugins.csv.CSVWriter

/**
 * Should not extend BaseDomainApiController since stocklist is not a valid domain.
 */
class StocklistApiController {

    def requisitionService
    def stocklistService
    def userService

    def list() {
        Requisition requisition = new Requisition(params)
        requisition.isTemplate = true
        requisition.isPublished = params.isPublished ? params.boolean("isPublished") : true
        requisition.origin = null // set null to filter with multiple origins
        requisition.destination = null // set null to filter with multiple destinations

        def origins = params.origin ? Location.findAllByIdInList(params.list("origin")) : []
        def destinations = params.destination ? Location.findAllByIdInList(params.list("destination")) : []

        def requisitions = requisitionService.getRequisitions(requisition, params, origins, destinations)

        if (params.format == 'csv') {
            def hasRoleFinance = userService.hasRoleFinance(session?.user)

            def sw = stocklistService.exportStocklistItems(requisitions, hasRoleFinance);

            response.contentType = "text/csv"
            response.setHeader("Content-disposition", "attachment; filename=\"Stocklists-items-${new Date().format("yyyyMMdd-hhmmss")}.csv\"")
            render(contentType: "text/csv", text: sw.toString(), encoding: "UTF-8")
            return
        }


        render([
            data: requisitions.collect { Requisition req -> req.toStocklistJson() },
            totalCount: requisitions.totalCount,
        ] as JSON)
    }

    /**
     * Full requisition template rendering backing the React
     * requisitionTemplate/show screen. Mirrors the data the legacy GSP
     * (show.gsp + _summary/_header templates) pulled straight off the
     * Requisition domain: header fields, auditing info and the requisition
     * items sorted by the template's sortByCode. Finance-only fields
     * (unit/total cost) are gated by hasRoleFinance, matching the legacy
     * <g:hasRoleFinance> blocks.
     */
    def details() {
        Requisition requisition = Requisition.get(params.id)
        if (!requisition) {
            response.status = 404
            render([errorMessage: "Requisition template with id ${params.id} not found"] as JSON)
            return
        }

        boolean hasRoleFinance = userService.hasRoleFinance(session?.user)
        RequisitionItemSortByCode sortByCode = requisition.sortByCode ?: RequisitionItemSortByCode.SORT_INDEX
        def requisitionItems = requisition."${sortByCode.methodName}"

        // lastUpdated is not touched on the parent when only child items change,
        // so take the max across the template and its items (legacy GSP parity)
        def lastUpdated = [requisition.lastUpdated, requisition.requisitionItems*.lastUpdated?.max()].findAll { it }.max()

        render([data: [
                id                 : requisition.id,
                version            : requisition.version,
                name               : requisition.name,
                description        : requisition.description,
                isPublished        : requisition.isPublished,
                replenishmentPeriod: requisition.replenishmentPeriod,
                requisitionItemCount: requisition.requisitionItemCount,
                origin             : requisition.origin ? [id: requisition.origin.id, name: requisition.origin.name] : null,
                destination        : requisition.destination ? [id: requisition.destination.id, name: requisition.destination.name] : null,
                requestedBy        : requisition.requestedBy ? [id: requisition.requestedBy.id, name: requisition.requestedBy.name] : null,
                commodityClass     : requisition.commodityClass?.name(),
                sortByCode         : requisition.sortByCode ? [name: requisition.sortByCode.name(), friendlyName: requisition.sortByCode.friendlyName] : null,
                createdBy          : requisition.createdBy?.name,
                updatedBy          : requisition.updatedBy?.name,
                dateCreated        : requisition.dateCreated?.format("yyyy-MM-dd'T'HH:mm:ssXXX"),
                lastUpdated        : lastUpdated?.format("yyyy-MM-dd'T'HH:mm:ssXXX"),
                hasRoleFinance     : hasRoleFinance,
                totalCost          : hasRoleFinance ? (requisition.totalCost ?: 0) : null,
                requisitionItems   : requisitionItems?.collect { item ->
                    [
                            id        : item.id,
                            quantity  : item.quantity,
                            product   : [
                                    id         : item.product?.id,
                                    productCode: item.product?.productCode,
                                    name       : item.product?.name,
                                    color      : item.product?.color,
                                    active     : item.product?.active,
                                    category   : item.product?.category?.name,
                            ],
                            unitCost  : hasRoleFinance ? (item.product?.pricePerUnit ?: 0) : null,
                            totalCost : hasRoleFinance ? (item.totalCost ?: 0) : null,
                    ]
                } ?: [],
        ]] as JSON)
    }

    def read() {
        Stocklist stocklist = stocklistService.getStocklist(params.id)

        if (!stocklist) {
            throw new ObjectNotFoundException(params.id, Stocklist.class.toString())
        }

        render([data: stocklist] as JSON)
    }

    def create(Stocklist stocklist) {

        JSONObject jsonObject = request.JSON
        log.debug "create " + jsonObject.toString(4)

        stocklist = stocklistService.createStocklist(stocklist)

        response.status = 201
        render([data: stocklist] as JSON)
    }

    def update() {
        JSONObject jsonObject = request.JSON
        log.debug "update: " + jsonObject.toString(4)

        Stocklist stocklist = stocklistService.getStocklist(params.id)
        if (!stocklist) {
            stocklist = new Stocklist()
        }

        bindData(stocklist, jsonObject)
        stocklist = stocklistService.updateStocklist(stocklist)

        render([data: stocklist] as JSON)
    }

    def delete() {
        try {
            stocklistService.deleteStocklist(params.id)
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            def message = "Requisition $params.id could not be deleted"
            response.status = 400
            render([errorMessages: [message]] as JSON)
            return
        }
        render status: 204
    }

    def sendMail() {
        JSONObject jsonObject = request.JSON
        log.debug "send mail: " + jsonObject.toString(4)
        def emailBody = jsonObject.text + "\n\n" + "Sent by " + session.user.name
        stocklistService.sendMail(params.id, jsonObject.subject, emailBody, jsonObject.recipients, jsonObject.includePdf, jsonObject.includeXls)

        render status: 200
    }

    def clear() {
        Requisition requisition = Requisition.get(params.id)
        if (!requisition) {
            return 404
        }
        requisitionService.clearRequisition(requisition)

        render status: 200
    }

    def clone() {
        def requisition = Requisition.get(params.id)
        if (!requisition) {
            return 404
        }
        requisitionService.cloneRequisition(requisition)

        render status: 200
    }

    def publish() {
        def requisition = Requisition.get(params.id)
        if (!requisition) {
            return 404
        }
        stocklistService.publishStockList(requisition, true);

        render status: 200
    }

    def unpublish() {
        def requisition = Requisition.get(params.id)
        if (!requisition) {
            return 404
        }
        stocklistService.publishStockList(requisition, false);

        render status: 200
    }

    def export() {
        def requisition = Requisition.get(params.id)
        if (!requisition) {
            return 404
        }
        def hasRoleFinance = userService.hasRoleFinance(session?.user)
        def sw = new StringWriter()

        def csv = new CSVWriter(sw, {
            "Product Code" { it.productCode }
            "Product Name" { it.productName }
            "Quantity" { it.quantity }
            "UOM" { it.unitOfMeasure }
            hasRoleFinance ? "Unit cost" { it.unitCost } : null
            hasRoleFinance ? "Total cost" { it.totalCost } : null
        })

        if (requisition.requisitionItems) {
            RequisitionItemSortByCode sortByCode = requisition.sortByCode ?: RequisitionItemSortByCode.SORT_INDEX

            requisition."${sortByCode.methodName}".each { requisitionItem ->
                csv << [
                        productCode  : requisitionItem.product.productCode,
                        productName  : StringEscapeUtils.escapeCsv(requisitionItem.product.name),
                        quantity     : requisitionItem.quantity,
                        unitOfMeasure: "EA/1",
                        unitCost     : hasRoleFinance ? formatNumber(number: requisitionItem.product.pricePerUnit ?: 0, format: '###,###,##0.00##') : null,
                        totalCost    : hasRoleFinance ? formatNumber(number: requisitionItem.totalCost ?: 0, format: '###,###,##0.00##') : null
                ]
            }
        } else {
            csv << [
                    productCode     : "",
                    productName     : "",
                    quantity        : "",
                    unitOfMeasure   : "",
                    unitCost        : "",
                    totalCost       : ""
            ]
        }

        response.contentType = "text/csv"
        response.setHeader("Content-disposition", "attachment; filename=\"Stock List - ${requisition?.destination?.name} - ${new Date().format("yyyyMMdd-hhmmss")}.csv\"")
        render(contentType: "text/csv", text: csv.writer.toString())
        return

        render status: 200
    }

}
