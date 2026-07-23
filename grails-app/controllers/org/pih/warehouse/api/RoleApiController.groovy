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
import org.pih.warehouse.core.Role
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.http.HttpStatus

/**
 * Read-and-delete API over Role backing the React role/show screen.
 */
@Transactional
class RoleApiController {

    def read() {
        Role role = Role.get(params.id)
        if (!role) {
            response.status = HttpStatus.NOT_FOUND.value()
            render([errorCode: HttpStatus.NOT_FOUND.value(),
                    errorMessage: "No role found for id ${params.id}".toString()] as JSON)
            return
        }
        render([data: toJson(role)] as JSON)
    }

    def delete() {
        Role role = Role.get(params.id)
        if (!role) {
            response.status = HttpStatus.NOT_FOUND.value()
            render([errorCode: HttpStatus.NOT_FOUND.value(),
                    errorMessage: "No role found for id ${params.id}".toString()] as JSON)
            return
        }
        try {
            role.delete(flush: true)
        } catch (DataIntegrityViolationException ignored) {
            transactionStatus.setRollbackOnly()
            response.status = HttpStatus.CONFLICT.value()
            render([errorCode: HttpStatus.CONFLICT.value(),
                    errorMessage: "Role ${role.name} is in use and cannot be deleted".toString()] as JSON)
            return
        }
        render status: HttpStatus.NO_CONTENT.value()
    }

    private static Map toJson(Role role) {
        return [
                id         : role.id,
                name       : role.name,
                roleType   : role.roleType?.name(),
                description: role.description,
        ]
    }
}
