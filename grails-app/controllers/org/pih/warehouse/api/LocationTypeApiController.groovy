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

import org.pih.warehouse.core.LocationType
import org.pih.warehouse.core.LocationTypeCode

class LocationTypeApiController {

    def list() {
        Integer max = Math.min(params.max ? params.int('max') : 10, 100)
        Integer offset = params.offset ? params.int('offset') : 0
        String sort = params.sort in ['name', 'sortOrder'] ? params.sort : 'sortOrder'
        String sortOrder = params.order == 'desc' ? 'desc' : 'asc'
        def results = LocationType.createCriteria().list(max: max, offset: offset) {
            if (params.q) {
                ilike("name", "${params.q}%")
            }
            order(sort, sortOrder)
        }
        render([data: results.collect { toJson(it) }, totalCount: results.totalCount] as JSON)
    }

    def read() {
        LocationType locationType = LocationType.get(params.id)
        if (!locationType) {
            throw new ObjectNotFoundException(params.id, LocationType.class.toString())
        }
        render([data: toJson(locationType)] as JSON)
    }

    @Transactional
    def create() {
        def jsonObject = request.JSON
        LocationType locationType = new LocationType()
        bindLocationType(locationType, jsonObject)
        if (locationType.hasErrors() || !locationType.save(flush: true)) {
            throw new ValidationException("Invalid location type", locationType.errors)
        }
        response.status = HttpStatus.CREATED.value()
        render([data: toJson(locationType)] as JSON)
    }

    @Transactional
    def update() {
        LocationType locationType = LocationType.get(params.id)
        if (!locationType) {
            throw new ObjectNotFoundException(params.id, LocationType.class.toString())
        }
        def jsonObject = request.JSON
        bindLocationType(locationType, jsonObject)
        if (locationType.hasErrors() || !locationType.save(flush: true)) {
            throw new ValidationException("Invalid location type", locationType.errors)
        }
        render([data: toJson(locationType)] as JSON)
    }

    @Transactional
    def delete() {
        LocationType locationType = LocationType.get(params.id)
        if (!locationType) {
            throw new ObjectNotFoundException(params.id, LocationType.class.toString())
        }
        try {
            locationType.delete(flush: true)
        } catch (DataIntegrityViolationException ignored) {
            transactionStatus.setRollbackOnly()
            String message = "${warehouse.message(code: 'default.not.deleted.message', args: [warehouse.message(code: 'locationType.label', default: 'Location Type'), params.id])}"
            response.status = HttpStatus.BAD_REQUEST.value()
            render([errorCode: HttpStatus.BAD_REQUEST.value(), errorMessage: message] as JSON)
            return
        }
        render status: HttpStatus.NO_CONTENT.value()
    }

    private void bindLocationType(LocationType locationType, jsonObject) {
        if (jsonObject.containsKey("name")) {
            locationType.name = jsonObject.name ?: null
        }
        if (jsonObject.containsKey("description")) {
            locationType.description = jsonObject.description ?: null
        }
        if (jsonObject.containsKey("locationTypeCode")) {
            locationType.locationTypeCode = jsonObject.locationTypeCode
                    ? LocationTypeCode.valueOf(jsonObject.locationTypeCode as String)
                    : null
        }
        if (jsonObject.containsKey("sortOrder")) {
            locationType.sortOrder = jsonObject.sortOrder != null && jsonObject.sortOrder != ""
                    ? jsonObject.sortOrder as Integer
                    : null
        }
        if (jsonObject.containsKey("supportedActivities")) {
            Set<String> activities = (jsonObject.supportedActivities ?: []).collect { it as String } as Set
            if (locationType.supportedActivities == null) {
                locationType.supportedActivities = activities
            } else {
                locationType.supportedActivities.clear()
                locationType.supportedActivities.addAll(activities)
            }
        }
        locationType.validate()
    }

    private static Map toJson(LocationType locationType) {
        return [
                id                 : locationType.id,
                name               : locationType.name,
                description        : locationType.description,
                locationTypeCode   : locationType.locationTypeCode?.name(),
                supportedActivities: (locationType.supportedActivities ?: []) as List,
                sortOrder          : locationType.sortOrder,
                dateCreated        : locationType.dateCreated,
                lastUpdated        : locationType.lastUpdated,
                version            : locationType.version,
        ]
    }
}
