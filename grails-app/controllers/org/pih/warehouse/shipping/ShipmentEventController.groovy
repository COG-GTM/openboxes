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
import org.pih.warehouse.core.Event

@Transactional
class ShipmentEventController {

    static allowedMethods = [save: "POST", update: "POST", delete: "POST"]

    def index() {
        redirect(action: "list", params: params)
    }

    def list() {
        params.max = Math.min(params.max ? params.int('max') : 10, 100)
        [shipmentEventInstanceList: ShipmentEvent.list(params), shipmentEventInstanceTotal: ShipmentEvent.count()]
    }

    def create() {
        def shipmentEventInstance = new Event()
        shipmentEventInstance.properties = params
        return [shipmentEventInstance: shipmentEventInstance]
    }

    def show() {
        def shipmentEventInstance = Event.get(params.id)
        if (!shipmentEventInstance) {
            flash.message = "${warehouse.message(code: 'default.not.found.message', args: [warehouse.message(code: 'shipmentEvent.label', default: 'ShipmentEvent'), params.id])}"
            redirect(action: "list")
        } else {
            [shipmentEventInstance: shipmentEventInstance]
        }
    }

    def edit() {
        def shipmentEventInstance = Event.get(params.id)
        if (!shipmentEventInstance) {
            flash.message = "${warehouse.message(code: 'default.not.found.message', args: [warehouse.message(code: 'shipmentEvent.label', default: 'ShipmentEvent'), params.id])}"
            redirect(action: "list")
        } else {
            return [shipmentEventInstance: shipmentEventInstance]
        }
    }

    def delete() {
        def shipmentEventInstance = ShipmentEvent.get(params.id)
        if (shipmentEventInstance) {
            try {
                shipmentEventInstance.delete(flush: true)
                flash.message = "${warehouse.message(code: 'default.deleted.message', args: [warehouse.message(code: 'shipmentEvent.label', default: 'ShipmentEvent'), params.id])}"
                redirect(action: "list")
            }
            catch (org.springframework.dao.DataIntegrityViolationException e) {
                flash.message = "${warehouse.message(code: 'default.not.deleted.message', args: [warehouse.message(code: 'shipmentEvent.label', default: 'ShipmentEvent'), params.id])}"
                redirect(action: "show", id: params.id)
            }
        } else {
            flash.message = "${warehouse.message(code: 'default.not.found.message', args: [warehouse.message(code: 'shipmentEvent.label', default: 'ShipmentEvent'), params.id])}"
            redirect(action: "list")
        }
    }
}
