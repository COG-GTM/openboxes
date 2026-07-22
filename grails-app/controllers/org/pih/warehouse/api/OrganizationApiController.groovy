/**
 * Copyright (c) 2012 Partners In Health.  All rights reserved.
 * The use and distribution terms for this software are covered by the
 * Eclipse Public License 1.0 (http://opensource.org/licenses/eclipse-1.0.php)
 * which can be found in the file epl-v10.html at the root of this distribution.
 * By using this software in any fashion, you are agreeing to be bound by
 * the terms of this license.
 * You must not remove this notice, or any other, from this software.
 **/
package org.pih.warehouse.api

import grails.converters.JSON
import grails.gorm.transactions.Transactional
import grails.validation.ValidationException
import org.hibernate.ObjectNotFoundException
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.http.HttpStatus

import org.pih.warehouse.core.IdentifierTypeCode
import org.pih.warehouse.core.Location
import org.pih.warehouse.core.Organization
import org.pih.warehouse.core.OrganizationIdentifierService
import org.pih.warehouse.core.OrganizationService
import org.pih.warehouse.core.PartyRole
import org.pih.warehouse.core.PartyType
import org.pih.warehouse.core.RoleType
import org.pih.warehouse.core.UserService

class OrganizationApiController extends BaseDomainApiController {

    OrganizationService organizationService
    OrganizationIdentifierService organizationIdentifierService
    UserService userService

    def list() {
        List<Organization> organizations = organizationService.getOrganizations(params)
        render ([data:organizations] as JSON)
     }

    def read() {
        Organization organization = Organization.get(params.id)
        if (!organization) {
            throw new IllegalArgumentException("No Organization found for organization ID ${params.id}")
        }

        render([data: organization] as JSON)
    }

    def create(Organization organization) {
        organizationService.createOrganization(organization)
        render([data: [id: organization.id]] as JSON)
    }

    def search() {
        Integer max = Math.min(params.max ? params.int('max') : 10, 100)
        Integer offset = params.offset ? params.int('offset') : 0
        String sort = params.sort in ['id', 'code', 'name', 'active'] ? params.sort : 'name'
        String sortOrder = params.order == 'desc' ? 'desc' : 'asc'
        List<RoleType> roleTypes = params.list("roleType").collect { it as RoleType }
        // Restrict by an id subquery rather than joining the roles collection,
        // which would duplicate organizations holding several of the selected
        // role types (and inflate totalCount).
        List<String> roleOrgIds = roleTypes
                ? PartyRole.executeQuery(
                        "select distinct pr.party.id from PartyRole pr where pr.roleType in (:roleTypes)",
                        [roleTypes: roleTypes])
                : null
        if (roleTypes && !roleOrgIds) {
            render([data: [], totalCount: 0] as JSON)
            return
        }
        def results = Organization.createCriteria().list(max: max, offset: offset) {
            if (params.q) {
                or {
                    ilike("id", "${params.q}%")
                    ilike("code", "${params.q}%")
                    ilike("name", "${params.q}%")
                    ilike("description", "${params.q}%")
                }
            }
            if (roleOrgIds) {
                'in'("id", roleOrgIds)
            }
            if (params.active) {
                eq('active', true)
            }
            order(sort, sortOrder)
        }
        List data = results.collect { Organization organization ->
            [
                    id             : organization.id,
                    code           : organization.code,
                    name           : organization.name,
                    active         : organization.active,
                    defaultLocation: organization.defaultLocation?.name,
                    roles          : (organization.roles ?: []).collect { it.toString() }.sort(),
            ]
        }
        render([data: data, totalCount: results.totalCount] as JSON)
    }

    def details() {
        Organization organization = Organization.get(params.id)
        if (!organization) {
            throw new ObjectNotFoundException(params.id, Organization.class.toString())
        }
        boolean isSuperuser = userService.isSuperuser(session?.user)
        render([data: [
                id                    : organization.id,
                code                  : organization.code,
                name                  : organization.name,
                description           : organization.description,
                active                : organization.active,
                version               : organization.version,
                dateCreated           : organization.dateCreated,
                lastUpdated           : organization.lastUpdated,
                partyType             : organization.partyType ? [id: organization.partyType.id, name: organization.partyType.name] : null,
                defaultLocation       : organization.defaultLocation ? [id: organization.defaultLocation.id, name: organization.defaultLocation.name] : null,
                locations             : (organization.locations ?: []).collect { [id: it.id, name: it.name] }.sort { it.name },
                roles                 : (organization.roles ?: []).collect { [id: it.id, name: it.toString()] }.sort { it.name },
                sequences             : organization.sequences ?: [:],
                identifierTypeCodes   : IdentifierTypeCode.values().collect { it.name() },
                maxPurchaseOrderNumber: organization.maxPurchaseOrderNumber(),
                hasPurchaseOrders     : organization.hasPurchaseOrders(),
                isCodeEditable        : !organization.hasPurchaseOrders() || isSuperuser,
                isSuperuser           : isSuperuser,
        ]] as JSON)
    }

    @Transactional
    def update() {
        Organization organization = Organization.get(params.id)
        if (!organization) {
            throw new ObjectNotFoundException(params.id, Organization.class.toString())
        }
        def jsonObject = request.JSON
        boolean isSuperuser = userService.isSuperuser(session?.user)
        if (jsonObject.containsKey("name")) {
            organization.name = jsonObject.name ?: null
        }
        if (jsonObject.containsKey("description")) {
            organization.description = jsonObject.description ?: null
        }
        if (jsonObject.containsKey("active")) {
            organization.active = jsonObject.active as Boolean
        }
        if (jsonObject.containsKey("code") && (!organization.hasPurchaseOrders() || isSuperuser)) {
            organization.code = jsonObject.code ?: null
        }
        if (jsonObject.containsKey("partyType")) {
            organization.partyType = jsonObject.partyType ? PartyType.get(jsonObject.partyType as String) : null
        }
        if (jsonObject.containsKey("defaultLocation")) {
            organization.defaultLocation = jsonObject.defaultLocation ? Location.get(jsonObject.defaultLocation as String) : null
        }
        if (jsonObject.containsKey("sequences") && isSuperuser) {
            (jsonObject.sequences ?: [:]).each { key, value ->
                if (value != null && value != "") {
                    organization.sequences.put(key as String, value as String)
                } else {
                    organization.sequences.remove(key as String)
                }
            }
        }
        if (!organization.code) {
            organization.code = organizationIdentifierService.generate(organization)
        }
        if (!organization.validate() || !organization.save(flush: true)) {
            throw new ValidationException("Invalid organization", organization.errors)
        }
        render([data: [id: organization.id]] as JSON)
    }

    @Transactional
    def delete() {
        Organization organization = Organization.get(params.id)
        if (!organization) {
            throw new ObjectNotFoundException(params.id, Organization.class.toString())
        }
        try {
            organization.delete(flush: true)
        } catch (DataIntegrityViolationException ignored) {
            transactionStatus.setRollbackOnly()
            String message = "${warehouse.message(code: 'default.not.deleted.message', args: [warehouse.message(code: 'organization.label', default: 'Organization'), params.id])}"
            response.status = HttpStatus.BAD_REQUEST.value()
            render([errorCode: HttpStatus.BAD_REQUEST.value(), errorMessage: message] as JSON)
            return
        }
        render status: HttpStatus.NO_CONTENT.value()
    }
}
