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
import org.apache.http.auth.AuthenticationException
import org.hibernate.ObjectNotFoundException
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.http.HttpStatus

import org.pih.warehouse.LocalizationUtil
import org.pih.warehouse.core.Location
import org.pih.warehouse.core.LocationRole
import org.pih.warehouse.core.Role
import org.pih.warehouse.core.User
import org.pih.warehouse.core.UserDataService
import util.StringUtil

class UserApiController {

    def userService
    def mailService
    UserDataService userGormService

    def list() {
        Map listParams = [
                max   : Math.min(params.max ? params.int('max') : 10, 100),
                offset: params.offset ? params.int('offset') : 0,
                status: params.status,
        ]
        String sort = params.sort in ['username', 'firstName', 'lastName', 'email', 'active', 'lastLoginDate'] ? params.sort : null
        if (sort) {
            listParams.sort = sort
            listParams.order = params.order == 'desc' ? 'desc' : 'asc'
        }
        String query = params.q ? "%" + params.q + "%" : ""
        def results = userService.findUsers(query, listParams)
        render([data: results.collect { toListJson(it) }, totalCount: results.totalCount] as JSON)
    }

    def read() {
        User user = User.get(params.id)
        if (!user) {
            throw new ObjectNotFoundException(params.id, User.class.toString())
        }
        render([data: toDetailsJson(user)] as JSON)
    }

    @Transactional
    def create() {
        def jsonObject = request.JSON
        User user = new User(
                username: jsonObject.username ?: null,
                firstName: jsonObject.firstName ?: null,
                lastName: jsonObject.lastName ?: null,
                email: jsonObject.email ?: null,
                locale: jsonObject.locale ? LocalizationUtil.getLocale(jsonObject.locale as String) : null,
        )
        // Person defaults active=true; new users must start inactive,
        // matching the legacy UserController.save behavior.
        user.active = false
        user.password = jsonObject.password ? (jsonObject.password as String).encodeAsPassword() : null
        user.passwordConfirm = user.password
        try {
            userService.saveUser(user, session.user.id as String, [])
        } catch (ValidationException e) {
            transactionStatus.setRollbackOnly()
            renderValidationErrors(e)
            return
        }
        response.status = HttpStatus.CREATED.value()
        render([data: toDetailsJson(user)] as JSON)
    }

    def update() {
        User user = User.get(params.id)
        if (!user) {
            throw new ObjectNotFoundException(params.id, User.class.toString())
        }
        Map body = requestBody()
        boolean rolesProvided = body.containsKey('roles')
        List<String> requestedRoleIds = extractRoleIds(body)
        // An explicitly-provided empty roles list clears all roles, mirroring the
        // legacy edit screen's "No access" option (a 'null' id that resolves to no roles).
        if (rolesProvided && !requestedRoleIds) {
            requestedRoleIds = ['null']
        }
        Map updateParams = [:]
        ['username', 'firstName', 'lastName', 'email', 'locale', 'timezone'].each { key ->
            if (body.containsKey(key)) {
                updateParams[key] = body[key]
            }
        }
        if (body.containsKey('active')) {
            updateParams.active = Boolean.valueOf(body.active as String)
        }
        if (body.containsKey('rememberLastLocation')) {
            updateParams.rememberLastLocation = Boolean.valueOf(body.rememberLastLocation as String)
        }
        if (body.warehouse instanceof Map || body.containsKey('warehouse.id')) {
            String warehouseId = body.warehouse instanceof Map ? body.warehouse.id : body['warehouse.id']
            updateParams.warehouse = warehouseId ? Location.get(warehouseId) : null
        }
        try {
            user = userService.updateUser(params.id, session.user.id, requestedRoleIds, updateParams)
            // Update session data if the user is editing their own profile
            if (session.user.id == user?.id) {
                session.user = User.get(user?.id)
                if (updateParams.timezone) {
                    session.timezone = TimeZone.getTimeZone(updateParams.timezone as String)
                }
            }
            render([data: toDetailsJson(user)] as JSON)
        } catch (ValidationException e) {
            renderValidationErrors(e)
        }
    }

