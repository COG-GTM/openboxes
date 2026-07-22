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
import grails.validation.ValidationException
import org.pih.warehouse.core.Location
import org.pih.warehouse.product.Product
import org.pih.warehouse.product.ProductPackage
import org.pih.warehouse.requisition.RequisitionItem

@Transactional
class RequisitionItemApiController extends BaseApiController {

    // Fields mutated by the RequisitionItem business methods (changeQuantity,
    // chooseSubstitute, cancelQuantity, undoChanges). Mutations made inside a
    // domain method after validate() are not seen by GORM's dirty checking,
    // so mark them dirty explicitly before saving.
    private static final List<String> MUTATED_FIELDS = [
            "quantityApproved", "quantityCanceled", "cancelReasonCode",
            "cancelComments", "modificationItem", "substitutionItem",
    ].asImmutable()

    private static void saveChanges(RequisitionItem requisitionItem) {
        MUTATED_FIELDS.each { requisitionItem.markDirty(it) }
        requisitionItem.save(flush: true, failOnError: true)
    }

    def inventoryService

    /**
     * Data backing the migrated requisitionItem/change screen (legacy
     * RequisitionItemController.change action).
     */
    def read() {
        RequisitionItem requisitionItem = RequisitionItem.get(params.id)
        if (!requisitionItem) {
            response.status = 404
            render([errorCode: 404, errorMessage: "Requisition item ${params.id} not found"] as JSON)
            return
        }
        Location location = Location.get(session.warehouse.id)
        def quantityOnHand = inventoryService.getQuantityOnHand(location, requisitionItem.product) ?: 0
        def quantityOutgoing = inventoryService.getQuantityToShip(location, requisitionItem.product) ?: 0
        def quantityAvailableToPromise = (quantityOnHand - quantityOutgoing) ?: 0
        render([data: getDetails(requisitionItem) + [
                quantityOnHand            : quantityOnHand,
                quantityAvailableToPromise: quantityAvailableToPromise,
                productPackages           : requisitionItem.product?.packages?.collect { ProductPackage productPackage ->
                    [
                            id      : productPackage.id,
                            uomCode : productPackage.uom?.code,
                            quantity: productPackage.quantity,
                    ]
                } ?: [],
        ]] as JSON)
    }

    /**
     * Mirrors the legacy RequisitionItemController.changeQuantity action.
     */
    def changeQuantity() {
        RequisitionItem requisitionItem = RequisitionItem.get(params.id)
        if (!requisitionItem) {
            response.status = 404
            render([errorCode: 404, errorMessage: "Requisition item ${params.id} not found"] as JSON)
            return
        }
        def jsonObject = request.JSON
        ProductPackage productPackage = jsonObject.productPackageId ?
                ProductPackage.get(jsonObject.productPackageId) : null
        try {
            requisitionItem.changeQuantity(jsonObject.quantity as Integer, productPackage,
                    jsonObject.reasonCode as String, jsonObject.comments as String)
            saveChanges(requisitionItem)
        } catch (ValidationException e) {
            response.status = 400
            render([errorCode: 400, errorMessage: "Validation errors",
                    errors: e.errors.allErrors.collect { g.message(error: it) }] as JSON)
            return
        }
        render([data: getDetails(requisitionItem)] as JSON)
    }

