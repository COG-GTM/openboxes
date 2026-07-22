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
import org.hibernate.ObjectNotFoundException
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.http.HttpStatus

import org.pih.warehouse.core.Tag
import org.pih.warehouse.product.Product

@Transactional
class TagApiController {

    def read() {
        Tag tag = Tag.get(params.id)
        if (!tag) {
            throw new ObjectNotFoundException(params.id, Tag.class.toString())
        }
        render([data: toJson(tag)] as JSON)
    }

    def delete() {
        Tag tag = Tag.get(params.id)
        if (!tag) {
            throw new ObjectNotFoundException(params.id, Tag.class.toString())
        }
        try {
            // Remove all products from the tag before deleting it,
            // like the legacy TagController.delete action.
            List<Product> products = tag.products ? new ArrayList<Product>(tag.products) : []
            products.each { Product product ->
                tag.removeFromProducts(product)
            }
            tag.delete(flush: true)
        } catch (DataIntegrityViolationException ignored) {
            transactionStatus.setRollbackOnly()
            String message = "${warehouse.message(code: 'default.not.deleted.message', args: [warehouse.message(code: 'tag.label', default: 'Tag'), params.id])}"
            response.status = HttpStatus.BAD_REQUEST.value()
            render([errorCode: HttpStatus.BAD_REQUEST.value(), errorMessage: message] as JSON)
            return
        }
        render status: HttpStatus.NO_CONTENT.value()
    }

    private static Map toJson(Tag tag) {
        return [
                id         : tag.id,
                tag        : tag.tag,
                isActive   : tag.isActive,
                createdBy  : tag.createdBy ? [id: tag.createdBy.id, name: tag.createdBy.toString()] : null,
                updatedBy  : tag.updatedBy ? [id: tag.updatedBy.id, name: tag.updatedBy.toString()] : null,
                dateCreated: tag.dateCreated,
                lastUpdated: tag.lastUpdated,
                products   : (tag.products ?: []).collect { Product product ->
                    [id: product.id, productCode: product.productCode, name: product.name]
                }.sort { it.productCode ?: '' },
        ]
    }
}