    def changePassword() {
        User user = userGormService.get(params.id)
        if (!user) {
            throw new ObjectNotFoundException(params.id, User.class.toString())
        }
        Map body = requestBody()
        try {
            userService.changePassword(user, body.password as String, body.passwordConfirm as String)
            render([data: toDetailsJson(User.get(params.id))] as JSON)
        } catch (ValidationException e) {
            renderValidationErrors(e)
        } catch (AuthenticationException e) {
            response.status = HttpStatus.FORBIDDEN.value()
            render([errorCode: HttpStatus.FORBIDDEN.value(), errorMessage: e.message] as JSON)
        }
    }

    def delete() {
        User user = userGormService.get(params.id)
        if (!user) {
            throw new ObjectNotFoundException(params.id, User.class.toString())
        }
        if (user.id == session?.user?.id) {
            String message = "${warehouse.message(code: 'default.cannot.delete.self.message', args: [warehouse.message(code: 'user.label'), params.id])}"
            response.status = HttpStatus.BAD_REQUEST.value()
            render([errorCode: HttpStatus.BAD_REQUEST.value(), errorMessage: message] as JSON)
            return
        }
        try {
            userGormService.delete(user.id)
        } catch (DataIntegrityViolationException ignored) {
            String message = "${warehouse.message(code: 'default.not.deleted.message', args: [warehouse.message(code: 'user.label'), params.id])}"
            response.status = HttpStatus.BAD_REQUEST.value()
            render([errorCode: HttpStatus.BAD_REQUEST.value(), errorMessage: message] as JSON)
            return
        }
        render status: HttpStatus.NO_CONTENT.value()
    }

    def saveLocationRole() {
        User user = User.get(params.id)
        if (!user) {
            throw new ObjectNotFoundException(params.id, User.class.toString())
        }
        Map body = requestBody()
        Location location = body.location instanceof Map ? Location.get(body.location.id) : Location.get(body['location.id'])
        List<String> roleIds = extractRoleIds(body, 'role')
        List<Role> roles = roleIds.collect { Role.get(it) }.findAll { it }
        try {
            userService.saveLocationRole(location, null, roles, user, session.user.id)
        } catch (ValidationException e) {
            response.status = HttpStatus.BAD_REQUEST.value()
            render([errorCode: HttpStatus.BAD_REQUEST.value(), errorMessage: e.message] as JSON)
            return
        }
        render([data: toDetailsJson(User.get(params.id))] as JSON)
    }

    def deleteLocationRole() {
        User user = User.get(params.id)
        if (!user) {
            throw new ObjectNotFoundException(params.id, User.class.toString())
        }
        LocationRole locationRole = LocationRole.get(params.locationRoleId)
        if (!locationRole || locationRole.user?.id != user.id) {
            throw new ObjectNotFoundException(params.locationRoleId as String, LocationRole.class.toString())
        }
        try {
            userService.deleteLocationRole(locationRole, session.user.id)
        } catch (ValidationException e) {
            response.status = HttpStatus.BAD_REQUEST.value()
            render([errorCode: HttpStatus.BAD_REQUEST.value(), errorMessage: e.message] as JSON)
            return
        }
        render([data: toDetailsJson(User.get(params.id))] as JSON)
    }

    def uploadPhoto() {
        User user = User.get(params.id)
        if (!user) {
            throw new ObjectNotFoundException(params.id, User.class.toString())
        }
        def photo = request.getFile("photo")
        def okcontents = ['image/png', 'image/jpeg', 'image/gif']
        if (!photo || photo.empty) {
            response.status = HttpStatus.BAD_REQUEST.value()
            render([errorCode: HttpStatus.BAD_REQUEST.value(), errorMessage: "A non-empty photo file is required"] as JSON)
            return
        }
        if (!okcontents.contains(photo.getContentType())) {
            String message = "Photo must be one of: ${okcontents}"
            response.status = HttpStatus.BAD_REQUEST.value()
            render([errorCode: HttpStatus.BAD_REQUEST.value(), errorMessage: message] as JSON)
            return
        }
        if (photo.size >= 1024 * 1000) {
            String message = "${warehouse.message(code: 'user.photoTooLarge.message', args: [warehouse.message(code: 'user.label'), user.id])}"
            response.status = HttpStatus.BAD_REQUEST.value()
            render([errorCode: HttpStatus.BAD_REQUEST.value(), errorMessage: message] as JSON)
            return
        }
        User.withTransaction {
            user.photo = photo.bytes
            user.save(flush: true)
        }
        sendUserPhotoChanged(user)
        render([data: toDetailsJson(user)] as JSON)
    }

