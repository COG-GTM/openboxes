package org.pih.warehouse.api

import grails.converters.JSON
import grails.gorm.transactions.Transactional
import grails.validation.ValidationException
import org.hibernate.ObjectNotFoundException
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.http.HttpStatus

import org.pih.warehouse.product.Category
import org.pih.warehouse.product.Product
import org.pih.warehouse.product.ProductGroup
import org.pih.warehouse.product.ProductGroupService
import org.pih.warehouse.product.ProductService

@Transactional
class ProductGroupApiController {

    ProductGroupService productGroupService
    ProductService productService

    def list() {
        Integer max = Math.min(params.max ? params.int('max') : 10, 100)
        Integer offset = params.offset ? params.int('offset') : 0
        String sort = params.sort in ['name', 'dateCreated', 'lastUpdated'] ? params.sort : 'name'
        String sortOrder = params.order == 'desc' ? 'desc' : 'asc'
        def results = ProductGroup.createCriteria().list(max: max, offset: offset) {
            if (params.q) {
                // Same contains matching as the legacy list (findAllByNameLike "%q%")
                ilike("name", "%${params.q}%")
            }
            order(sort, sortOrder)
        }
        List data = results.collect { ProductGroup productGroup ->
            [
                    id          : productGroup.id,
                    name        : productGroup.name,
                    category    : productGroup.category?.toString(),
                    productCount: productGroup.products?.size() ?: 0,
                    dateCreated : productGroup.dateCreated,
                    lastUpdated : productGroup.lastUpdated,
            ]
        }
        render([data: data, totalCount: results.totalCount] as JSON)
    }

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

    def read() {
        ProductGroup productGroup = ProductGroup.get(params.id)
        if (!productGroup) {
            throw new ObjectNotFoundException(params.id, ProductGroup.class.toString())
        }
        render([data: toJson(productGroup)] as JSON)
    }

    def update() {
        ProductGroup productGroup = ProductGroup.get(params.id)
        if (!productGroup) {
            throw new ObjectNotFoundException(params.id, ProductGroup.class.toString())
        }
        def json = request.JSON
        if (json.containsKey("name")) {
            productGroup.name = json.name ?: null
        }
        if (json.containsKey("description")) {
            productGroup.description = json.description ?: null
        }
        if (json.containsKey("category")) {
            productGroup.category = json.category ? Category.get(json.category as String) : null
        }
        if (!productGroup.validate() || !productGroup.save(flush: true)) {
            throw new ValidationException("Invalid product group", productGroup.errors)
        }
        render([data: toJson(productGroup)] as JSON)
    }

    def delete() {
        ProductGroup productGroup = ProductGroup.get(params.id)
        if (!productGroup) {
            throw new ObjectNotFoundException(params.id, ProductGroup.class.toString())
        }
        try {
            // Remove all products from the product group before deleting it,
            // like the legacy ProductGroupController.delete action.
            def productIds = productGroup.products?.collect { it.id } ?: []
            productIds.each { productId ->
                Product product = Product.get(productId)
                productGroup.removeFromProducts(product)
            }
            productGroup.delete(flush: true)
        } catch (DataIntegrityViolationException ignored) {
            transactionStatus.setRollbackOnly()
            String message = "${warehouse.message(code: 'default.not.deleted.message', args: [warehouse.message(code: 'productGroup.label', default: 'ProductGroup'), params.id])}"
            response.status = HttpStatus.BAD_REQUEST.value()
            render([errorCode: HttpStatus.BAD_REQUEST.value(), errorMessage: message] as JSON)
            return
        }
        render status: HttpStatus.NO_CONTENT.value()
    }

    def addProduct() {
        ProductGroup productGroup = ProductGroup.get(params.id)
        if (!productGroup) {
            throw new ObjectNotFoundException(params.id, ProductGroup.class.toString())
        }
        def json = request.JSON
        Boolean isProductFamily = json.isProductFamily as Boolean ?: false
        try {
            productGroupService.addProductToProductGroup(params.id, json.productId as String, isProductFamily)
        } catch (IllegalArgumentException e) {
            response.status = HttpStatus.BAD_REQUEST.value()
            render([errorCode: HttpStatus.BAD_REQUEST.value(), errorMessage: e.message] as JSON)
            return
        }
        render([data: toJson(productGroup)] as JSON)
    }

    def removeProduct() {
        ProductGroup productGroup = ProductGroup.get(params.id)
        Product product = Product.get(params.productId)
        if (!productGroup || !product) {
            throw new ObjectNotFoundException(params.productId as String, Product.class.toString())
        }
        Boolean isProductFamily = params.boolean("isProductFamily") ?: false
        if (isProductFamily) {
            productGroup.removeFromSiblings(product)
            product.productFamily = null
        } else {
            product.removeFromProductGroups(productGroup)
            productGroup.removeFromProducts(product)
        }
        productService.saveProduct(product)
        render([data: toJson(productGroup)] as JSON)
    }

    private static Map toJson(ProductGroup productGroup) {
        [
                id         : productGroup.id,
                name       : productGroup.name,
                description: productGroup.description,
                category   : productGroup.category ?
                        [id: productGroup.category.id, name: productGroup.category.toString()] : null,
                version    : productGroup.version,
                dateCreated: productGroup.dateCreated,
                lastUpdated: productGroup.lastUpdated,
                products   : (productGroup.products ?: []).collect { productToJson(it) }.sort { it.name },
                siblings   : (productGroup.siblings ?: []).collect { productToJson(it) }.sort { it.name },
        ]
    }

    private static Map productToJson(Product product) {
        [
                id              : product.id,
                productCode     : product.productCode,
                name            : product.name,
                category        : product.category?.toString(),
                unitOfMeasure   : product.unitOfMeasure,
                manufacturer    : product.manufacturer,
                manufacturerCode: product.manufacturerCode,
                vendor          : product.vendor,
                vendorCode      : product.vendorCode,
        ]
    }
}
