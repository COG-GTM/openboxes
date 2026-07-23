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

class CreateShipmentWorkflowController {

    def index() {
        log.info "CreateShipmentWorkflowController.index() -> " + params
        redirect(action: 'details', params: params.type ? [type: params.type] : [:])
    }

    // React screens that replaced the legacy createShipment webflow GSPs.
    def details() {
        render(view: "/common/react")
    }

    def tracking() {
        render(view: "/common/react")
    }

    def packing() {
        render(view: "/common/react")
    }

    def picking() {
        render(view: "/common/react")
    }

    def sending() {
        render(view: "/common/react")
    }
}
