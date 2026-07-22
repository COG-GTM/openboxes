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
import org.springframework.web.multipart.MultipartFile

import java.nio.charset.Charset

import org.pih.warehouse.core.Localization

/**
 * CRUD API over the Localization domain (database translation overrides),
 * backing the React localization screens. The message-lookup API
 * ("/api/localizations") is handled separately by LocalizationApiController.
 */
class LocalizationOverrideApiController {

    def list() {
        Integer max = Math.min(params.max ? params.int('max') : 10, 100)
        Integer offset = params.offset ? params.int('offset') : 0
        String sort = params.sort in ['id', 'code', 'locale', 'text', 'dateCreated', 'lastUpdated'] ? params.sort : 'code'
        String sortOrder = params.order == 'desc' ? 'desc' : 'asc'
        String defaultLocale = grailsApplication.config.openboxes.locale.defaultLocale
        Locale sessionLocale = session?.user?.locale ?: session?.locale ?: new Locale(defaultLocale)
        String currentLocale = sessionLocale.language
        String locale = params.containsKey("locale") ? params.locale : currentLocale
        def results = Localization.createCriteria().list(max: max, offset: offset) {
            if (locale) {
                eq("locale", locale)
            }
            if (params.q) {
                or {
                    ilike("code", params.q + "%")
                    ilike("text", "%" + params.q + "%")
                }
            }
            order(sort, sortOrder)
        }
        render([data: results.collect { toJson(it) }, totalCount: results.totalCount] as JSON)
    }

    def read() {
        Localization localization = Localization.get(params.id)
        if (!localization) {
            throw new ObjectNotFoundException(params.id, Localization.class.toString())
        }
        render([data: toJson(localization)] as JSON)
    }

    @Transactional
    def create() {
        def jsonObject = request.JSON
        Localization localization = new Localization()
        bindLocalization(localization, jsonObject)
        if (localization.hasErrors() || !localization.save(flush: true)) {
            throw new ValidationException("Invalid localization", localization.errors)
        }
        response.status = HttpStatus.CREATED.value()
        render([data: toJson(localization)] as JSON)
    }

    @Transactional
    def update() {
        Localization localization = Localization.get(params.id)
        if (!localization) {
            throw new ObjectNotFoundException(params.id, Localization.class.toString())
        }
        def jsonObject = request.JSON
        bindLocalization(localization, jsonObject)
        if (localization.hasErrors() || !localization.save(flush: true)) {
            throw new ValidationException("Invalid localization", localization.errors)
        }
        render([data: toJson(localization)] as JSON)
    }

    @Transactional
    def delete() {
        Localization localization = Localization.get(params.id)
        if (!localization) {
            throw new ObjectNotFoundException(params.id, Localization.class.toString())
        }
        try {
            localization.delete(flush: true)
        } catch (DataIntegrityViolationException ignored) {
            transactionStatus.setRollbackOnly()
            String message = "${warehouse.message(code: 'default.not.deleted.message', args: [warehouse.message(code: 'localization.label', default: 'Localization'), params.id])}"
            response.status = HttpStatus.BAD_REQUEST.value()
            render([errorCode: HttpStatus.BAD_REQUEST.value(), errorMessage: message] as JSON)
            return
        }
        render status: HttpStatus.NO_CONTENT.value()
    }

    /**
     * Multipart import of a messages.properties file for a locale; mirrors
     * the legacy LocalizationController.upload action.
     */
    @Transactional
    def importMessages() {
        String locale = params.locale
        MultipartFile messageProperties = request.getFile("messageProperties")
        if (!locale || !messageProperties || messageProperties.empty) {
            response.status = HttpStatus.BAD_REQUEST.value()
            render([errorCode: HttpStatus.BAD_REQUEST.value(),
                    errorMessage: "Both a locale and a non-empty messageProperties file are required"] as JSON)
            return
        }
        Properties properties = new Properties()
        properties.load(new InputStreamReader(messageProperties.inputStream, Charset.forName("UTF-8")))
        Integer importedCount = 0
        properties.stringPropertyNames().each { String property ->
            String text = properties.getProperty(property)
            Localization localization = Localization.findByCodeAndLocale(property, locale)
            if (!localization) {
                localization = new Localization(code: property, locale: locale, text: text)
            }
            localization.text = text
            localization.save()
            importedCount++
        }
        render([data: [importedCount: importedCount]] as JSON)
    }

    private static void bindLocalization(Localization localization, jsonObject) {
        if (jsonObject.containsKey("code")) {
            localization.code = jsonObject.code ?: null
        }
        if (jsonObject.containsKey("locale")) {
            localization.locale = jsonObject.locale ?: null
        }
        if (jsonObject.containsKey("text")) {
            localization.text = jsonObject.text ?: null
        }
        localization.validate()
    }

    private static Map toJson(Localization localization) {
        return [
                id         : localization.id,
                code       : localization.code,
                locale     : localization.locale,
                text       : localization.text,
                dateCreated: localization.dateCreated,
                lastUpdated: localization.lastUpdated,
                version    : localization.version,
        ]
    }
}
