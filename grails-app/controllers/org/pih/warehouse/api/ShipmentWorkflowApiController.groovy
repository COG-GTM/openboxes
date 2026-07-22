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
import org.springframework.http.HttpStatus

import org.pih.warehouse.core.Document
import org.pih.warehouse.core.DocumentCode
import org.pih.warehouse.core.DocumentType
import org.pih.warehouse.shipping.ContainerType
import org.pih.warehouse.shipping.ReferenceNumberType
import org.pih.warehouse.shipping.ShipmentType
import org.pih.warehouse.shipping.ShipmentWorkflow

/**
 * REST endpoints backing the migrated shipmentWorkflow list/show/edit
 * screens (mirrors the legacy ShipmentWorkflowController scaffold actions).
 */
class ShipmentWorkflowApiController {

    /**
     * Mirrors the legacy ShipmentWorkflowController.list action (paginated
     * scaffold list).
     */
    def list() {
        params.max = Math.min(params.int('max') ?: 10, 100)
        params.offset = params.int('offset') ?: 0
        params.sort = params.sort ?: "name"
        params.order = params.order ?: "asc"
        List<ShipmentWorkflow> shipmentWorkflows = ShipmentWorkflow.list(params)
        render([data: shipmentWorkflows.collect { toJson(it) }, totalCount: ShipmentWorkflow.count()] as JSON)
    }

    /**
     * Mirrors the legacy ShipmentWorkflowController.save action (used by the
     * migrated shipmentWorkflow/create screen, Phase 2 Batch 23).
     */
    @Transactional
    def create() {
        ShipmentWorkflow shipmentWorkflow = new ShipmentWorkflow()
        def jsonObject = request.JSON
        if (jsonObject.containsKey("name")) {
            shipmentWorkflow.name = jsonObject.name ?: null
        }
        if (jsonObject.containsKey("shipmentType")) {
            String shipmentTypeId = jsonObject.shipmentType instanceof Map
                    ? jsonObject.shipmentType.id
                    : jsonObject.shipmentType
            shipmentWorkflow.shipmentType = shipmentTypeId ? ShipmentType.get(shipmentTypeId) : null
        }
        if (jsonObject.containsKey("excludedFields")) {
            shipmentWorkflow.excludedFields = jsonObject.excludedFields ?: null
        }
        if (jsonObject.containsKey("documentTemplate")) {
            shipmentWorkflow.documentTemplate = jsonObject.documentTemplate ?: null
        }
        shipmentWorkflow.validate()
        if (shipmentWorkflow.hasErrors() || !shipmentWorkflow.save(flush: true)) {
            throw new ValidationException("Invalid shipment workflow", shipmentWorkflow.errors)
        }
        response.status = HttpStatus.CREATED.value()
        render([data: toJson(shipmentWorkflow)] as JSON)
    }

    def read() {
        ShipmentWorkflow shipmentWorkflow = ShipmentWorkflow.get(params.id)
        if (!shipmentWorkflow) {
            response.status = HttpStatus.NOT_FOUND.value()
            render([errorCode: HttpStatus.NOT_FOUND.value(), errorMessage: "Shipment workflow ${params.id} not found"] as JSON)
            return
        }
        render([data: toJson(shipmentWorkflow)] as JSON)
    }

