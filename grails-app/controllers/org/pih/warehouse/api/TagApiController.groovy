package org.pih.warehouse.api

import grails.converters.JSON
import grails.gorm.transactions.Transactional
import grails.validation.ValidationException
import org.hibernate.ObjectNotFoundException
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.http.HttpStatus

import org.pih.warehouse.core.Tag
import org.pih.warehouse.product.Product

@Transactional
class TagApiController {

    def list() {
        Integer max = Math.min(params.max ? params.int('max') : 10, 100)
        Integer offset = params.offset ? params.int('offset') : 0
        List<String> sortable = ['id', 'tag', 'dateCreated', 'lastUpdated']
        String sort = params.sort in sortable ? params.sort : 'tag'
        String sortOrder = params.order == 'desc' ? 'desc' : 'asc'
        def results = Tag.createCriteria().list(max: max, offset: offset) {
            if (params.q) {
                // Same contains matching as the legacy list (ilike "%tag%")
                ilike("tag", "%${params.q}%")
            }
            order(sort, sortOrder)
        }
        List data = results.collect { Tag tag ->
            [
                    id          : tag.id,
                    tag         : tag.tag,
                    isActive    : tag.isActive,
                    productCount: tag.products?.size() ?: 0,
                    createdBy   : tag.createdBy?.toString(),
                    updatedBy   : tag.updatedBy?.toString(),
                    dateCreated : tag.dateCreated,
                    lastUpdated : tag.lastUpdated,
            ]
        }
        render([data: data, totalCount: results.totalCount] as JSON)
    }

    def create() {
        def json = request.JSON
        Tag tag = new Tag()
        tag.tag = json.tag ?: null
        if (json.containsKey("isActive")) {
            tag.isActive = json.isActive as Boolean
        }
        if (!tag.validate() || !tag.save(flush: true)) {
            throw new ValidationException("Invalid tag", tag.errors)
        }
        response.status = HttpStatus.CREATED.value()
        render([data: toJson(tag)] as JSON)
    }

    def read() {
        Tag tag = Tag.get(params.id)
        if (!tag) {
            throw new ObjectNotFoundException(params.id, Tag.class.toString())
        }
        render([data: toJson(tag)] as JSON)
    }

    def update() {
        Tag tag = Tag.get(params.id)
        if (!tag) {
            throw new ObjectNotFoundException(params.id, Tag.class.toString())
        }
        def json = request.JSON
        if (json.containsKey("tag")) {
            tag.tag = json.tag ?: null
        }
        if (json.containsKey("isActive")) {
            tag.isActive = json.isActive as Boolean
        }
        if (!tag.validate() || !tag.save(flush: true)) {
            throw new ValidationException("Invalid tag", tag.errors)
        }
        render([data: toJson(tag)] as JSON)
    }

    def delete() {
        Tag tag = Tag.get(params.id)
        if (!tag) {
            throw new ObjectNotFoundException(params.id, Tag.class.toString())
        }
        try {
            // Remove all product associations before deleting the tag,
            // like the legacy TagController.delete action.
            def productIds = tag.products?.collect { it.id } ?: []
            productIds.each { productId ->
                Product product = Product.get(productId)
                if (product) {
                    tag.removeFromProducts(product)
                }
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

    def addProducts() {
        Tag tag = Tag.get(params.id)
        if (!tag) {
            throw new ObjectNotFoundException(params.id, Tag.class.toString())
        }
        def json = request.JSON
        List<String> productCodes = (json.productCodes ?: "").toString()
                .split(",").collect { it.trim() }.findAll { it }
        if (!productCodes) {
            response.status = HttpStatus.BAD_REQUEST.value()
            render([errorCode: HttpStatus.BAD_REQUEST.value(),
                    errorMessage: "Please enter at least one product code"] as JSON)
            return
        }
        productCodes.each { productCode ->
            // Same lookup as the legacy addToProducts action (findByProductCodeLike)
            Product product = Product.findByProductCodeLike(productCode)
            if (product && !tag.products?.contains(product)) {
                tag.addToProducts(product)
                tag.save(flush: true)
            }
        }
        render([data: toJson(tag)] as JSON)
    }

    def removeProduct() {
        Tag tag = Tag.get(params.id)
        if (!tag) {
            throw new ObjectNotFoundException(params.id, Tag.class.toString())
        }
        Product product = Product.get(params.productId)
        if (!product) {
            throw new ObjectNotFoundException(params.productId as String, Product.class.toString())
        }
        tag.removeFromProducts(product)
        tag.save(flush: true)
        render([data: toJson(tag)] as JSON)
    }

    private static Map toJson(Tag tag) {
        [
                id         : tag.id,
                tag        : tag.tag,
                isActive   : tag.isActive,
                createdBy  : tag.createdBy ? [id: tag.createdBy.id, name: tag.createdBy.toString()] : null,
                updatedBy  : tag.updatedBy ? [id: tag.updatedBy.id, name: tag.updatedBy.toString()] : null,
                version    : tag.version,
                dateCreated: tag.dateCreated,
                lastUpdated: tag.lastUpdated,
                products   : (tag.products ?: []).collect {
                    [id: it.id, productCode: it.productCode, name: it.name]
                }.sort { it.productCode ?: '' },
        ]
    }
}
