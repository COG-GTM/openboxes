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
class TagController {

    static allowedMethods = [delete: "POST"]

    def index() {
        redirect(action: "list", params: params)
    }

    def list() {
        render(view: "/common/react", params: params)
    }

    def create() {
        render(view: "/common/react", params: params)
    }

    def edit() {
        // The legacy show screen posts to this action with the id as a form
        // parameter; redirect so the React route sees /tag/edit/<id>.
        if (request.method == "POST" && params.id) {
            redirect(action: "edit", id: params.id)
            return
        }
        render(view: "/common/react", params: params)
    }

    def show() {
        render(view: "/common/react", params: params)
    }

    // Kept for the legacy show screen's delete button
    def delete() {
        def tagInstance = Tag.get(params.id)
        if (tagInstance) {
            try {
                tagInstance.products.each { product ->
                    tagInstance.removeFromProducts(product)
                }
                tagInstance.delete(flush: true)
                flash.message = "${warehouse.message(code: 'default.deleted.message', args: [warehouse.message(code: 'tag.label', default: 'Tag'), params.id])}"
                redirect(action: "list")
            }
            catch (org.springframework.dao.DataIntegrityViolationException e) {
                flash.message = "${warehouse.message(code: 'default.not.deleted.message', args: [warehouse.message(code: 'tag.label', default: 'Tag'), params.id])}"
                redirect(action: "list", id: params.id)
            }
        } else {
            flash.message = "${warehouse.message(code: 'default.not.found.message', args: [warehouse.message(code: 'tag.label', default: 'Tag'), params.id])}"
            redirect(action: "list")
        }
    }
}