    /**
     * Mirrors the legacy ShipmentWorkflowController.update action, including
     * the optimistic locking check.
     */
    @Transactional
    def update() {
        ShipmentWorkflow shipmentWorkflow = ShipmentWorkflow.get(params.id)
        if (!shipmentWorkflow) {
            response.status = HttpStatus.NOT_FOUND.value()
            render([errorCode: HttpStatus.NOT_FOUND.value(), errorMessage: "Shipment workflow ${params.id} not found"] as JSON)
            return
        }
        def jsonObject = request.JSON
        if (jsonObject.version != null && shipmentWorkflow.version > (jsonObject.version as Long)) {
            response.status = HttpStatus.CONFLICT.value()
            render([errorCode: HttpStatus.CONFLICT.value(),
                    errorMessage: "Another user has updated this shipment workflow while you were editing"] as JSON)
            return
        }
        shipmentWorkflow.name = jsonObject.containsKey("name") ? jsonObject.name : shipmentWorkflow.name
        shipmentWorkflow.excludedFields = jsonObject.containsKey("excludedFields") ? (jsonObject.excludedFields ?: null) : shipmentWorkflow.excludedFields
        shipmentWorkflow.documentTemplate = jsonObject.containsKey("documentTemplate") ? (jsonObject.documentTemplate ?: null) : shipmentWorkflow.documentTemplate
        if (jsonObject.containsKey("shipmentType")) {
            shipmentWorkflow.shipmentType = jsonObject.shipmentType?.id ? ShipmentType.get(jsonObject.shipmentType.id) : null
        }
        if (jsonObject.containsKey("referenceNumberTypes")) {
            shipmentWorkflow.referenceNumberTypes?.clear()
            jsonObject.referenceNumberTypes?.each { rnt ->
                ReferenceNumberType referenceNumberType = ReferenceNumberType.get(rnt instanceof Map ? rnt.id : rnt)
                if (referenceNumberType) {
                    shipmentWorkflow.addToReferenceNumberTypes(referenceNumberType)
                }
            }
        }
        if (jsonObject.containsKey("containerTypes")) {
            shipmentWorkflow.containerTypes?.clear()
            jsonObject.containerTypes?.each { ct ->
                ContainerType containerType = ContainerType.get(ct instanceof Map ? ct.id : ct)
                if (containerType) {
                    shipmentWorkflow.addToContainerTypes(containerType)
                }
            }
        }
        if (jsonObject.containsKey("documentTemplates")) {
            shipmentWorkflow.documentTemplates?.clear()
            jsonObject.documentTemplates?.each { dt ->
                Document document = Document.get(dt instanceof Map ? dt.id : dt)
                if (document) {
                    shipmentWorkflow.addToDocumentTemplates(document)
                }
            }
        }
        if (shipmentWorkflow.hasErrors() || !shipmentWorkflow.save(flush: true)) {
            transactionStatus.setRollbackOnly()
            response.status = HttpStatus.BAD_REQUEST.value()
            render([errorCode: HttpStatus.BAD_REQUEST.value(), errorMessage: "Validation errors",
                    errors: shipmentWorkflow.errors.allErrors.collect { g.message(error: it) }] as JSON)
            return
        }
        render([data: toJson(shipmentWorkflow)] as JSON)
    }

    /**
     * Mirrors the legacy ShipmentWorkflowController.delete action.
     */
    @Transactional
    def delete() {
        ShipmentWorkflow shipmentWorkflow = ShipmentWorkflow.get(params.id)
        if (!shipmentWorkflow) {
            response.status = HttpStatus.NOT_FOUND.value()
            render([errorCode: HttpStatus.NOT_FOUND.value(), errorMessage: "Shipment workflow ${params.id} not found"] as JSON)
            return
        }
        try {
            shipmentWorkflow.delete(flush: true)
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            transactionStatus.setRollbackOnly()
            response.status = HttpStatus.BAD_REQUEST.value()
            render([errorCode: HttpStatus.BAD_REQUEST.value(),
                    errorMessage: "Shipment workflow ${params.id} could not be deleted"] as JSON)
            return
        }
        render status: HttpStatus.NO_CONTENT.value()
    }

    /**
     * Option lists for the migrated edit form: shipment types, reference
     * number types, container types and the shipping/invoice template
     * documents (mirrors ShipmentWorkflowController.getDocumentTemplates).
     */
    def options() {
        List<DocumentType> documentTypes = DocumentType.findAllByDocumentCodeInList([DocumentCode.SHIPPING_TEMPLATE, DocumentCode.INVOICE_TEMPLATE])
        List<Document> documentTemplates = documentTypes ? Document.findAllByDocumentTypeInList(documentTypes) : []
        render([data: [
                shipmentTypes       : ShipmentType.list().collect { [id: it.id, value: it.id, label: it.name] },
                referenceNumberTypes: ReferenceNumberType.list().collect { [id: it.id, value: it.id, label: it.name] },
                containerTypes      : ContainerType.list().collect { [id: it.id, value: it.id, label: it.name] },
                documentTemplates   : documentTemplates.collect { [id: it.id, value: it.id, label: it.name] },
        ]] as JSON)
    }

    private static Map toJson(ShipmentWorkflow shipmentWorkflow) {
        [
                id                  : shipmentWorkflow.id,
                version             : shipmentWorkflow.version,
                name                : shipmentWorkflow.name,
                shipmentType        : shipmentWorkflow.shipmentType ? [
                        id  : shipmentWorkflow.shipmentType.id,
                        name: shipmentWorkflow.shipmentType.name,
                ] : null,
                excludedFields      : shipmentWorkflow.excludedFields,
                documentTemplate    : shipmentWorkflow.documentTemplate,
                dateCreated         : shipmentWorkflow.dateCreated,
                lastUpdated         : shipmentWorkflow.lastUpdated,
                referenceNumberTypes: shipmentWorkflow.referenceNumberTypes?.collect {
                    [id: it.id, name: it.name]
                } ?: [],
                containerTypes      : shipmentWorkflow.containerTypes?.collect {
                    [id: it.id, name: it.name]
                } ?: [],
                documentTemplates   : shipmentWorkflow.documentTemplates?.collect {
                    [id: it.id, name: it.name]
                } ?: [],
        ]
    }
}
