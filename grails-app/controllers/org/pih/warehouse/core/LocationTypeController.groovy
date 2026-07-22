/**
* Copyright (c) 2012 Partners In Health.  All rights reserved.
* The use and distribution terms for this software are covered by the
* Eclipse Public License 1.0 (http://opensource.org/licenses/eclipse-1.0.php)
* which can be found in the file epl-v10.html at the root of this distribution.
* By using this software in any fashion, you are agreeing to be bound by
* the terms of this license.
* You must not remove this notice, or any other, from this software.
**/
package org.pih.warehouse.core

class LocationTypeController {

    LocationTypeDataService locationTypeDataService

    static allowedMethods = [delete: "POST"]

    def index() {
        redirect(action: "list", params: params)
    }

    def list() {
        params.max = Math.min(params.max ? params.int('max') : 10, 100)
        [locationTypeInstanceList: LocationType.list(params), locationTypeInstanceTotal: LocationType.count()]
    }

    def create() {
        render(view: "/common/react", params: params)
    }

    def show() {
        LocationType locationTypeInstance = locationTypeDataService.get(params.id)
        if (!locationTypeInstance) {
            flash.message = "${warehouse.message(code: 'default.not.found.message', args: [warehouse.message(code: 'locationType.label', default: 'LocationType'), params.id])}"
            redirect(action: "list")
        }
        else {
            [locationTypeInstance: locationTypeInstance]
        }
    }

    def edit() {
        // The legacy show screen posts to this action with the id as a request
        // parameter; redirect so the id lands in the path for the React route.
        if (request.method == "POST" && params.id) {
            redirect(action: "edit", id: params.id)
            return
        }
        render(view: "/common/react", params: params)
    }

    def delete() {
        LocationType locationTypeInstance = locationTypeDataService.get(params.id)
        if (locationTypeInstance) {
            try {
                locationTypeDataService.delete(locationTypeInstance.id)
                flash.message = "${warehouse.message(code: 'default.deleted.message', args: [warehouse.message(code: 'locationType.label', default: 'LocationType'), params.id])}"
                redirect(action: "list")
            }
            catch (org.springframework.dao.DataIntegrityViolationException e) {
                flash.message = "${warehouse.message(code: 'default.not.deleted.message', args: [warehouse.message(code: 'locationType.label', default: 'LocationType'), params.id])}"
                redirect(action: "list", id: params.id)
            }
        }
        else {
            flash.message = "${warehouse.message(code: 'default.not.found.message', args: [warehouse.message(code: 'locationType.label', default: 'LocationType'), params.id])}"
            redirect(action: "list")
        }
    }
}
