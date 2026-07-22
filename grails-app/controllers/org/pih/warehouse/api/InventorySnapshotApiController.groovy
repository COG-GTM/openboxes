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
import org.pih.warehouse.core.Location
import org.pih.warehouse.inventory.InventorySnapshotService

import java.text.DateFormat
import java.text.SimpleDateFormat

class InventorySnapshotApiController {

    InventorySnapshotService inventorySnapshotService

    def list() {
        Location location = Location.get(params["location.id"] ?: session?.warehouse?.id)
        if (!location) {
            response.status = 400
            render([errorMessage: "Cannot list inventory snapshots without a location - sign in or provide location.id as a request parameter"] as JSON)
            return
        }
        Date date
        try {
            DateFormat dateFormat = new SimpleDateFormat("MM/dd/yyyy")
            date = params.date ? dateFormat.parse(params.date) : new Date()
        } catch (Exception e) {
            response.status = 400
            render([errorMessage: "Invalid date '${params.date}' - expected MM/dd/yyyy"] as JSON)
            return
        }
        date.clearTime()

        List rows = inventorySnapshotService.findInventorySnapshotByDateAndLocation(date, location)
        render([data: rows.collect {
            [
                    location      : it.location,
                    productCode   : it.productCode,
                    product       : it.product,
                    productGroup  : it.productGroup,
                    category      : it.category,
                    tags          : it.tags,
                    quantityOnHand: it.quantityOnHand,
                    unitOfMeasure : it.unitOfMeasure,
            ]
        }] as JSON)
    }
}
