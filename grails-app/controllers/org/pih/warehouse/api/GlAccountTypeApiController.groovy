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

import org.pih.warehouse.core.GlAccountType
import org.pih.warehouse.core.GlAccountTypeCode

class GlAccountTypeApiController {

    def list() {
        params.max = Math.min(params.max ? params.int('max') : 10, 100)
        def glAccountTypes = GlAccountType.list(params)
        render([data: glAccountTypes.collect { toJson(it) }, totalCount: GlAccountType.count()] as JSON)
    }

    def read() {
        GlAccountType glAccountType = GlAccountType.get(params.id)
        if (!glAccountType) {
            throw new ObjectNotFoundException(params.id, GlAccountType.class.toString())
        }
        render([data: toJson(glAccountType)] as JSON)
    }

    @Transactional
    def create() {
        def jsonObject = request.JSON
        GlAccountType glAccountType = new GlAccountType()
        bindGlAccountType(glAccountType, jsonObject)
        if (glAccountType.hasErrors() || !glAccountType.save(flush: true)) {
            throw new ValidationException("Invalid GL account type", glAccountType.errors)
        }
        response.status = HttpStatus.CREATED.value()
        render([data: toJson(glAccountType)] as JSON)
    }

    @Transactional
    def update() {
        GlAccountType glAccountType = GlAccountType.get(params.id)
        if (!glAccountType) {
            throw new ObjectNotFoundException(params.id, GlAccountType.class.toString())
        }
        bindGlAccountType(glAccountType, request.JSON)
        if (glAccountType.hasErrors() || !glAccountType.save(flush: true)) {
            throw new ValidationException("Invalid GL account type", glAccountType.errors)
        }
        render([data: toJson(glAccountType)] as JSON)
    }

    @Transactional
    def delete() {
        GlAccountType glAccountType = GlAccountType.get(params.id)
        if (!glAccountType) {
            throw new ObjectNotFoundException(params.id, GlAccountType.class.toString())
        }
        try {
            glAccountType.delete(flush: true)
        } catch (DataIntegrityViolationException ignored) {
            transactionStatus.setRollbackOnly()
            String message = "${warehouse.message(code: 'default.not.deleted.message', args: [warehouse.message(code: 'glAccountType.label', default: 'GL Account Type'), params.id])}"
            response.status = HttpStatus.BAD_REQUEST.value()
            render([errorCode: HttpStatus.BAD_REQUEST.value(), errorMessage: message] as JSON)
            return
        }
        render status: HttpStatus.NO_CONTENT.value()
    }

    private void bindGlAccountType(GlAccountType glAccountType, jsonObject) {
        if (jsonObject.containsKey("code")) {
            glAccountType.code = jsonObject.code ?: null
        }
        if (jsonObject.containsKey("name")) {
            glAccountType.name = jsonObject.name ?: null
        }
        if (jsonObject.containsKey("glAccountTypeCode")) {
            glAccountType.glAccountTypeCode = jsonObject.glAccountTypeCode
                    ? jsonObject.glAccountTypeCode as GlAccountTypeCode
                    : null
        }
        glAccountType.validate()
    }

    private static Map toJson(GlAccountType glAccountType) {
        return [
                id               : glAccountType.id,
                code             : glAccountType.code,
                name             : glAccountType.name,
                glAccountTypeCode: glAccountType.glAccountTypeCode?.name(),
                dateCreated      : glAccountType.dateCreated,
                lastUpdated      : glAccountType.lastUpdated,
        ]
    }
}