    private void sendUserPhotoChanged(User user) {
        try {
            String subject = "${warehouse.message(code: 'email.userPhotoChanged.message', args: [user?.email])}"
            String body = "${g.render(template: '/email/userPhotoChanged', model: [userInstance: user])}"
            mailService.sendHtmlMailWithAttachment(user, subject, body, user.photo, "photo.png", "image/png")
        }
        catch (Exception e) {
            log.warn("Unable to send photo-changed email to ${user?.email}: ${e.message}")
        }
    }

    private void renderValidationErrors(ValidationException e) {
        List<String> errorMessages = e.errors.allErrors.collect { error ->
            g.message(error: error) as String
        }
        response.status = HttpStatus.BAD_REQUEST.value()
        render([
                errorCode    : HttpStatus.BAD_REQUEST.value(),
                errorMessage : errorMessages.join('; '),
                errorMessages: errorMessages,
        ] as JSON)
    }

    /**
     * JSON request bodies are not merged into params for PUT/POST in this
     * Grails version, so read them explicitly (falling back to params for
     * form-encoded requests).
     */
    private Map requestBody() {
        if (request.contentType?.contains('application/json')) {
            def json = request.JSON
            if (json instanceof Map) {
                return new LinkedHashMap(json)
            }
        }
        return params
    }

    /**
     * Role IDs must never reach GORM binding directly; see UserService.updateUser.
     */
    private static List<String> extractRoleIds(Map params, String key = 'roles') {
        def value = params[key]
        params.keySet().removeAll { it?.toString()?.startsWith(key) }
        if (value == null) {
            return []
        }
        List ids = value instanceof List ? value : [value]
        return ids.collect { it instanceof Map ? it.id as String : it as String }.findAll { it }
    }

    private Map toListJson(User user) {
        boolean anonymize = grailsApplication.config.openboxes.anonymize.enabled
        return [
                id           : user.id,
                username     : anonymize ? StringUtil.mask(user.username) : user.username,
                name         : user.name,
                email        : anonymize ? StringUtil.mask(user.email) : user.email,
                active       : user.active,
                locale       : user.locale?.toString(),
                localeDisplayName: user.locale?.displayName,
                roles        : user.roles?.collect { it.toString() }?.sort()?.join(', '),
                lastLoginDate: user.lastLoginDate,
        ]
    }

    private static Map toDetailsJson(User user) {
        return [
                id                  : user.id,
                username            : user.username,
                firstName           : user.firstName,
                lastName            : user.lastName,
                name                : user.name,
                email               : user.email,
                active              : user.active,
                locale              : user.locale?.toString(),
                localeDisplayName   : user.locale?.displayName,
                timezone            : user.timezone,
                rememberLastLocation: user.rememberLastLocation,
                hasPhoto            : user.photo != null,
                warehouse           : user.warehouse ? [id: user.warehouse.id, name: user.warehouse.name] : null,
                roles               : user.roles?.sort { it.toString() }?.collect { Role role ->
                    [id: role.id, roleType: role.roleType?.name(), description: role.toString()]
                } ?: [],
                locationRoles       : user.locationRoles?.sort { a, b ->
                    (a.location?.name ?: '') <=> (b.location?.name ?: '') ?: (a.role?.roleType?.sortOrder ?: 0) <=> (b.role?.roleType?.sortOrder ?: 0)
                }?.collect { LocationRole locationRole ->
                    [
                            id           : locationRole.id,
                            location     : [
                                    id           : locationRole.location?.id,
                                    name         : locationRole.location?.name,
                                    locationGroup: locationRole.location?.locationGroup?.name,
                                    locationType : locationRole.location?.locationType?.name,
                            ],
                            role         : [
                                    id         : locationRole.role?.id,
                                    roleType   : locationRole.role?.roleType?.name(),
                                    description: locationRole.role?.toString(),
                            ],
                            highestActive: locationRole?.role in locationRole?.user?.getHighestRole(locationRole.location),
                    ]
                } ?: [],
                lastLoginDate       : user.lastLoginDate,
                dateCreated         : user.dateCreated,
                lastUpdated         : user.lastUpdated,
                version             : user.version,
        ]
    }
}
