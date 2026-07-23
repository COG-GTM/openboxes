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

import org.pih.warehouse.core.EventCode
import org.pih.warehouse.core.EventType

class EventTypeApiController {

    def list() {
        Integer max = Math.min(params.max ? params.int('max') : 10, 100)
        Integer offset = params.offset ? params.int('offset') : 0
        String sort = params.sort in ['id', 'name', 'description', 'sortOrder', 'eventCode'] ? params.sort : 'sortOrder'
        String sortOrder = params.order == 'desc' ? 'desc' : 'asc'
        def results = EventType.createCriteria().list(max: max, offset: offset) {
            if (params.q) {
                ilike("name", "${params.q}%")
            }
            order(sort, sortOrder)
        }
        render([data: results.collect { toJson(it) }, totalCount: results.totalCount] as JSON)
    }

    def read() {
        EventType eventType = EventType.get(params.id)
        if (!eventType) {
            throw new ObjectNotFoundException(params.id, EventType.class.toString())
        }
        render([data: toJson(eventType)] as JSON)
    }

    @Transactional
    def create() {
        EventType eventType = new EventType()
        bindEventType(eventType, request.JSON)
        if (eventType.hasErrors() || !eventType.save(flush: true)) {
            throw new ValidationException("Invalid event type", eventType.errors)
        }
        response.status = HttpStatus.CREATED.value()
        render([data: toJson(eventType)] as JSON)
    }

    @Transactional
    def update() {
        EventType eventType = EventType.get(params.id)
        if (!eventType) {
            throw new ObjectNotFoundException(params.id, EventType.class.toString())
        }
        bindEventType(eventType, request.JSON)
        if (eventType.hasErrors() || !eventType.save(flush: true)) {
            throw new ValidationException("Invalid event type", eventType.errors)
        }
        render([data: toJson(eventType)] as JSON)
    }

    @Transactional
    def delete() {
        EventType eventType = EventType.get(params.id)
        if (!eventType) {
            throw new ObjectNotFoundException(params.id, EventType.class.toString())
        }
        try {
            eventType.delete(flush: true)
        } catch (DataIntegrityViolationException ignored) {
            transactionStatus.setRollbackOnly()
            String message = "${warehouse.message(code: 'default.not.deleted.message', args: [warehouse.message(code: 'eventType.label', default: 'Event Type'), params.id])}"
            response.status = HttpStatus.BAD_REQUEST.value()
            render([errorCode: HttpStatus.BAD_REQUEST.value(), errorMessage: message] as JSON)
            return
        }
        render status: HttpStatus.NO_CONTENT.value()
    }

    private void bindEventType(EventType eventType, jsonObject) {
        if (jsonObject.containsKey("name")) {
            eventType.name = jsonObject.name ?: null
        }
        if (jsonObject.containsKey("description")) {
            eventType.description = jsonObject.description ?: null
        }
        if (jsonObject.containsKey("sortOrder")) {
            eventType.sortOrder = jsonObject.sortOrder != null && jsonObject.sortOrder != ""
                    ? jsonObject.sortOrder as Integer
                    : null
        }
        if (jsonObject.containsKey("eventCode")) {
            eventType.eventCode = jsonObject.eventCode
                    ? jsonObject.eventCode as EventCode
                    : null
        }
        eventType.validate()
    }

    private static Map toJson(EventType eventType) {
        return [
                id         : eventType.id,
                name       : eventType.name,
                description: eventType.description,
                sortOrder  : eventType.sortOrder,
                eventCode  : eventType.eventCode?.name(),
                active     : eventType.active,
                optionValue: eventType.optionValue,
                dateCreated: eventType.dateCreated,
                lastUpdated: eventType.lastUpdated,
                version    : eventType.version,
        ]
    }
}
