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
import org.pih.warehouse.core.Constants
import org.pih.warehouse.core.Location
import org.pih.warehouse.core.Person
import org.pih.warehouse.core.User
import org.pih.warehouse.core.UserService
import org.pih.warehouse.product.Product
import org.pih.warehouse.product.ProductPackage
import org.pih.warehouse.requisition.ReplenishmentTypeCode
import org.pih.warehouse.requisition.Requisition
import org.pih.warehouse.requisition.RequisitionItem
import org.pih.warehouse.requisition.RequisitionItemSortByCode
import org.pih.warehouse.requisition.RequisitionStatus
import org.pih.warehouse.requisition.RequisitionTemplateService
import org.pih.warehouse.requisition.RequisitionType

@Transactional
class RequisitionTemplateApiController extends BaseApiController {

    UserService userService
    RequisitionTemplateService requisitionTemplateService

    /**
     * Mirrors the model of the legacy RequisitionTemplateController
     * edit/editHeader/batch/sendMail actions: the template header plus the
     * stock list items rendered by the legacy datatable
     * (JsonController.getRequisitionItems).
     */
    def read() {
        Requisition requisition = Requisition.get(params.id)
        if (!requisition) {
            response.status = 404
            render([errorCode: 404, errorMessage: "Requisition template ${params.id} not found"] as JSON)
            return
        }
        render([data: getDetails(requisition)] as JSON)
    }

    /**
     * Mirrors the legacy RequisitionTemplateController.save action.
     */
    def create() {
        def jsonObject = request.JSON
        Requisition requisition = new Requisition()
        requisition.isTemplate = true
        requisition.status = RequisitionStatus.CREATED
        requisition.type = jsonObject.type ?
                jsonObject.type as RequisitionType : RequisitionType.STOCK
        requisition.createdBy = User.get(session.user.id)
        bindHeader(requisition, jsonObject)
        if (!requisition.origin) {
            requisition.origin = Location.get(session?.warehouse?.id)
        }
        requisition.save(flush: true)
        if (requisition.hasErrors()) {
            response.status = 400
            render([errorCode: 400, errorMessage: "Validation errors",
                    errors: requisition.errors.allErrors.collect { g.message(error: it) }] as JSON)
            return
        }
        response.status = 201
        render([data: getDetails(requisition)] as JSON)
    }

    /**
     * Mirrors the legacy RequisitionTemplateController.update action
     * (used by the editHeader screen).
     */
    def updateHeader() {
        Requisition requisition = Requisition.get(params.id)
        if (!requisition) {
            response.status = 404
            render([errorCode: 404, errorMessage: "Requisition template ${params.id} not found"] as JSON)
            return
        }
        def jsonObject = request.JSON
        bindHeader(requisition, jsonObject)
        requisition.lastUpdated = new Date()
        requisition.updatedBy = User.get(session.user.id)
        requisition.save(flush: true)
        if (requisition.hasErrors()) {
            response.status = 400
            render([errorCode: 400, errorMessage: "Validation errors",
                    errors: requisition.errors.allErrors.collect { g.message(error: it) }] as JSON)
            return
        }
        render([data: getDetails(requisition)] as JSON)
    }

