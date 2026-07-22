/**
 * Copyright (c) 2012 Partners In Health.  All rights reserved.
 * The use and distribution terms for this software are covered by the
 * Eclipse Public License 1.0 (http://opensource.org/licenses/eclipse-1.0.php)
 * which can be found in the file epl-v10.html at the root of this distribution.
 * By using this software in any fashion, you are agreeing to be bound by
 * the terms of this license.
 * You must not remove this notice, or any other, from this software.
 **/
package org.pih.warehouse.shipping

import grails.gorm.transactions.Transactional
import org.pih.warehouse.core.Location

@Transactional
class ShipmentItemController {

    static allowedMethods = [save: "POST"]

    def inventoryService
    def shipmentService


    def index() {
        redirect(action: "list", params: params)
    }

    def list() {
        render(view: "/common/react", params: params)
    }

    def create() {
        def shipmentItemInstance = new ShipmentItem()
        shipmentItemInstance.properties = params
        return [shipmentItemInstance: shipmentItemInstance]
    }

    def save() {
        def shipmentItemInstance = new ShipmentItem(params)
        if (shipmentItemInstance.save(flush: true)) {
            flash.message = "${warehouse.message(code: 'default.created.message', args: [warehouse.message(code: 'shipmentItem.label', default: 'ShipmentItem'), shipmentItemInstance.id])}"
            redirect(action: "list", id: shipmentItemInstance.id)
        } else {
            render(view: "create", model: [shipmentItemInstance: shipmentItemInstance])
        }
    }

    def show() {
        render(view: "/common/react", params: params)
    }

    def edit() {
        render(view: "/common/react", params: params)
    }

    // The pick/split GSPs stay reachable for the legacy createShipment
    // webflow, whose pickShipmentItems screen loads them mid-flow as an
    // inline editor panel (an AJAX load without an execution key) and as
    // dialogs (with an execution key); direct visits get the React screen.
    def pick() {
        if (!params.execution && !request.xhr) {
            render(view: "/common/react", params: params)
            return
        }
        def shipmentItem = ShipmentItem.get(params.id)
        if (!shipmentItem) {
            flash.message = "${warehouse.message(code: 'default.not.found.message', args: [warehouse.message(code: 'shipmentItem.label', default: 'ShipmentItem'), params.id])}"
        } else {
            Location location = Location.load(session.warehouse.id)
            List binLocations = inventoryService.getProductQuantityByBinLocation(location, shipmentItem.product)
            List binLocationSelected = binLocations.findAll {
                it?.binLocation == shipmentItem?.binLocation && it.inventoryItem == shipmentItem?.inventoryItem
            }
            [shipmentItem: shipmentItem, binLocations: binLocations, binLocationSelected: binLocationSelected]
        }

    }

    def split() {
        log.info "Split " + params
        if (!params.execution && !request.xhr) {
            render(view: "/common/react", params: params)
            return
        }
        def shipmentItemInstance = ShipmentItem.get(params.id)
        if (!shipmentItemInstance) {
            flash.message = "${warehouse.message(code: 'default.not.found.message', args: [warehouse.message(code: 'shipmentItem.label', default: 'ShipmentItem'), params.id])}"
        } else {
            Location location = Location.load(session.warehouse.id)
            List binLocations = inventoryService.getProductQuantityByBinLocation(location, shipmentItemInstance.product)

            [shipmentItemInstance: shipmentItemInstance, binLocations: binLocations]
        }
    }

}
