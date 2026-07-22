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

import grails.plugins.csv.CSVWriter

class OrganizationController {

    def organizationService
    OrganizationDataService organizationDataService

    static allowedMethods = [delete: "POST"]

    def index() {
        redirect(action: "list", params: params)
    }

    def search() {
        redirect(action: "list", params: params)
    }

    def download() {
        params.max = null
        def organizationInstanceList = organizationService.getOrganizations(params)
        def sw = new StringWriter()
        def csv = new CSVWriter(sw, {
            "Id" { it.id }
            "Code" { it.code }
            "Name" { it.name }
            "Default location" { it.defaultLocation }
            "Roles" { it.roles }
        })

        organizationInstanceList.each { organization ->
            csv << [
                    id             : organization.id,
                    code           : organization.code,
                    name           : organization.name,
                    defaultLocation: organization.defaultLocation ?: '',
                    roles          : organization.roles.join(","),
            ]
        }
        response.setHeader("Content-disposition", "attachment; filename=\"Organizations-${new Date().format("MM/dd/yyyy")}.csv\"")
        render(contentType: "text/csv", text: sw.toString(), encoding: "UTF-8")
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
        if (Organization.exists(params.id)) {
            try {
                organizationDataService.delete(params.id)

                flash.message = "${warehouse.message(code: 'default.deleted.message', args: [warehouse.message(code: 'organizationInstance.label', default: 'Organization'), params.id])}"
                redirect(controller: "organization", action: "list")
            }
            catch (org.springframework.dao.DataIntegrityViolationException e) {
                flash.message = "${warehouse.message(code: 'default.not.deleted.message', args: [warehouse.message(code: 'organizationInstance.label', default: 'Organization'), params.id])} (" + e.message + ")"
                redirect(action: "edit", id: params.id)
            }
        } else {
            flash.message = "${warehouse.message(code: 'default.not.deleted.message', args: [warehouse.message(code: 'organizationInstance.label', default: 'Organization'), params.id])}"
            redirect(action: "edit", id: params.id)
        }
    }

}
