/**
 * Copyright (c) 2012 Partners In Health.  All rights reserved.
 * The use and distribution terms for this software are covered by the
 * Eclipse Public License 1.0 (http://opensource.org/licenses/eclipse-1.0.php)
 * which can be found in the file epl-v10.html at the root of this distribution.
 * By using this software in any fashion, you are agreeing to be bound by
 * the terms of this license.
 * You must not remove this notice, or any other, from this software.
 **/
package org.pih.warehouse.product

import grails.gorm.transactions.Transactional
import org.pih.warehouse.core.EntityTypeCode

@Transactional
class AttributeController {

    AttributeService attributeService

    static allowedMethods = [save: "POST", update: "POST", delete: "POST"]

    def index() {
        redirect(action: "list", params: params)
    }

    def list() {
        render(view: "/common/react")
    }

    def show() {
        render(view: "/common/react")
    }

    def create() {
        render(view: "/common/react")
    }

    def edit() {
        render(view: "/common/react")
    }

    def delete() {
        def attributeInstance = Attribute.get(params.id)
        if (attributeInstance) {
            try {
                attributeInstance.delete(flush: true)
                flash.message = "${warehouse.message(code: 'default.deleted.message', args: [warehouse.message(code: 'attribute.label', default: 'Attribute'), params.id])}"
                redirect(action: "list")
            }
            catch (org.springframework.dao.DataIntegrityViolationException e) {
                flash.message = "${warehouse.message(code: 'default.not.deleted.message', args: [warehouse.message(code: 'attribute.label', default: 'Attribute'), params.id])}"
                redirect(action: "edit", id: params.id)
            }
        } else {
            flash.message = "${warehouse.message(code: 'default.not.found.message', args: [warehouse.message(code: 'attribute.label', default: 'Attribute'), params.id])}"
            redirect(action: "list")
        }
    }
}