    /**
     * Mirrors the legacy JsonController.addToRequisitionItems action (used by
     * the stock list edit screen to add a single line).
     */
    def addItem() {
        Requisition requisition = Requisition.get(params.id)
        if (!requisition) {
            response.status = 404
            render([errorCode: 404, errorMessage: "Requisition template ${params.id} not found"] as JSON)
            return
        }
        def jsonObject = request.JSON
        Product product = Product.get(jsonObject.productId)
        if (!product) {
            response.status = 400
            render([errorCode: 400, errorMessage: "Unable to find product with ID ${jsonObject.productId}"] as JSON)
            return
        }
        def existingItem = requisition.requisitionItems?.find { it.product == product }
        if (existingItem) {
            response.status = 400
            render([errorCode: 400,
                    errorMessage: g.message(code: 'requisitionTemplate.duplicatedLine.error.label',
                            default: 'Item already exists in the stocklist')] as JSON)
            return
        }
        RequisitionItem requisitionItem = new RequisitionItem()
        requisitionItem.product = product
        requisitionItem.quantity = jsonObject.quantity != null ? jsonObject.quantity as Integer : 1
        requisitionItem.substitutable = false
        requisitionItem.orderIndex = jsonObject.orderIndex != null ?
                jsonObject.orderIndex as Integer : (requisition.requisitionItems?.size() ?: 0)
        requisition.updatedBy = User.get(session.user.id)
        requisition.addToRequisitionItems(requisitionItem)
        requisition.save(flush: true)
        if (requisition.hasErrors()) {
            response.status = 400
            render([errorCode: 400, errorMessage: "Validation errors",
                    errors: requisition.errors.allErrors.collect { g.message(error: it) }] as JSON)
            return
        }
        render([data: requisitionItem.toStockListDetailsJson()] as JSON)
    }

    /**
     * Mirrors the legacy JsonController.updateRequisitionItems action (used
     * by the stock list edit screen to save quantities and packages).
     */
    def updateItems() {
        Requisition requisition = Requisition.get(params.id)
        if (!requisition) {
            response.status = 404
            render([errorCode: 404, errorMessage: "Requisition template ${params.id} not found"] as JSON)
            return
        }
        def jsonObject = request.JSON
        jsonObject.items?.each { item ->
            RequisitionItem requisitionItem = requisition.requisitionItems.find { it.id == item.id }
            if (requisitionItem) {
                requisitionItem.quantity = item.quantity != null && item.quantity != "" ?
                        item.quantity as Integer : null
                requisitionItem.productPackage = item.productPackageId ?
                        ProductPackage.get(item.productPackageId) : null
            }
        }
        requisition.updatedBy = User.get(session.user.id)
        requisition.save(flush: true)
        if (requisition.hasErrors()) {
            response.status = 400
            render([errorCode: 400, errorMessage: "Validation errors",
                    errors: requisition.errors.allErrors.collect { g.message(error: it) }] as JSON)
            return
        }
        render([data: getDetails(requisition)] as JSON)
    }

    /**
     * Mirrors the legacy JsonController.removeRequisitionItem action.
     */
    def removeItem() {
        RequisitionItem requisitionItem = RequisitionItem.get(params.itemId)
        if (!requisitionItem || requisitionItem.requisition?.id != params.id) {
            response.status = 404
            render([errorCode: 404, errorMessage: "Unable to find requisition item with ID ${params.itemId}"] as JSON)
            return
        }
        requisitionItem.requisition.removeFromRequisitionItems(requisitionItem)
        requisitionItem.delete()
        render status: 204
    }

    /**
     * Mirrors the legacy RequisitionTemplateController.importData action:
     * parses the posted CSV/TSV text and returns the parsed rows plus
     * validation errors, without persisting anything.
     */
    def importData() {
        Requisition requisition = Requisition.get(params.id)
        if (!requisition) {
            response.status = 404
            render([errorCode: 404, errorMessage: "Requisition template ${params.id} not found"] as JSON)
            return
        }
        String csv
        Integer skipLines
        String delimiter
        if (request.contentType?.toLowerCase()?.contains("multipart")) {
            def file = request.getFile('file')
            csv = file ? new String(file.bytes, "UTF-8") : null
            skipLines = params.int('skipLines') ?: 0
            delimiter = params.delimiter ?: ","
        } else {
            def jsonObject = request.JSON
            csv = jsonObject.csv
            skipLines = jsonObject.skipLines != null ? jsonObject.skipLines as Integer : 0
            delimiter = jsonObject.delimiter ?: ","
        }
        if (!csv) {
            response.status = 400
            render([errorCode: 400, errorMessage: "No import data provided"] as JSON)
            return
        }
        InputStream inputStream = new ByteArrayInputStream(csv.getBytes("UTF-8"))
        List<Object> data = requisitionTemplateService.parseImportFile(inputStream, requisition, delimiter, skipLines)
        List<String> errors = requisitionTemplateService.validateImportData(data)
        render([data: data.collect { row -> row.collect { it?.toString() } }, errors: errors] as JSON)
    }

