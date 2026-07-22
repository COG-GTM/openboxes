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
import org.pih.warehouse.product.Product
import org.pih.warehouse.product.ProductAssociation
import org.pih.warehouse.product.ProductAssociationTypeCode

/**
 * REST endpoints backing the React productAssociation list/create/edit
 * screens. Mirrors the legacy ProductAssociationController actions
 * (list criteria, mutual-association handling on save/update/delete).
 */
@Transactional
class ProductAssociationApiController {

    def productService

    def list() {
        params.max = Math.min(params.max ? params.int('max') : 10, 100)
        params.offset = params.int("offset", 0)

        def terms = params.q ? params?.q?.split(" ") : null
        def products = terms ? productService.searchProducts(terms, null) : []
        def selectedTypes = params.list("code").collect { it as ProductAssociationTypeCode }

        def productAssociations = ProductAssociation.createCriteria().list(params) {
            if (selectedTypes) {
                'in'("code", selectedTypes)
            }
            if (params.q) {
                or {
                    ilike("id", params.q + "%")
                    if (products) {
                        'in'("product", products)
                        'in'("associatedProduct", products)
                    }
                }
            }
        }

        render([data: productAssociations.collect { toJson(it) }, totalCount: productAssociations.totalCount] as JSON)
    }

    def read() {
        ProductAssociation productAssociation = ProductAssociation.get(params.id)
        if (!productAssociation) {
            render(status: 404, contentType: "application/json",
                    text: [errorMessage: "Product association with ID ${params.id} not found"] as JSON)
            return
        }
        render([data: toJson(productAssociation)] as JSON)
    }

    def create() {
        def payload = request.JSON
        ProductAssociation productAssociation = new ProductAssociation()
        bindAssociationData(productAssociation, payload)

        if (!productAssociation.validate()) {
            renderErrors(productAssociation)
            return
        }

        if (payload.hasMutualAssociation) {
            ProductAssociation mutualAssociation = new ProductAssociation()
            bindMutualAssociationData(mutualAssociation, payload)
            mutualAssociation.mutualAssociation = productAssociation
            if (!mutualAssociation.validate()) {
                renderErrors(mutualAssociation)
                return
            }
            mutualAssociation.save(flush: true)
            productAssociation.mutualAssociation = mutualAssociation
        }

        if (!productAssociation.save(flush: true)) {
            renderErrors(productAssociation)
            return
        }
        render([data: toJson(productAssociation)] as JSON)
    }

    def update() {
        ProductAssociation productAssociation = ProductAssociation.get(params.id)
        if (!productAssociation) {
            render(status: 404, contentType: "application/json",
                    text: [errorMessage: "Product association with ID ${params.id} not found"] as JSON)
            return
        }
        def payload = request.JSON

        if (payload.version != null && productAssociation.version > (payload.version as Long)) {
            render(status: 409, contentType: "application/json",
                    text: [errorMessage: "Another user has updated this product association while you were editing"] as JSON)
            return
        }

        ProductAssociation mutualAssociation
        if (payload.hasMutualAssociation) {
            if (productAssociation.mutualAssociation) {
                mutualAssociation = productAssociation.mutualAssociation
            } else {
                mutualAssociation = new ProductAssociation()
                mutualAssociation.mutualAssociation = productAssociation
                productAssociation.mutualAssociation = mutualAssociation
            }
            bindMutualAssociationData(mutualAssociation, payload)
            if (!mutualAssociation.validate()) {
                productAssociation.refresh()
                renderErrors(mutualAssociation)
                return
            }
            mutualAssociation.save(flush: true, failOnError: true)
        } else if (productAssociation.mutualAssociation) {
            mutualAssociation = productAssociation.mutualAssociation
            productAssociation.mutualAssociation = null
            mutualAssociation.delete()
        }

        bindAssociationData(productAssociation, payload)
        if (productAssociation.hasErrors() || !productAssociation.save(flush: true)) {
            renderErrors(productAssociation)
            return
        }
        render([data: toJson(productAssociation)] as JSON)
    }

    def delete() {
        ProductAssociation productAssociation = ProductAssociation.get(params.id)
        if (!productAssociation) {
            render(status: 404, contentType: "application/json",
                    text: [errorMessage: "Product association with ID ${params.id} not found"] as JSON)
            return
        }
        if (productAssociation.mutualAssociation) {
            ProductAssociation mutualAssociation = ProductAssociation.get(productAssociation.mutualAssociation.id)
            mutualAssociation.mutualAssociation = null
            productAssociation.mutualAssociation = null
            if (params.boolean("mutualDelete")) {
                mutualAssociation.delete()
            } else {
                mutualAssociation.save()
            }
        }
        productAssociation.delete(flush: true)
        render(status: 204)
    }

    private void bindAssociationData(ProductAssociation productAssociation, def payload) {
        productAssociation.code = payload.code ?
                ProductAssociationTypeCode.valueOf(ProductAssociationTypeCode, payload.code as String) : null
        productAssociation.product = payload.product?.id ? Product.get(payload.product.id as String) : null
        productAssociation.associatedProduct = payload.associatedProduct?.id ?
                Product.get(payload.associatedProduct.id as String) : null
        productAssociation.quantity = payload.quantity != null && payload.quantity != "" ?
                new BigDecimal(payload.quantity.toString()) : null
        productAssociation.comments = payload.comments
    }

    private void bindMutualAssociationData(ProductAssociation mutualAssociation, def payload) {
        mutualAssociation.product = payload.associatedProduct?.id ?
                Product.get(payload.associatedProduct.id as String) : null
        mutualAssociation.associatedProduct = payload.product?.id ?
                Product.get(payload.product.id as String) : null
        def quantity = payload.quantity != null && payload.quantity != "" ?
                new BigDecimal(payload.quantity.toString()) : BigDecimal.ZERO
        mutualAssociation.quantity = quantity != 0 ? (1 / quantity) : 0 as BigDecimal
        mutualAssociation.code = payload.code ?
                ProductAssociationTypeCode.valueOf(ProductAssociationTypeCode, payload.code as String) : null
        mutualAssociation.comments = payload.comments
    }

    private void renderErrors(ProductAssociation productAssociation) {
        List<String> errorMessages = productAssociation.errors.allErrors.collect { error ->
            g.message(error: error).toString()
        }
        render(status: 400, contentType: "application/json",
                text: [errorCode: 400, errorMessage: errorMessages.join("; "), errorMessages: errorMessages] as JSON)
    }

    private static Map toJson(ProductAssociation productAssociation) {
        return [
                id                  : productAssociation.id,
                version             : productAssociation.version,
                code                : productAssociation.code?.name(),
                product             : productAssociation.product ? [
                        id         : productAssociation.product.id,
                        productCode: productAssociation.product.productCode,
                        name       : productAssociation.product.name,
                ] : null,
                associatedProduct   : productAssociation.associatedProduct ? [
                        id         : productAssociation.associatedProduct.id,
                        productCode: productAssociation.associatedProduct.productCode,
                        name       : productAssociation.associatedProduct.name,
                ] : null,
                quantity            : productAssociation.quantity,
                comments            : productAssociation.comments,
                hasMutualAssociation: productAssociation.mutualAssociation != null,
                dateCreated         : productAssociation.dateCreated?.toString(),
                lastUpdated         : productAssociation.lastUpdated?.toString(),
        ]
    }
}
