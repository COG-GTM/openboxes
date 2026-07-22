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
import grails.gorm.PagedResultList
import grails.gorm.transactions.Transactional
import grails.validation.ValidationException
import org.hibernate.ObjectNotFoundException
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.http.HttpStatus

import org.pih.warehouse.core.GlAccount
import org.pih.warehouse.core.GlAccountType
import org.pih.warehouse.product.Product

class GlAccountApiController {

    def glAccountService

    def list() {
        params.max = Math.min(params.max ? params.int('max') : 10, 100)
        def glAccounts = glAccountService.getGlAccounts(params)
        Integer totalCount = glAccounts instanceof PagedResultList ? glAccounts.totalCount : glAccounts.size()
        render([data: glAccounts.collect { toJson(it) }, totalCount: totalCount] as JSON)
    }

    def read() {
        GlAccount glAccount = GlAccount.get(params.id)
        if (!glAccount) {
            throw new ObjectNotFoundException(params.id, GlAccount.class.toString())
        }
        render([data: toJson(glAccount)] as JSON)
    }

    @Transactional
    def create() {
        def jsonObject = request.JSON
        GlAccount glAccount = new GlAccount()
        bindGlAccount(glAccount, jsonObject)
        if (glAccount.hasErrors() || !glAccount.save(flush: true)) {
            throw new ValidationException("Invalid GL account", glAccount.errors)
        }
        response.status = HttpStatus.CREATED.value()
        render([data: toJson(glAccount)] as JSON)
    }

    @Transactional
    def update() {
        GlAccount glAccount = GlAccount.get(params.id)
        if (!glAccount) {
            throw new ObjectNotFoundException(params.id, GlAccount.class.toString())
        }
        def jsonObject = request.JSON
        // If the glAccount is associated with ANY product, do not allow to deactivate it
        Boolean active = jsonObject.containsKey("active") ? jsonObject.active as Boolean : glAccount.active
        if (!active && Product.findByGlAccount(glAccount)) {
            glAccount.errors.rejectValue("active", "glAccount.associatedProducts.error.label",
                    "This GL account is linked to an active product and cannot be deactivated.")
            throw new ValidationException("Invalid GL account", glAccount.errors)
        }
        bindGlAccount(glAccount, jsonObject)
        if (glAccount.hasErrors() || !glAccount.save(flush: true)) {
            throw new ValidationException("Invalid GL account", glAccount.errors)
        }
        render([data: toJson(glAccount)] as JSON)
    }

    @Transactional
    def delete() {
        GlAccount glAccount = GlAccount.get(params.id)
        if (!glAccount) {
            throw new ObjectNotFoundException(params.id, GlAccount.class.toString())
        }
        try {
            glAccount.delete(flush: true)
        } catch (DataIntegrityViolationException ignored) {
            transactionStatus.setRollbackOnly()
            String message = "${warehouse.message(code: 'default.not.deleted.message', args: [warehouse.message(code: 'glAccount.label', default: 'GL Account'), params.id])}"
            response.status = HttpStatus.BAD_REQUEST.value()
            render([errorCode: HttpStatus.BAD_REQUEST.value(), errorMessage: message] as JSON)
            return
        }
        render status: HttpStatus.NO_CONTENT.value()
    }

    private void bindGlAccount(GlAccount glAccount, jsonObject) {
        if (jsonObject.containsKey("code")) {
            glAccount.code = jsonObject.code ?: null
        }
        if (jsonObject.containsKey("name")) {
            glAccount.name = jsonObject.name ?: null
        }
        if (jsonObject.containsKey("description")) {
            glAccount.description = jsonObject.description ?: null
        }
        if (jsonObject.containsKey("active")) {
            glAccount.active = jsonObject.active as Boolean
        }
        if (jsonObject.containsKey("glAccountType")) {
            String glAccountTypeId = jsonObject.glAccountType instanceof Map
                    ? jsonObject.glAccountType.id
                    : jsonObject.glAccountType
            glAccount.glAccountType = glAccountTypeId ? GlAccountType.get(glAccountTypeId) : null
        }
        glAccount.validate()
    }

    private static Map toJson(GlAccount glAccount) {
        return [
                id           : glAccount.id,
                code         : glAccount.code,
                name         : glAccount.name,
                description  : glAccount.description,
                active       : glAccount.active,
                glAccountType: glAccount.glAccountType ? [
                        id               : glAccount.glAccountType.id,
                        code             : glAccount.glAccountType.code,
                        name             : glAccount.glAccountType.name,
                        glAccountTypeCode: glAccount.glAccountType.glAccountTypeCode?.name(),
                ] : null,
                dateCreated  : glAccount.dateCreated,
                lastUpdated  : glAccount.lastUpdated,
        ]
    }
}