    /**
     * Mirrors the legacy RequisitionTemplateController.doImport action:
     * inserts/updates stock list items from the parsed rows returned by
     * importData.
     */
    def doImport() {
        Requisition requisition = Requisition.get(params.id)
        if (!requisition) {
            response.status = 404
            render([errorCode: 404, errorMessage: "Requisition template ${params.id} not found"] as JSON)
            return
        }
        def jsonObject = request.JSON
        def data = jsonObject.data ?: []
        def updateCount = 0
        def insertCount = 0
        def ignoreCount = 0
        List<String> errors = []
        data.eachWithIndex { row, index ->
            // Ignore the first row if the user included header info
            if (row[0] != "Product Code" && row[2] != "Quantity") {
                try {
                    def productCode = row[0]
                    def quantity = Integer.parseInt(row[2] as String)
                    // Ignore if quantity is null or 0
                    if (quantity) {
                        def product = Product.findByProductCode(productCode)
                        if (product) {
                            def requisitionItem = requisition.requisitionItems.find {
                                it.product == product
                            }
                            if (requisitionItem) {
                                if (requisitionItem.quantity != quantity) {
                                    requisitionItem.quantity = quantity
                                    updateCount++
                                } else {
                                    ignoreCount++
                                }
                            } else {
                                requisitionItem = new RequisitionItem()
                                requisitionItem.product = product
                                requisitionItem.orderIndex = index
                                requisitionItem.quantity = quantity
                                requisitionItem.substitutable = false
                                requisition.addToRequisitionItems(requisitionItem)
                                insertCount++
                            }
                        } else {
                            errors << "${index + 1}: Product with product code '${row[0]}' does not exist".toString()
                            ignoreCount++
                        }
                    }
                } catch (NumberFormatException e) {
                    errors << "${index + 1}: Invalid quantity '${row[2]}' for product code '${row[0]}'".toString()
                    ignoreCount++
                }
            }
        }
        requisition.save(flush: true)
        render([data: [insertCount: insertCount, updateCount: updateCount, ignoreCount: ignoreCount],
                errors: errors] as JSON)
    }

    /**
     * Mirrors the legacy RequisitionTemplateController.addToRequisitionItems
     * action (bulk add by product codes).
     */
    def addProductCodes() {
        Requisition requisition = Requisition.get(params.id)
        if (!requisition) {
            response.status = 404
            render([errorCode: 404, errorMessage: "Requisition template ${params.id} not found"] as JSON)
            return
        }
        def jsonObject = request.JSON
        List<String> productCodes = (jsonObject.productCodes ?: []).collect { it?.toString()?.trim() }.findAll { it }
        List<String> processedProductCodes = []
        List<String> ignoredProductCodes = []
        int count = requisition.requisitionItems?.size() ?: 0
        productCodes.eachWithIndex { productCode, index ->
            Product product = Product.findByProductCode(productCode)
            if (product) {
                def requisitionItem = requisition.requisitionItems.find { it.product == product }
                if (!requisitionItem) {
                    requisitionItem = new RequisitionItem()
                    requisitionItem.product = product
                    requisitionItem.quantity = 1
                    requisitionItem.substitutable = false
                    requisitionItem.orderIndex = count + index
                    requisition.updatedBy = User.get(session.user.id)
                    requisition.addToRequisitionItems(requisitionItem)
                    requisition.save()
                    processedProductCodes << productCode
                } else {
                    ignoredProductCodes << productCode
                }
            } else {
                ignoredProductCodes << productCode
            }
        }
        render([data: [processedProductCodes: processedProductCodes,
                       ignoredProductCodes  : ignoredProductCodes]] as JSON)
    }

