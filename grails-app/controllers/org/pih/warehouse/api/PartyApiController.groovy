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

import org.pih.warehouse.core.Party
import org.pih.warehouse.core.PartyType

class PartyApiController {

    def search() {
        Integer max = Math.min(params.max ? params.int('max') : 10, 100)
        Integer offset = params.offset ? params.int('offset') : 0
        String sort = params.sort in ['id', 'dateCreated', 'lastUpdated'] ? params.sort : 'id'
        String sortOrder = params.order == 'desc' ? 'desc' : 'asc'
        def results = Party.createCriteria().list(max: max, offset: offset) {
            if (params.q) {
                ilike("id", "${params.q}%")
            }
            if (params.partyTypeId) {
                partyType {
                    eq("id", params.partyTypeId)
                }
            }
            order(sort, sortOrder)
        }
        List data = results.collect { Party party ->
            [
                    id       : party.id,
                    partyType: party.partyType?.name,
                    roles    : (party.roles ?: []).collect { it.toString() }.sort(),
            ]
        }
        render([data: data, totalCount: results.totalCount] as JSON)
    }

    def details() {
        Party party = Party.get(params.id)
        if (!party) {
            throw new ObjectNotFoundException(params.id, Party.class.toString())
        }
        render([data: [
                id         : party.id,
                version    : party.version,
                dateCreated: party.dateCreated,
                lastUpdated: party.lastUpdated,
                partyType  : party.partyType ? [id: party.partyType.id, name: party.partyType.name] : null,
                roles      : (party.roles ?: []).collect {
                    [id: it.id, name: it.toString(), roleType: it.roleType?.name()]
                }.sort { it.name },
        ]] as JSON)
    }

    @Transactional
    def create() {
        def jsonObject = request.JSON
        Party party = new Party()
        party.partyType = jsonObject.partyType ? PartyType.get(jsonObject.partyType as String) : null
        if (!party.validate() || !party.save(flush: true)) {
            throw new ValidationException("Invalid party", party.errors)
        }
        render([data: [id: party.id]] as JSON)
    }

    @Transactional
    def update() {
        Party party = Party.get(params.id)
        if (!party) {
            throw new ObjectNotFoundException(params.id, Party.class.toString())
        }
        def jsonObject = request.JSON
        if (jsonObject.containsKey("partyType")) {
            party.partyType = jsonObject.partyType ? PartyType.get(jsonObject.partyType as String) : null
        }
        if (!party.validate() || !party.save(flush: true)) {
            throw new ValidationException("Invalid party", party.errors)
        }
        render([data: [id: party.id]] as JSON)
    }

    @Transactional
    def delete() {
        Party party = Party.get(params.id)
        if (!party) {
            throw new ObjectNotFoundException(params.id, Party.class.toString())
        }
        try {
            party.delete(flush: true)
        } catch (DataIntegrityViolationException ignored) {
            transactionStatus.setRollbackOnly()
            String message = "${warehouse.message(code: 'default.not.deleted.message', args: [warehouse.message(code: 'party.label', default: 'Party'), params.id])}"
            response.status = HttpStatus.BAD_REQUEST.value()
            render([errorCode: HttpStatus.BAD_REQUEST.value(), errorMessage: message] as JSON)
            return
        }
        render status: HttpStatus.NO_CONTENT.value()
    }
}
