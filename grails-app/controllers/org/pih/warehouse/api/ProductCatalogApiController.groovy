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
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.http.HttpStatus
import org.springframework.web.multipart.MultipartFile
import org.springframework.web.multipart.MultipartHttpServletRequest

import org.pih.warehouse.product.Product
import org.pih.warehouse.product.ProductCatalog
import org.pih.warehouse.product.ProductCatalogItem

/**
 * REST endpoints backing the React productCatalog list/create/edit/show
 * screens. Mirrors the legacy ProductCatalogController actions (paged list,
 * CRUD, catalog item add/remove, CSV import).
 */
@Transactional
class ProductCatalogApiController {

    def productService

    static final List<String> SORTABLE_PROPERTIES = [
            "id", "code", "name", "description", "active", "color", "dateCreated",
    ]

    def list() {
        Integer max = Math.min(params.max ? params.int('max') : 10, 100)
        Integer offset = params.offset ? params.int('offset') : 0
        String sort = params.sort in SORTABLE_PROPERTIES ? params.sort : "name"
        String sortOrder = params.order == "desc" ? "desc" : "asc"
        def results = ProductCatalog.createCriteria().list(max: max, offset: offset) {
            if (params.q) {
                or {
                    ilike("name", "%${params.q}%")
                    ilike("code", "%${params.q}%")
                }
            }
            order(sort, sortOrder)
        }
        render([data: results.collect { toJson(it) }, totalCount: results.totalCount] as JSON)
    }

    def read() {
        ProductCatalog productCatalog = ProductCatalog.get(params.id)
        if (!productCatalog) {
            renderNotFound()
            return
        }
        render([data: toJson(productCatalog, true)] as JSON)
    }

    def create() {
        def payload = request.JSON
        ProductCatalog productCatalog = new ProductCatalog()
        bindCatalogData(productCatalog, payload)
        if (!productCatalog.validate() || !productCatalog.save(flush: true)) {
            renderErrors(productCatalog)
            return
        }
        response.status = HttpStatus.CREATED.value()
        render([data: toJson(productCatalog)] as JSON)
    }

    def update() {
        ProductCatalog productCatalog = ProductCatalog.get(params.id)
        if (!productCatalog) {
            renderNotFound()
            return
        }
        def payload = request.JSON
        if (payload.version != null && productCatalog.version > (payload.version as Long)) {
            render(status: HttpStatus.CONFLICT.value(), contentType: "application/json",
                    text: [errorMessage: "Another user has updated this product catalog while you were editing"] as JSON)
            return
        }
        bindCatalogData(productCatalog, payload)
        if (productCatalog.hasErrors() || !productCatalog.save(flush: true)) {
            transactionStatus.setRollbackOnly()
            renderErrors(productCatalog)
            return
        }
        render([data: toJson(productCatalog, true)] as JSON)
    }

    def delete() {
        ProductCatalog productCatalog = ProductCatalog.get(params.id)
        if (!productCatalog) {
            renderNotFound()
            return
        }
        try {
            productCatalog.delete(flush: true)
        } catch (DataIntegrityViolationException ignored) {
            transactionStatus.setRollbackOnly()
            render(status: HttpStatus.BAD_REQUEST.value(), contentType: "application/json",
                    text: [errorMessage: "Product catalog with ID ${params.id} could not be deleted"] as JSON)
            return
        }
        render(status: HttpStatus.NO_CONTENT.value())
    }

    def addItem() {
        ProductCatalog productCatalog = ProductCatalog.get(params.id)
        if (!productCatalog) {
            renderNotFound()
            return
        }
        def payload = request.JSON
        Product product = payload.product?.id ? Product.get(payload.product.id as String) : null
        if (!product) {
            render(status: HttpStatus.BAD_REQUEST.value(), contentType: "application/json",
                    text: [errorMessage: "Product is required"] as JSON)
            return
        }
        if (!productCatalog.contains(product)) {
            productCatalog.addToProductCatalogItems(new ProductCatalogItem(product: product))
            productCatalog.save(flush: true)
        }
        render([data: toJson(productCatalog, true)] as JSON)
    }

