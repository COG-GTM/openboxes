package org.pih.warehouse.api

import grails.converters.JSON
import org.pih.warehouse.core.Constants
import org.pih.warehouse.order.Order
import org.pih.warehouse.picklist.Picklist
import org.pih.warehouse.picklist.PicklistService
import org.pih.warehouse.requisition.Requisition

class PicklistApiController extends BaseDomainApiController {

    PicklistService picklistService

    def clearPicklist() {
        picklistService.clearPicklist(params.id)

        render status: 204
    }

    /**
     * Mirrors the legacy PicklistController.save JSON endpoint (used by the
     * migrated requisition/process screen to save the picklist).
     */
    def save() {
        def jsonRequest = request.JSON
        def picklist = picklistService.save(jsonRequest)
        if (!picklist || picklist.hasErrors()) {
            response.status = 400
            render([errorCode: 400, errorMessage: "Validation errors",
                    errors: picklist?.errors?.allErrors?.collect { it.toString() } ?: []] as JSON)
            return
        }
        render([data: picklist.toJson()] as JSON)
    }

    /**
     * Data backing the migrated picklist print screen (legacy picklist/print GSP).
     */
    def print() {
        Requisition requisition = Requisition.get(params.id)
        if (!requisition) {
            response.status = 404
            render([errorCode: 404, errorMessage: "Requisition ${params.id} not found"] as JSON)
            return
        }
        Picklist picklist = Picklist.findByRequisition(requisition)
        def data = [
                requisition: [
                        id           : requisition.id,
                        requestNumber: requisition.requestNumber,
                        name         : requisition.name,
                        type         : requisition.type?.name(),
                        origin       : requisition.origin ? [id: requisition.origin.id, name: requisition.origin.name] : null,
                        destination  : requisition.destination ? [id: requisition.destination.id, name: requisition.destination.name] : null,
                        dateRequested: requisition.dateRequested?.format(Constants.DEFAULT_DATE_TIME_FORMAT),
                        dateCreated  : requisition.dateCreated?.format(Constants.DEFAULT_DATE_TIME_FORMAT),
                        dateVerified : requisition.dateVerified?.format(Constants.DEFAULT_DATE_TIME_FORMAT),
                        dateChecked  : requisition.dateChecked?.format(Constants.DEFAULT_DATE_TIME_FORMAT),
                        requestedBy  : requisition.requestedBy ? [id: requisition.requestedBy.id, name: requisition.requestedBy.name] : null,
                        createdBy    : requisition.createdBy ? [id: requisition.createdBy.id, name: requisition.createdBy.name] : null,
                        verifiedBy   : requisition.verifiedBy ? [id: requisition.verifiedBy.id, name: requisition.verifiedBy.name] : null,
                        checkedBy    : requisition.checkedBy ? [id: requisition.checkedBy.id, name: requisition.checkedBy.name] : null,
                ],
                picklist   : picklist ? [
                        id        : picklist.id,
                        picker    : picklist.picker ? [id: picklist.picker.id, name: picklist.picker.name] : null,
                        datePicked: picklist.datePicked?.format(Constants.DEFAULT_DATE_TIME_FORMAT),
                ] : null,
                requisitionItems: requisition.requisitionItems?.collect { item ->
                    [
                            id                 : item.id,
                            status             : item.status?.name(),
                            quantity           : item.quantity ?: 0,
                            isCanceled         : item.isCanceled() ? true : false,
                            isChanged          : item.isChanged() ? true : false,
                            product            : [
                                    id                 : item.product?.id,
                                    productCode        : item.product?.productCode,
                                    name               : item.product?.displayNameOrDefaultName,
                                    unitOfMeasure      : item.product?.unitOfMeasure,
                                    coldChain          : item.product?.coldChain ? true : false,
                                    controlledSubstance: item.product?.controlledSubstance ? true : false,
                                    hazardousMaterial  : item.product?.hazardousMaterial ? true : false,
                            ],
                            parentRequisitionItem: item.parentRequisitionItem ? [
                                    isSubstituted: item.parentRequisitionItem.isSubstituted() ? true : false,
                                    isChanged    : item.parentRequisitionItem.isChanged() ? true : false,
                                    quantity     : item.parentRequisitionItem.quantity ?: 0,
                                    product      : [
                                            productCode  : item.parentRequisitionItem.product?.productCode,
                                            name         : item.parentRequisitionItem.product?.displayNameOrDefaultName,
                                            unitOfMeasure: item.parentRequisitionItem.product?.unitOfMeasure,
                                    ],
                            ] : null,
                            picklistItems      : item.retrievePicklistItems()?.collect { picklistItem ->
                                [
                                        id            : picklistItem.id,
                                        quantity      : picklistItem.quantity ?: 0,
                                        sortOrder     : picklistItem.sortOrder,
                                        lotNumber     : picklistItem.inventoryItem?.lotNumber,
                                        expirationDate: picklistItem.inventoryItem?.expirationDate?.format(Constants.EXPIRATION_DATE_FORMAT),
                                        binLocation   : picklistItem.binLocation ? [
                                                id  : picklistItem.binLocation.id,
                                                name: picklistItem.binLocation.name,
                                                zone: picklistItem.binLocation.zone ? [
                                                        id  : picklistItem.binLocation.zone.id,
                                                        name: picklistItem.binLocation.zone.name,
                                                ] : null,
                                        ] : null,
                                ]
                            } ?: [],
                    ]
                } ?: [],
        ]
        render([data: data] as JSON)
    }

