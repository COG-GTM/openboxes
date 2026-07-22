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
import org.springframework.http.HttpStatus

import org.pih.warehouse.core.PreferenceType
import org.pih.warehouse.core.ValidationCode

class PreferenceTypeApiController {

    def list() {
        Integer max = Math.min(params.max ? params.int('max') : 10, 100)
        Integer offset = params.offset ? params.int('offset') : 0
        String sort = params.sort in ['id', 'name', 'validationCode', 'dateCreated', 'lastUpdated'] ? params.sort : 'id'
        String sortOrder = params.order == 'desc' ? 'desc' : 'asc'
        def results = PreferenceType.createCriteria().list(max: max, offset: offset) {
            if (params.q) {
                ilike("name", "${params.q}%")
            }
            order(sort, sortOrder)
        }
        render([data: results.collect { toJson(it) }, totalCount: results.totalCount] as JSON)
    }

    def read() {
        PreferenceType preferenceType = PreferenceType.get(params.id)
        if (!preferenceType) {
            throw new ObjectNotFoundException(params.id, PreferenceType.class.toString())
        }
        render([data: toJson(preferenceType)] as JSON)
    }

    @Transactional
    def create() {
        def jsonObject = request.JSON
        String validationError = validateValidationCode(jsonObject)
        if (validationError) {
            response.status = HttpStatus.BAD_REQUEST.value()
            render([errorCode: HttpStatus.BAD_REQUEST.value(), errorMessage: validationError] as JSON)
            return
        }
        PreferenceType preferenceType = new PreferenceType()
        bindPreferenceType(preferenceType, jsonObject)
        if (preferenceType.hasErrors() || !preferenceType.save(flush: true)) {
            throw new ValidationException("Invalid preference type", preferenceType.errors)
        }
        response.status = HttpStatus.CREATED.value()
        render([data: toJson(preferenceType)] as JSON)
    }

    @Transactional
    def update() {
        PreferenceType preferenceType = PreferenceType.get(params.id)
        if (!preferenceType) {
            throw new ObjectNotFoundException(params.id, PreferenceType.class.toString())
        }
        def jsonObject = request.JSON
        String validationError = validateValidationCode(jsonObject)
        if (validationError) {
            response.status = HttpStatus.BAD_REQUEST.value()
            render([errorCode: HttpStatus.BAD_REQUEST.value(), errorMessage: validationError] as JSON)
            return
        }
        bindPreferenceType(preferenceType, jsonObject)
        if (preferenceType.hasErrors() || !preferenceType.save(flush: true)) {
            throw new ValidationException("Invalid preference type", preferenceType.errors)
        }
        render([data: toJson(preferenceType)] as JSON)
    }

    private static String validateValidationCode(jsonObject) {
        String validationCode = jsonObject.containsKey("validationCode") ? jsonObject.validationCode as String : null
        if (validationCode && !ValidationCode.values().any { it.name() == validationCode }) {
            return "Invalid validation code '${validationCode}'"
        }
        return null
    }

    private static void bindPreferenceType(PreferenceType preferenceType, jsonObject) {
        if (jsonObject.containsKey("name")) {
            preferenceType.name = jsonObject.name ?: null
        }
        if (jsonObject.containsKey("validationCode")) {
            preferenceType.validationCode = jsonObject.validationCode
                    ? ValidationCode.valueOf(jsonObject.validationCode as String)
                    : null
        }
        preferenceType.validate()
    }

    private static Map toJson(PreferenceType preferenceType) {
        return [
                id            : preferenceType.id,
                name          : preferenceType.name,
                validationCode: preferenceType.validationCode?.name(),
                dateCreated   : preferenceType.dateCreated,
                lastUpdated   : preferenceType.lastUpdated,
        ]
    }
}