    def removeItem() {
        ProductCatalog productCatalog = ProductCatalog.get(params.id)
        if (!productCatalog) {
            renderNotFound()
            return
        }
        ProductCatalogItem productCatalogItem = ProductCatalogItem.get(params.itemId)
        if (!productCatalogItem || productCatalogItem.productCatalog?.id != productCatalog.id) {
            render(status: HttpStatus.NOT_FOUND.value(), contentType: "application/json",
                    text: [errorMessage: "Product catalog item with ID ${params.itemId} not found"] as JSON)
            return
        }
        productCatalog.removeFromProductCatalogItems(productCatalogItem)
        productCatalogItem.delete()
        productCatalog.save(flush: true)
        render([data: toJson(productCatalog, true)] as JSON)
    }

    def importItems() {
        ProductCatalog productCatalog = ProductCatalog.get(params.id)
        if (!productCatalog) {
            renderNotFound()
            return
        }
        MultipartFile importFile = request instanceof MultipartHttpServletRequest
                ? request.getFile("importFile") : null
        if (!importFile || importFile.empty) {
            render(status: HttpStatus.BAD_REQUEST.value(), contentType: "application/json",
                    text: [errorMessage: "${warehouse.message(code: 'import.emptyFile.message', default: 'File is empty')}"] as JSON)
            return
        }
        try {
            String csv = new String(importFile.bytes)
            def rows = productService.parseProductCatalogItems(csv)
            rows.each {
                if (it.productCatalog && it.product) {
                    if (!it.productCatalog.contains(it.product)) {
                        it.productCatalog.addToProductCatalogItems(new ProductCatalogItem(product: it.product))
                        it.productCatalog.save(flush: true)
                    }
                }
            }
            render([data: toJson(productCatalog, true), importedCount: rows.size()] as JSON)
        } catch (Exception e) {
            transactionStatus.setRollbackOnly()
            log.error("Exception occurred while importing product catalog items " + e.message, e)
            render(status: HttpStatus.BAD_REQUEST.value(), contentType: "application/json",
                    text: [errorMessage: e.message] as JSON)
        }
    }

    private void renderNotFound() {
        render(status: HttpStatus.NOT_FOUND.value(), contentType: "application/json",
                text: [errorMessage: "Product catalog with ID ${params.id} not found"] as JSON)
    }

    private void renderErrors(ProductCatalog productCatalog) {
        List<String> errorMessages = productCatalog.errors.allErrors.collect { error ->
            g.message(error: error).toString()
        }
        render(status: HttpStatus.BAD_REQUEST.value(), contentType: "application/json",
                text: [errorCode: HttpStatus.BAD_REQUEST.value(), errorMessage: errorMessages.join("; "), errorMessages: errorMessages] as JSON)
    }

    private void bindCatalogData(ProductCatalog productCatalog, def payload) {
        if (payload.containsKey("code")) {
            productCatalog.code = payload.code ?: null
        }
        if (payload.containsKey("name")) {
            productCatalog.name = payload.name ?: null
        }
        if (payload.containsKey("description")) {
            productCatalog.description = payload.description ?: null
        }
        if (payload.containsKey("active")) {
            productCatalog.active = payload.active as Boolean
        }
        if (payload.containsKey("color")) {
            productCatalog.color = payload.color ?: null
        }
        productCatalog.validate()
    }

    private static Map toJson(ProductCatalog productCatalog, boolean includeItems = false) {
        Map json = [
                id         : productCatalog.id,
                code       : productCatalog.code,
                name       : productCatalog.name,
                description: productCatalog.description,
                active     : productCatalog.active,
                color      : productCatalog.color,
                dateCreated: productCatalog.dateCreated?.toString(),
                lastUpdated: productCatalog.lastUpdated?.toString(),
                version    : productCatalog.version,
                itemCount  : productCatalog.productCatalogItems?.size() ?: 0,
        ]
        if (includeItems) {
            json.productCatalogItems = (productCatalog.productCatalogItems ?: [])
                    .sort { it.product?.name }
                    .collect { ProductCatalogItem item ->
                        [
                                id     : item.id,
                                product: item.product ? [
                                        id         : item.product.id,
                                        productCode: item.product.productCode,
                                        name       : item.product.name,
                                        category   : item.product.category ? [
                                                id  : item.product.category.id,
                                                name: item.product.category.name,
                                        ] : null,
                                ] : null,
                        ]
                    }
        }
        return json
    }
}
