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
import grails.core.GrailsApplication
import grails.gorm.transactions.Transactional
import org.pih.warehouse.auth.UserSignupEvent
import org.springframework.context.i18n.LocaleContextHolder
import org.pih.warehouse.core.User

/**
 * JSON endpoints backing the React auth/login and auth/signup screens.
 * Mirrors AuthController.handleLogin and AuthController.handleSignup.
 */
class AuthApiController {

    def userService
    def recaptchaService
    GrailsApplication grailsApplication
    def messageSource

    def login() {
        String username = request.JSON.username
        String password = request.JSON.password
        User userInstance = User.findByUsernameOrEmail(username, username)
        if (!userInstance) {
            response.status = 401
            render([errorCode: 401, errorMessage: warehouse.message(code: 'auth.userNotFound.message', args: [username])] as JSON)
            return
        }

        // Same timezone resolution as AuthController.handleLogin: prefer the
        // user's saved timezone, fall back to the browser-provided one.
        TimeZone userTimezone = TimeZone.getTimeZone("America/New_York")
        if (userInstance.timezone) {
            userTimezone = TimeZone.getTimeZone(userInstance.timezone)
        } else if (request.JSON.browserTimezone) {
            userTimezone = TimeZone.getTimeZone(request.JSON.browserTimezone as String)
        }
        session.timezone = userTimezone

        if (!userInstance.active) {
            response.status = 401
            render([errorCode: 401, errorMessage: warehouse.message(code: 'auth.accountRequestUnderReview.message')] as JSON)
            return
        }

        if (userService.authenticate(username, password)) {
            session.user = userInstance
            session.userName = userInstance.username

            // PIMS-782 Force the user to select a warehouse each time
            if (userInstance.warehouse && userInstance.rememberLastLocation) {
                session.warehouse = userInstance.warehouse
            }

            String redirectUrl = "/dashboard/index"
            if (session.targetUri) {
                redirectUrl = session.targetUri
                session.targetUri = null
            } else if (request.JSON.targetUri) {
                redirectUrl = request.JSON.targetUri
            }
            render([data: [redirectUrl: redirectUrl]] as JSON)
            return
        }

        response.status = 401
        render([errorCode: 401, errorMessage: warehouse.message(code: 'auth.incorrectPassword.label', args: [username])] as JSON)
    }

    def signupConfig() {
        Boolean enabled = grailsApplication.config.openboxes.signup.enabled ?: false
        Boolean recaptchaConfigured = grailsApplication.config.openboxes.signup.recaptcha.v2.secretKey?.trim() as Boolean
        Boolean recaptchaEnabled = grailsApplication.config.openboxes.signup.recaptcha.enabled ?: false
        Boolean additionalQuestionsEnabled = grailsApplication.config.openboxes.signup.additionalQuestions.enabled ?: false
        def additionalQuestions = additionalQuestionsEnabled
                ? grailsApplication.config.openboxes.signup.additionalQuestions.content.collect { question ->
                    [
                            id     : question.id,
                            label  : question.label,
                            options: question.options ? question.options.collect { [key: it.key, value: it.value] } : null,
                    ]
                }
                : []
        def locales = grailsApplication.config.openboxes.locale.supportedLocales
        def supportedLocales = locales.collect { [code: it, name: new Locale(it as String).getDisplayName(new Locale(it as String))] }
        render([data: [
                enabled                   : enabled,
                recaptchaConfigured       : recaptchaConfigured,
                recaptchaEnabled          : recaptchaEnabled,
                recaptchaSiteKey          : recaptchaEnabled ? grailsApplication.config.openboxes.signup.recaptcha.v2.siteKey : null,
                additionalQuestionsEnabled: additionalQuestionsEnabled,
                additionalQuestions       : additionalQuestions,
                supportedLocales          : supportedLocales,
        ]] as JSON)
    }

    @Transactional
    def signup() {
        Boolean enabled = grailsApplication.config.openboxes.signup.enabled ?: false
        if (!enabled) {
            response.status = 400
            render([errorCode: 400, errorMessage: "Apologies, but the signup feature is disabled on your system. " +
                    "Please contact a system administrator for access."] as JSON)
            return
        }

        def json = request.JSON
        User userInstance = new User()
        userInstance.firstName = json.firstName
        userInstance.lastName = json.lastName
        userInstance.email = json.email
        if (json.password) {
            userInstance.password = (json.password as String).encodeAsPassword()
            userInstance.passwordConfirm = (json.passwordConfirm as String).encodeAsPassword()
        }
        userInstance.locale = json.locale ? new Locale(json.locale as String) : null
        userInstance.timezone = json.timezone ?: null
        userInstance.active = Boolean.FALSE

        // Set the email as username for backwards compatibility since we're no longer including username on signup
        userInstance.username = json.email

        // Verify recaptcha challenge response if recaptcha is enabled
        Boolean recaptchaEnabled = grailsApplication.config.openboxes.signup.recaptcha.enabled ?: false
        if (recaptchaEnabled && !recaptchaService.validate(json["g-recaptcha-response"] as String)) {
            userInstance.errors.reject("signup.recaptcha.fail.message",
                    "Nice try, robot. But your feeble attempt has failed. If you're not a robot we apologize. Please try again.")
        }

        if (!userInstance.hasErrors() && userInstance.save(flush: true)) {
            userService.assignDefaultRoles(userInstance)

            // Publish event to trigger email notifications
            grailsApplication.mainContext.publishEvent(new UserSignupEvent(userInstance, json.additionalQuestions as Map))

            response.status = 201
            render([data: [
                    id     : userInstance.id,
                    email  : userInstance.email,
                    message: warehouse.message(code: 'default.created.message',
                            args: [warehouse.message(code: 'user.label'), userInstance.email]),
            ]] as JSON)
            return
        }

        transactionStatus.setRollbackOnly()
        response.status = 400
        Locale currentLocale = LocaleContextHolder.locale
        List errorMessages = userInstance.errors.allErrors.collect { messageSource.getMessage(it, currentLocale) }
        render([errorCode: 400, errorMessage: "Validation error", errorMessages: errorMessages] as JSON)
    }
}