    /**
     * Mirrors the legacy RequisitionItemController.chooseSubstitute action.
     */
    def substitute() {
        RequisitionItem requisitionItem = RequisitionItem.get(params.id)
        if (!requisitionItem) {
            response.status = 404
            render([errorCode: 404, errorMessage: "Requisition item ${params.id} not found"] as JSON)
            return
        }
        def jsonObject = request.JSON
        Product product = jsonObject.productId ? Product.get(jsonObject.productId) : null
        if (!product) {
            response.status = 400
            render([errorCode: 400, errorMessage: "Must choose a substitution"] as JSON)
            return
        }
        ProductPackage productPackage = jsonObject.productPackageId ?
                ProductPackage.get(jsonObject.productPackageId) : null
        try {
            requisitionItem.chooseSubstitute(product, productPackage, jsonObject.quantity as Integer,
                    jsonObject.reasonCode as String, jsonObject.comments as String)
            saveChanges(requisitionItem)
        } catch (ValidationException e) {
            response.status = 400
            render([errorCode: 400, errorMessage: "Validation errors",
                    errors: e.errors.allErrors.collect { g.message(error: it) }] as JSON)
            return
        }
        render([data: getDetails(requisitionItem)] as JSON)
    }

    /**
     * Mirrors the legacy RequisitionItemController.cancelQuantity action.
     */
    def cancel() {
        RequisitionItem requisitionItem = RequisitionItem.get(params.id)
        if (!requisitionItem) {
            response.status = 404
            render([errorCode: 404, errorMessage: "Requisition item ${params.id} not found"] as JSON)
            return
        }
        def jsonObject = request.JSON
        try {
            requisitionItem.cancelQuantity(jsonObject.reasonCode as String, jsonObject.comments as String)
            saveChanges(requisitionItem)
        } catch (ValidationException e) {
            response.status = 400
            render([errorCode: 400, errorMessage: "Validation errors",
                    errors: e.errors.allErrors.collect { g.message(error: it) }] as JSON)
            return
        }
        render([data: getDetails(requisitionItem)] as JSON)
    }

    /**
     * Mirrors the legacy RequisitionItemController.undoChanges action.
     */
    def undoChanges() {
        RequisitionItem requisitionItem = RequisitionItem.get(params.id)
        if (!requisitionItem) {
            response.status = 404
            render([errorCode: 404, errorMessage: "Requisition item ${params.id} not found"] as JSON)
            return
        }
        requisitionItem.undoChanges()
        saveChanges(requisitionItem)
        render([data: getDetails(requisitionItem)] as JSON)
    }

    private Map getDetails(RequisitionItem requisitionItem) {
        return [
                id              : requisitionItem.id,
                status          : requisitionItem.status?.name(),
                quantity        : requisitionItem.quantity ?: 0,
                quantityApproved: requisitionItem.quantityApproved ?: 0,
                quantityCanceled: requisitionItem.quantityCanceled ?: 0,
                cancelReasonCode: requisitionItem.cancelReasonCode,
                cancelComments  : requisitionItem.cancelComments,
                isChanged       : requisitionItem.isChanged() ? true : false,
                isSubstituted   : requisitionItem.isSubstituted() ? true : false,
                isCanceled      : requisitionItem.isCanceled() ? true : false,
                product         : [
                        id           : requisitionItem.product?.id,
                        productCode  : requisitionItem.product?.productCode,
                        name         : requisitionItem.product?.name,
                        unitOfMeasure: requisitionItem.product?.unitOfMeasure,
                ],
                productPackage  : requisitionItem.productPackage ? [
                        id      : requisitionItem.productPackage.id,
                        uomCode : requisitionItem.productPackage.uom?.code,
                        quantity: requisitionItem.productPackage.quantity,
                ] : null,
                requisition     : [
                        id           : requisitionItem.requisition?.id,
                        requestNumber: requisitionItem.requisition?.requestNumber,
                        name         : requisitionItem.requisition?.name,
                        status       : requisitionItem.requisition?.status?.name(),
                ],
                requisitionItems: requisitionItem.requisitionItems?.collect { childItem ->
                    [
                            id      : childItem.id,
                            quantity: childItem.quantity ?: 0,
                            product : [
                                    id           : childItem.product?.id,
                                    productCode  : childItem.product?.productCode,
                                    name         : childItem.product?.name,
                                    unitOfMeasure: childItem.product?.unitOfMeasure,
                            ],
                    ]
                } ?: [],
        ]
    }
}
