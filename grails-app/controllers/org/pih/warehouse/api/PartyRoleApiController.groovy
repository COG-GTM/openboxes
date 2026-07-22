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

import java.time.Instant

import org.pih.warehouse.core.Party
import org.pih.warehouse.core.PartyRole
import org.pih.warehouse.core.RoleType

class PartyRoleApiController {

    def list() {
        Integer max = Math.min(params.max ? params.int('max') : 10, 100)
        Integer offset = params.offset ? params.int('offset') : 0
        String sort = params.sort in ['id', 'roleType', 'startDate', 'endDate'] ? params.sort : 'id'
        String sortOrder = params.order == 'desc' ? 'desc' : 'asc'
        def results = PartyRole.createCriteria().list(max: max, offset: offset) {
            order(sort, sortOrder)
        }
        List data = results.collect { PartyRole partyRole ->
            [
                    id       : partyRole.id,
                    party    : partyRole.party ? [id: partyRole.party.id, partyType: partyRole.party.partyType?.name] : null,
                    roleType : partyRole.roleType?.name(),
                    startDate: partyRole.startDate?.toString(),
                    endDate  : partyRole.endDate?.toString(),
            ]
        }
        render([data: data, totalCount: results.totalCount] as JSON)
    }

    def details() {
        PartyRole partyRole = PartyRole.get(params.id)
        if (!partyRole) {
            throw new ObjectNotFoundException(params.id, PartyRole.class.toString())
        }
        render([data: [
                id       : partyRole.id,
                version  : partyRole.version,
                party    : partyRole.party ? [id: partyRole.party.id, partyType: partyRole.party.partyType?.name] : null,
                roleType : partyRole.roleType?.name(),
                startDate: partyRole.startDate?.toString(),
                endDate  : partyRole.endDate?.toString(),
        ]] as JSON)
    }

    @Transactional
    def create() {
        def jsonObject = request.JSON
        PartyRole partyRole = new PartyRole()
        bind(partyRole, jsonObject)
        if (!partyRole.validate() || !partyRole.save(flush: true)) {
            throw new ValidationException("Invalid party role", partyRole.errors)
        }
        render([data: [id: partyRole.id]] as JSON)
    }

    @Transactional
    def update() {
        PartyRole partyRole = PartyRole.get(params.id)
        if (!partyRole) {
            throw new ObjectNotFoundException(params.id, PartyRole.class.toString())
        }
        bind(partyRole, request.JSON)
        if (!partyRole.validate() || !partyRole.save(flush: true)) {
            throw new ValidationException("Invalid party role", partyRole.errors)
        }
        render([data: [id: partyRole.id]] as JSON)
    }

    @Transactional
    def delete() {
        PartyRole partyRole = PartyRole.get(params.id)
        if (!partyRole) {
            throw new ObjectNotFoundException(params.id, PartyRole.class.toString())
        }
        try {
            partyRole.delete(flush: true)
        } catch (DataIntegrityViolationException ignored) {
            transactionStatus.setRollbackOnly()
            String message = "${warehouse.message(code: 'default.not.deleted.message', args: [warehouse.message(code: 'partyRole.label', default: 'PartyRole'), params.id])}"
            response.status = HttpStatus.BAD_REQUEST.value()
            render([errorCode: HttpStatus.BAD_REQUEST.value(), errorMessage: message] as JSON)
            return
        }
        render status: HttpStatus.NO_CONTENT.value()
    }

    private static void bind(PartyRole partyRole, def jsonObject) {
        if (jsonObject.containsKey("party")) {
            partyRole.party = jsonObject.party ? Party.get(jsonObject.party as String) : null
        }
        if (jsonObject.containsKey("roleType")) {
            partyRole.roleType = jsonObject.roleType ? jsonObject.roleType as RoleType : null
        }
        if (jsonObject.containsKey("startDate")) {
            partyRole.startDate = jsonObject.startDate ? Instant.parse(jsonObject.startDate as String) : null
        }
        if (jsonObject.containsKey("endDate")) {
            partyRole.endDate = jsonObject.endDate ? Instant.parse(jsonObject.endDate as String) : null
        }
    }
}
