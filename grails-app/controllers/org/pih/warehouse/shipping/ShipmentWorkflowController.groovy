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
import org.pih.warehouse.core.DocumentCode
import org.pih.warehouse.core.DocumentType
import org.pih.warehouse.core.Document

@Transactional
class ShipmentWorkflowController {

    static allowedMethods = [update: "POST", delete: "POST"]

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

    def update() {
        def shipmentWorkflowInstance = ShipmentWorkflow.get(params.id)
        if (shipmentWorkflowInstance) {
            if (params.version) {
                def version = params.version.toLong()
                if (shipmentWorkflowInstance.version > version) {

                    shipmentWorkflowInstance.errors.rejectValue("version", "default.optimistic.locking.failure", [warehouse.message(code: 'shipmentWorkflow.label', default: 'ShipmentWorkflow')] as Object[], "Another user has updated this ShipmentWorkflow while you were editing")
                    flash.message = "${warehouse.message(code: 'default.optimistic.locking.failure', default: 'Another user has updated this ShipmentWorkflow while you were editing')}"
                    redirect(action: "edit", id: params.id)
                    return
                }
            }
            shipmentWorkflowInstance.properties = params
            if (!shipmentWorkflowInstance.hasErrors() && shipmentWorkflowInstance.save(flush: true)) {
                flash.message = "${warehouse.message(code: 'default.updated.message', args: [warehouse.message(code: 'shipmentWorkflow.label', default: 'ShipmentWorkflow'), shipmentWorkflowInstance.id])}"
                redirect(action: "list", id: shipmentWorkflowInstance.id)
            } else {
                redirect(action: "edit", id: params.id)
            }
        } else {
            flash.message = "${warehouse.message(code: 'default.not.found.message', args: [warehouse.message(code: 'shipmentWorkflow.label', default: 'ShipmentWorkflow'), params.id])}"
            redirect(action: "list")
        }
    }

    def delete() {
        def shipmentWorkflowInstance = ShipmentWorkflow.get(params.id)
        if (shipmentWorkflowInstance) {
            try {
                shipmentWorkflowInstance.delete(flush: true)
                flash.message = "${warehouse.message(code: 'default.deleted.message', args: [warehouse.message(code: 'shipmentWorkflow.label', default: 'ShipmentWorkflow'), params.id])}"
                redirect(action: "list")
            }
            catch (org.springframework.dao.DataIntegrityViolationException e) {
                flash.message = "${warehouse.message(code: 'default.not.deleted.message', args: [warehouse.message(code: 'shipmentWorkflow.label', default: 'ShipmentWorkflow'), params.id])}"
                redirect(action: "list", id: params.id)
            }
        } else {
            flash.message = "${warehouse.message(code: 'default.not.found.message', args: [warehouse.message(code: 'shipmentWorkflow.label', default: 'ShipmentWorkflow'), params.id])}"
            redirect(action: "list")
        }
    }


    List getDocumentTemplates() {
        def documentTypes = DocumentType.findAllByDocumentCodeInList([DocumentCode.SHIPPING_TEMPLATE, DocumentCode.INVOICE_TEMPLATE])
        Document.findAllByDocumentTypeInList(documentTypes)
    }
}
