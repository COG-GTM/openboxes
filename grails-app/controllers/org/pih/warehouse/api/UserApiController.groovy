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
import org.pih.warehouse.LocalizationUtil
import org.pih.warehouse.core.User
import org.pih.warehouse.core.UserService
import org.springframework.http.HttpStatus
import org.springframework.web.multipart.MultipartFile

/**
 * User API backing the React user/create and user/changePhoto screens.
 * Role and location-role assignment is intentionally not exposed here
 * (the legacy create form doesn't expose it either); roles are managed
 * from the user edit screen.
 */
class UserApiController {

    UserService userService
    def mailService

    def read() {
        User user = User.get(params.id)
        if (!user) {
            response.status = HttpStatus.NOT_FOUND.value()
            render([errorCode: HttpStatus.NOT_FOUND.value(),
                    errorMessage: "No user found for id ${params.id}".toString()] as JSON)
            return
        }
        render([data: toJson(user)] as JSON)
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
            response.status = HttpStatus.BAD_REQUEST.value()
            render([errorCode: HttpStatus.BAD_REQUEST.value(),
                    errorMessages: e.errors.allErrors.collect { g.message(error: it) }] as JSON)
            return
        }
        response.status = HttpStatus.CREATED.value()
        render([data: toJson(user)] as JSON)
    }

    @Transactional
    def uploadPhoto() {
        User user = User.get(params.id)
        if (!user) {
            response.status = HttpStatus.NOT_FOUND.value()
            render([errorCode: HttpStatus.NOT_FOUND.value(),
                    errorMessage: "No user found for id ${params.id}".toString()] as JSON)
            return
        }
        MultipartFile photo = request.getFile("photo")
        // Same allow-list as the legacy UserController.uploadPhoto action
        List<String> okcontents = ['image/png', 'image/jpeg', 'image/gif']
        if (!photo || photo.empty) {
            response.status = HttpStatus.BAD_REQUEST.value()
            render([errorCode: HttpStatus.BAD_REQUEST.value(),
                    errorMessage: "A non-empty photo file is required"] as JSON)
            return
        }
        if (!okcontents.contains(photo.contentType)) {
            response.status = HttpStatus.BAD_REQUEST.value()
            render([errorCode: HttpStatus.BAD_REQUEST.value(),
                    errorMessage: "Photo must be one of: ${okcontents}".toString()] as JSON)
            return
        }
        if (photo.size >= 1024 * 1000) {
            response.status = HttpStatus.BAD_REQUEST.value()
            render([errorCode: HttpStatus.BAD_REQUEST.value(),
                    errorMessage: "Photo is too large (must be less than 1MB)"] as JSON)
            return
        }
        user.photo = photo.bytes
        if (user.hasErrors() || !user.save(flush: true)) {
            transactionStatus.setRollbackOnly()
            response.status = HttpStatus.BAD_REQUEST.value()
            render([errorCode: HttpStatus.BAD_REQUEST.value(),
                    errorMessage: "Unable to save photo for user ${user.username}".toString()] as JSON)
            return
        }
        sendUserPhotoChanged(user)
        render([data: toJson(user)] as JSON)
    }

    private void sendUserPhotoChanged(User user) {
        try {
            String subject = g.message(code: 'email.userPhotoChanged.message', args: [user?.email])
            String body = g.render(template: '/email/userPhotoChanged', model: [userInstance: user])
            mailService.sendHtmlMailWithAttachment(user, subject, body, user.photo, "photo.png", "image/png")
        } catch (Exception e) {
            log.warn("Unable to send photo-changed email to ${user.email}: ${e.message}")
        }
    }

    private static Map toJson(User user) {
        return [
                id       : user.id,
                username : user.username,
                firstName: user.firstName,
                lastName : user.lastName,
                email    : user.email,
                locale   : user.locale?.toString(),
                active   : user.active,
                hasPhoto : user.photo != null,
        ]
    }
}
