package org.pih.warehouse.api

import grails.converters.JSON
import grails.gorm.transactions.Transactional
import grails.util.Holders
import grails.validation.ValidationException
import org.hibernate.ObjectNotFoundException
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.http.HttpStatus

import org.pih.warehouse.product.Product
import org.pih.warehouse.product.ProductActivityCode
import org.pih.warehouse.product.ProductField
import org.pih.warehouse.product.ProductType
import org.pih.warehouse.product.ProductTypeCode
import org.pih.warehouse.product.ProductTypeService

@Transactional
class ProductTypeApiController {

    ProductTypeService productTypeService

    def create() {
        def json = request.JSON
        ProductType productType = new ProductType()
        productType.name = json.name ?: null
        productType.code = json.code ?: null
        productType.productIdentifierFormat = json.productIdentifierFormat ?: null
        productType.sequenceNumber = json.sequenceNumber != null && json.sequenceNumber != "" ?
                json.sequenceNumber as Integer : 0
        // The legacy save action forces these regardless of user input
        productType.productTypeCode = ProductTypeCode.GOOD
        productType.requiredFields = [ProductField.PRODUCT_CODE, ProductField.NAME,
                                      ProductField.CATEGORY, ProductField.GL_ACCOUNT]
        (json.supportedActivities ?: []).each {
            productType.addToSupportedActivities(it as ProductActivityCode)
        }
        (json.displayedFields ?: []).each {
            productType.addToDisplayedFields(it as ProductField)
        }
        if (!productType.code && !productType.productIdentifierFormat) {
            productType.errors.rejectValue("productIdentifierFormat", "productType.codeOrIdentifierRequired.message")
            throw new ValidationException("Invalid product type", productType.errors)
        }
        if (!productType.validate() || !productTypeService.saveProductType(productType)) {
            throw new ValidationException("Invalid product type", productType.errors)
        }
        response.status = HttpStatus.CREATED.value()
        render([data: toJson(productType)] as JSON)
    }

    def delete() {
        if (params.id == Holders.config.openboxes.productType.default.id) {
            response.status = HttpStatus.BAD_REQUEST.value()
            render([errorCode: HttpStatus.BAD_REQUEST.value(),
                    errorMessage: "${warehouse.message(code: 'productType.cannotDeleteDefaultProductType.message', default: 'Cannot delete default product type')}"] as JSON)
            return
        }
        ProductType productType = ProductType.get(params.id)
        if (!productType) {
            throw new ObjectNotFoundException(params.id, ProductType.class.toString())
        }
        if (Product.countByProductType(productType)) {
            response.status = HttpStatus.BAD_REQUEST.value()
            render([errorCode: HttpStatus.BAD_REQUEST.value(),
                    errorMessage: "${warehouse.message(code: 'productType.deleteWithExistingProducts.message', default: 'Cannot delete product type with existing products')}"] as JSON)
            return
        }
        try {
            // Flush so referential-integrity failures surface here instead of
            // at transaction commit (after the response has been rendered).
            productType.delete(flush: true)
        } catch (DataIntegrityViolationException ignored) {
            transactionStatus.setRollbackOnly()
            String message = "${warehouse.message(code: 'default.not.deleted.message', args: [warehouse.message(code: 'productType.label', default: 'ProductType'), params.id])}"
            response.status = HttpStatus.BAD_REQUEST.value()
            render([errorCode: HttpStatus.BAD_REQUEST.value(), errorMessage: message] as JSON)
            return
        }
        render status: HttpStatus.NO_CONTENT.value()
    }

    private static Map toJson(ProductType productType) {
        [
                id                     : productType.id,
                name                   : productType.name,
                code                   : productType.code,
                productTypeCode        : productType.productTypeCode?.name(),
                productIdentifierFormat: productType.productIdentifierFormat,
                sequenceNumber         : productType.sequenceNumber,
                supportedActivities    : (productType.supportedActivities ?: []).collect { it.name() }.sort(),
                requiredFields         : (productType.requiredFields ?: []).collect { it.name() }.sort(),
                displayedFields        : (productType.displayedFields ?: []).collect { it.name() }.sort(),
                dateCreated            : productType.dateCreated,
                lastUpdated            : productType.lastUpdated,
        ]
    }
}
