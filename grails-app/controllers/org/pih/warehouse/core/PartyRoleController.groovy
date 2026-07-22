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

import grails.gorm.transactions.Transactional

@Transactional
class PartyRoleController {

    static allowedMethods = [delete: "POST"]

    def index() {
        redirect(action: "list", params: params)
    }

    def list() {
        params.max = Math.min(params.max ? params.int('max') : 10, 100)
        [partyRoleInstanceList: PartyRole.list(params), partyRoleInstanceTotal: PartyRole.count()]
    }

    def create() {
        render(view: "/common/react", params: params)
    }

    def show() {
        def partyRoleInstance = PartyRole.get(params.id)
        if (!partyRoleInstance) {
            flash.message = "${warehouse.message(code: 'default.not.found.message', args: [warehouse.message(code: 'partyRole.label', default: 'PartyRole'), params.id])}"
            redirect(action: "list")
        } else {
            [partyRoleInstance: partyRoleInstance]
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
        def partyRoleInstance = PartyRole.get(params.id)
        if (partyRoleInstance) {
            try {
                partyRoleInstance.delete(flush: true)
                flash.message = "${warehouse.message(code: 'default.deleted.message', args: [warehouse.message(code: 'partyRole.label', default: 'PartyRole'), params.id])}"
                redirect(action: "list")
            }
            catch (org.springframework.dao.DataIntegrityViolationException e) {
                flash.message = "${warehouse.message(code: 'default.not.deleted.message', args: [warehouse.message(code: 'partyRole.label', default: 'PartyRole'), params.id])}"
                redirect(action: "list", id: params.id)
            }
        } else {
            flash.message = "${warehouse.message(code: 'default.not.found.message', args: [warehouse.message(code: 'partyRole.label', default: 'PartyRole'), params.id])}"
            redirect(action: "list")
        }
    }
}
