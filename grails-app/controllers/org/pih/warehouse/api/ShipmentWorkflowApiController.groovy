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

import org.pih.warehouse.shipping.ShipmentType
import org.pih.warehouse.shipping.ShipmentWorkflow

/**
 * REST endpoints backing the React screen that replaced the legacy
 * shipmentWorkflow/create scaffold GSP (Phase 2, Batch 23).
 */
@Transactional
class ShipmentWorkflowApiController {

    def list() {
        Integer max = Math.min(params.max ? params.int('max') : 10, 100)
        Integer offset = params.offset ? params.int('offset') : 0
        def results = ShipmentWorkflow.createCriteria().list(max: max, offset: offset) {
            order("dateCreated", "asc")
        }
        render([data: results.collect { toJson(it) }, totalCount: results.totalCount] as JSON)
    }

    def create() {
        ShipmentWorkflow shipmentWorkflow = new ShipmentWorkflow()
        bindShipmentWorkflow(shipmentWorkflow, request.JSON)
        if (shipmentWorkflow.hasErrors() || !shipmentWorkflow.save(flush: true)) {
            throw new ValidationException("Invalid shipment workflow", shipmentWorkflow.errors)
        }
        response.status = HttpStatus.CREATED.value()
        render([data: toJson(shipmentWorkflow)] as JSON)
    }

    private void bindShipmentWorkflow(ShipmentWorkflow shipmentWorkflow, jsonObject) {
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
    }

    private static Map toJson(ShipmentWorkflow shipmentWorkflow) {
        [
                id              : shipmentWorkflow.id,
                name            : shipmentWorkflow.name,
                shipmentType    : shipmentWorkflow.shipmentType ? [
                        id  : shipmentWorkflow.shipmentType.id,
                        name: shipmentWorkflow.shipmentType.name,
                ] : null,
                excludedFields  : shipmentWorkflow.excludedFields,
                documentTemplate: shipmentWorkflow.documentTemplate,
                dateCreated     : shipmentWorkflow.dateCreated,
                lastUpdated     : shipmentWorkflow.lastUpdated,
        ]
    }
}
