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
import org.springframework.http.HttpStatus

import org.pih.warehouse.product.Category
import org.pih.warehouse.product.ProductGroup

/**
 * REST endpoints backing the React productGroup create screen. Mirrors the
 * legacy ProductGroupController save action (create only; edit/list/show are
 * still served by the legacy GSPs until Batch 11).
 */
@Transactional
class ProductGroupApiController {

    def create() {
        def payload = request.JSON
        ProductGroup productGroup = new ProductGroup()
        productGroup.name = payload.name ?: null
        productGroup.description = payload.description ?: null
        productGroup.category = payload.category?.id ? Category.get(payload.category.id as String) : null
        if (!productGroup.validate() || !productGroup.save(flush: true)) {
            List<String> errorMessages = productGroup.errors.allErrors.collect { error ->
                g.message(error: error).toString()
            }
            render(status: HttpStatus.BAD_REQUEST.value(), contentType: "application/json",
                    text: [errorCode: HttpStatus.BAD_REQUEST.value(), errorMessage: errorMessages.join("; "), errorMessages: errorMessages] as JSON)
            return
        }
        response.status = HttpStatus.CREATED.value()
        render([data: toJson(productGroup)] as JSON)
    }

    private static Map toJson(ProductGroup productGroup) {
        return [
                id         : productGroup.id,
                name       : productGroup.name,
                description: productGroup.description,
                category   : productGroup.category ? [
                        id  : productGroup.category.id,
                        name: productGroup.category.name,
                ] : null,
                dateCreated: productGroup.dateCreated?.toString(),
                lastUpdated: productGroup.lastUpdated?.toString(),
        ]
    }
}
