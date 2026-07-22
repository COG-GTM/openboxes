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

import org.pih.warehouse.core.PartyType
import org.pih.warehouse.core.PartyTypeCode

class PartyTypeApiController {

    def list() {
        Integer max = Math.min(params.max ? params.int('max') : 10, 100)
        Integer offset = params.offset ? params.int('offset') : 0
        String sort = params.sort in ['id', 'code', 'name', 'description', 'dateCreated', 'lastUpdated', 'partyTypeCode'] ? params.sort : 'id'
        String sortOrder = params.order == 'desc' ? 'desc' : 'asc'
        def results = PartyType.createCriteria().list(max: max, offset: offset) {
            if (params.q) {
                ilike("name", "${params.q}%")
            }
            order(sort, sortOrder)
        }
        render([data: results.collect { toJson(it) }, totalCount: results.totalCount] as JSON)
    }

    def read() {
        PartyType partyType = PartyType.get(params.id)
        if (!partyType) {
            throw new ObjectNotFoundException(params.id, PartyType.class.toString())
        }
        render([data: toJson(partyType)] as JSON)
    }

    @Transactional
    def create() {
        def jsonObject = request.JSON
        String validationError = validatePartyTypeCode(jsonObject)
        if (validationError) {
            response.status = HttpStatus.BAD_REQUEST.value()
            render([errorCode: HttpStatus.BAD_REQUEST.value(), errorMessage: validationError] as JSON)
            return
        }
        PartyType partyType = new PartyType()
        bindPartyType(partyType, jsonObject)
        if (partyType.hasErrors() || !partyType.save(flush: true)) {
            throw new ValidationException("Invalid party type", partyType.errors)
        }
        response.status = HttpStatus.CREATED.value()
        render([data: toJson(partyType)] as JSON)
    }

    @Transactional
    def update() {
        PartyType partyType = PartyType.get(params.id)
        if (!partyType) {
            throw new ObjectNotFoundException(params.id, PartyType.class.toString())
        }
        def jsonObject = request.JSON
        String validationError = validatePartyTypeCode(jsonObject)
        if (validationError) {
            response.status = HttpStatus.BAD_REQUEST.value()
            render([errorCode: HttpStatus.BAD_REQUEST.value(), errorMessage: validationError] as JSON)
            return
        }
        bindPartyType(partyType, jsonObject)
        if (partyType.hasErrors() || !partyType.save(flush: true)) {
            throw new ValidationException("Invalid party type", partyType.errors)
        }
        render([data: toJson(partyType)] as JSON)
    }

    @Transactional
    def delete() {
        PartyType partyType = PartyType.get(params.id)
        if (!partyType) {
            throw new ObjectNotFoundException(params.id, PartyType.class.toString())
        }
        try {
            partyType.delete(flush: true)
        } catch (DataIntegrityViolationException ignored) {
            transactionStatus.setRollbackOnly()
            String message = "${warehouse.message(code: 'default.not.deleted.message', args: [warehouse.message(code: 'partyType.label', default: 'PartyType'), params.id])}"
            response.status = HttpStatus.BAD_REQUEST.value()
            render([errorCode: HttpStatus.BAD_REQUEST.value(), errorMessage: message] as JSON)
            return
        }
        render status: HttpStatus.NO_CONTENT.value()
    }

    private static String validatePartyTypeCode(jsonObject) {
        String partyTypeCode = jsonObject.containsKey("partyTypeCode") ? jsonObject.partyTypeCode as String : null
        if (partyTypeCode && !PartyTypeCode.values().any { it.name() == partyTypeCode }) {
            return "Invalid party type code '${partyTypeCode}'"
        }
        return null
    }

    private static void bindPartyType(PartyType partyType, jsonObject) {
        if (jsonObject.containsKey("code")) {
            partyType.code = jsonObject.code ?: null
        }
        if (jsonObject.containsKey("name")) {
            partyType.name = jsonObject.name ?: null
        }
        if (jsonObject.containsKey("description")) {
            partyType.description = jsonObject.description ?: null
        }
        if (jsonObject.containsKey("partyTypeCode")) {
            partyType.partyTypeCode = jsonObject.partyTypeCode
                    ? PartyTypeCode.valueOf(jsonObject.partyTypeCode as String)
                    : null
        }
        partyType.validate()
    }

    private static Map toJson(PartyType partyType) {
        return [
                id           : partyType.id,
                code         : partyType.code,
                name         : partyType.name,
                description  : partyType.description,
                partyTypeCode: partyType.partyTypeCode?.name(),
                dateCreated  : partyType.dateCreated,
                lastUpdated  : partyType.lastUpdated,
        ]
    }
}