    /**
     * Data backing the migrated return picklist print screen (legacy picklist/returnPrint GSP).
     */
    def returnPrint() {
        Order order = Order.get(params.id)
        if (!order) {
            response.status = 404
            render([errorCode: 404, errorMessage: "Order ${params.id} not found"] as JSON)
            return
        }
        Picklist picklist = Picklist.findByOrder(order)
        def data = [
                order   : [
                        id         : order.id,
                        orderNumber: order.orderNumber,
                        name       : order.name,
                        origin     : order.origin ? [id: order.origin.id, name: order.origin.name] : null,
                        destination: order.destination ? [id: order.destination.id, name: order.destination.name] : null,
                        dateOrdered: order.dateOrdered?.format(Constants.DEFAULT_DATE_TIME_FORMAT),
                        dateCreated: order.dateCreated?.format(Constants.DEFAULT_DATE_TIME_FORMAT),
                        orderedBy  : order.orderedBy ? [id: order.orderedBy.id, name: order.orderedBy.name] : null,
                        createdBy  : order.createdBy ? [id: order.createdBy.id, name: order.createdBy.name] : null,
                ],
                picklist: picklist ? [
                        id        : picklist.id,
                        picker    : picklist.picker ? [id: picklist.picker.id, name: picklist.picker.name] : null,
                        datePicked: picklist.datePicked?.format(Constants.DEFAULT_DATE_TIME_FORMAT),
                ] : null,
                orderItems: order.orderItems?.collect { item ->
                    [
                            id           : item.id,
                            quantity     : item.quantity ?: 0,
                            product      : [
                                    id                 : item.product?.id,
                                    productCode        : item.product?.productCode,
                                    name               : item.product?.displayNameOrDefaultName,
                                    unitOfMeasure      : item.product?.unitOfMeasure,
                                    coldChain          : item.product?.coldChain ? true : false,
                                    controlledSubstance: item.product?.controlledSubstance ? true : false,
                                    hazardousMaterial  : item.product?.hazardousMaterial ? true : false,
                            ],
                            picklistItems: item.retrievePicklistItems()?.collect { picklistItem ->
                                [
                                        id            : picklistItem.id,
                                        quantity      : picklistItem.quantity ?: 0,
                                        sortOrder     : picklistItem.sortOrder,
                                        lotNumber     : picklistItem.inventoryItem?.lotNumber,
                                        expirationDate: picklistItem.inventoryItem?.expirationDate?.format(Constants.EXPIRATION_DATE_FORMAT),
                                        binLocation   : picklistItem.binLocation ? [
                                                id  : picklistItem.binLocation.id,
                                                name: picklistItem.binLocation.name,
                                                zone: picklistItem.binLocation.zone ? [
                                                        id  : picklistItem.binLocation.zone.id,
                                                        name: picklistItem.binLocation.zone.name,
                                                ] : null,
                                        ] : null,
                                ]
                            } ?: [],
                    ]
                } ?: [],
        ]
        render([data: data] as JSON)
    }
}
