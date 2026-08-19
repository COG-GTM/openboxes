/**
 * Copyright (c) 2012 Partners In Health.  All rights reserved.
 * The use and distribution terms for this software are covered by the
 * Eclipse Public License 1.0 (http://opensource.org/licenses/eclipse-1.0.php)
 * which can be found in the file epl-v10.html at the root of this distribution.
 * By using this software in any fashion, you are agreeing to be bound by
 * the terms of this license.
 **/
package org.pih.warehouse.api

import grails.converters.JSON
import grails.validation.Validateable
import grails.validation.ValidationException
import org.pih.warehouse.core.Location
import org.pih.warehouse.shipping.ShipmentExceptionService

class ShipmentExceptionApiController {

    ShipmentExceptionService shipmentExceptionService

    def overdue(ShipmentExceptionCommand command) {
        if (!command.validate()) {
            throw new ValidationException("Invalid filters", command.errors)
        }

        Location warehouse = Location.get(session.warehouse?.id)
        if (!warehouse) {
            command.errors.reject("warehouse", "A warehouse must be selected")
            throw new ValidationException("A warehouse must be selected", command.errors)
        }

        Map result = shipmentExceptionService.getOverdueInboundShipments(warehouse, command)
        render(result as JSON)
    }
}

class ShipmentExceptionCommand implements Validateable {

    String origin
    String destination
    Integer minDaysLate = 1
    String sort = "daysLate"
    String order = "desc"
    Integer max = 50
    Integer offset = 0

    static constraints = {
        minDaysLate(min: 1)
        max(min: 0, max: 500)
        offset(min: 0)
        sort(validator: { value, command ->
            value in ["daysLate", "expectedDeliveryDate", "shipmentNumber", "origin", "destination"] ? true : ["invalid"]
        })
        order(validator: { value, command ->
            value in ["asc", "desc"] ? true : ["invalid"]
        })
    }
}
