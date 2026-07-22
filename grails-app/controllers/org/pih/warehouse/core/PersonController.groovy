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
class PersonController {
    def userService

    static allowedMethods = [delete: "POST"]

    def redirect() {
        redirect(action: "show", id: params.id)
    }

    def index() {
        redirect(action: "list", params: params)
    }

    def list() {
        render(view: "/common/react", params: params)
    }

    def create() {
        render(view: "/common/react", params: params)
    }

    def show() {
        render(view: "/common/react", params: params)
    }

    def edit() {
        render(view: "/common/react", params: params)
    }

    def delete() {
        def personInstance = Person.get(params.id)
        if (personInstance) {
            try {
                personInstance.delete(flush: true)
                flash.message = "${warehouse.message(code: 'default.deleted.message', args: [warehouse.message(code: 'person.label', default: 'Person'), params.id])}"
                redirect(action: "list")
            }
            catch (org.springframework.dao.DataIntegrityViolationException e) {
                flash.message = "${warehouse.message(code: 'default.not.deleted.message', args: [warehouse.message(code: 'person.label', default: 'Person'), params.id])}"
                redirect(action: "list", id: params.id)
            }
        }
        else {
            flash.message = "${warehouse.message(code: 'default.not.found.message', args: [warehouse.message(code: 'person.label', default: 'Person'), params.id])}"
            redirect(action: "list")
        }
    }

    def convertPersonToUser() {
        userService.convertPersonToUser(params.id)
        redirect(controller: "user", action: "edit", id: params.id)
    }

    def convertUserToPerson() {
        userService.convertUserToPerson(params.id)
        redirect(controller: "person", action: "show", id: params.id)
    }

}