    private void bindHeader(Requisition requisition, def jsonObject) {
        if (jsonObject.containsKey("name")) requisition.name = jsonObject.name
        if (jsonObject.containsKey("originId")) {
            requisition.origin = jsonObject.originId ? Location.get(jsonObject.originId) : null
        }
        if (jsonObject.containsKey("destinationId")) {
            requisition.destination = jsonObject.destinationId ? Location.get(jsonObject.destinationId) : null
        }
        if (jsonObject.containsKey("requestedById")) {
            requisition.requestedBy = jsonObject.requestedById ? Person.get(jsonObject.requestedById) : null
        }
        if (jsonObject.containsKey("replenishmentPeriod")) {
            requisition.replenishmentPeriod = jsonObject.replenishmentPeriod != null && jsonObject.replenishmentPeriod != "" ?
                    jsonObject.replenishmentPeriod as Integer : null
        }
        if (jsonObject.containsKey("replenishmentTypeCode")) {
            requisition.replenishmentTypeCode = jsonObject.replenishmentTypeCode ?
                    jsonObject.replenishmentTypeCode as ReplenishmentTypeCode : null
        }
        if (jsonObject.containsKey("sortByCode")) {
            requisition.sortByCode = jsonObject.sortByCode ?
                    jsonObject.sortByCode as RequisitionItemSortByCode : null
        }
        if (jsonObject.containsKey("description")) requisition.description = jsonObject.description
        if (jsonObject.containsKey("isPublished")) requisition.isPublished = jsonObject.isPublished ? true : false
    }

    private Map getDetails(Requisition requisition) {
        RequisitionItemSortByCode sortByCode = requisition.sortByCode ?: RequisitionItemSortByCode.SORT_INDEX
        def sortedItems = requisition.requisitionItems ? requisition."${sortByCode.methodName}" : []
        return [
                id                   : requisition.id,
                requestNumber        : requisition.requestNumber,
                name                 : requisition.name,
                description          : requisition.description,
                status               : requisition.status?.name(),
                type                 : requisition.type?.name(),
                isTemplate           : requisition.isTemplate ? true : false,
                isPublished          : requisition.isPublished ? true : false,
                version              : requisition.version,
                origin               : requisition.origin ? [id: requisition.origin.id, name: requisition.origin.name] : null,
                destination          : requisition.destination ? [id: requisition.destination.id, name: requisition.destination.name] : null,
                requestedBy          : requisition.requestedBy ? [id: requisition.requestedBy.id, name: requisition.requestedBy.name, email: requisition.requestedBy.email] : null,
                createdBy            : requisition.createdBy ? [id: requisition.createdBy.id, name: requisition.createdBy.name] : null,
                updatedBy            : requisition.updatedBy ? [id: requisition.updatedBy.id, name: requisition.updatedBy.name] : null,
                dateCreated          : requisition.dateCreated?.format(Constants.DEFAULT_DATE_TIME_FORMAT),
                lastUpdated          : requisition.lastUpdated?.format(Constants.DEFAULT_DATE_TIME_FORMAT),
                replenishmentPeriod  : requisition.replenishmentPeriod,
                replenishmentTypeCode: requisition.replenishmentTypeCode?.name(),
                sortByCode           : requisition.sortByCode?.name(),
                commodityClass       : requisition.commodityClass?.name(),
                totalCost            : requisition.totalCost ?: 0,
                requisitionItemCount : requisition.requisitionItems?.size() ?: 0,
                hasRoleFinance       : userService.hasRoleFinance(User.get(session?.user?.id)) ? true : false,
                requisitionItems     : sortedItems?.collect { it.toStockListDetailsJson() } ?: [],
        ]
    }
}
