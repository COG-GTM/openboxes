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

import org.pih.warehouse.core.UnitOfMeasure
import org.pih.warehouse.core.UnitOfMeasureConversion

@Transactional
class UnitOfMeasureConversionApiController {

    private static final List<String> SORTABLE_PROPERTIES = [
            "id", "active", "conversionRate", "dateCreated", "lastUpdated",
    ]

    private static final List<String> SORTABLE_ASSOCIATIONS = [
            "fromUnitOfMeasure", "toUnitOfMeasure",
    ]

    def list() {
        Integer max = Math.min(params.max ? params.int('max') : 10, 100)
        Integer offset = params.offset ? params.int('offset') : 0
        String sortOrder = params.order == 'desc' ? 'desc' : 'asc'
        String sort = (params.sort in SORTABLE_PROPERTIES || params.sort in SORTABLE_ASSOCIATIONS)
                ? params.sort
                : 'dateCreated'
        def results = UnitOfMeasureConversion.createCriteria().list(max: max, offset: offset) {
            if (sort in SORTABLE_ASSOCIATIONS) {
                createAlias(sort, "${sort}Alias")
                order("${sort}Alias.name", sortOrder)
            } else {
                order(sort, sortOrder)
            }
        }
        render([data: results.collect { toJson(it) }, totalCount: results.totalCount] as JSON)
    }

    def read() {
        UnitOfMeasureConversion uomConversion = UnitOfMeasureConversion.get(params.id)
        if (!uomConversion) {
            throw new ObjectNotFoundException(params.id, UnitOfMeasureConversion.class.toString())
        }
        render([data: toJson(uomConversion)] as JSON)
    }

    def create() {
        UnitOfMeasureConversion uomConversion = new UnitOfMeasureConversion()
        bindUomConversion(uomConversion, request.JSON)
        if (uomConversion.hasErrors() || !uomConversion.save(flush: true)) {
            throw new ValidationException("Invalid unit of measure conversion", uomConversion.errors)
        }
        response.status = HttpStatus.CREATED.value()
        render([data: toJson(uomConversion)] as JSON)
    }

    def update() {
        UnitOfMeasureConversion uomConversion = UnitOfMeasureConversion.get(params.id)
        if (!uomConversion) {
            throw new ObjectNotFoundException(params.id, UnitOfMeasureConversion.class.toString())
        }
        bindUomConversion(uomConversion, request.JSON)
        if (uomConversion.hasErrors() || !uomConversion.save(flush: true)) {
            throw new ValidationException("Invalid unit of measure conversion", uomConversion.errors)
        }
        render([data: toJson(uomConversion)] as JSON)
    }

    def delete() {
        UnitOfMeasureConversion uomConversion = UnitOfMeasureConversion.get(params.id)
        if (!uomConversion) {
            throw new ObjectNotFoundException(params.id, UnitOfMeasureConversion.class.toString())
        }
        try {
            uomConversion.delete(flush: true)
        } catch (DataIntegrityViolationException ignored) {
            transactionStatus.setRollbackOnly()
            String message = "${warehouse.message(code: 'default.not.deleted.message', args: [warehouse.message(code: 'unitOfMeasureConversion.label', default: 'Unit of Measure conversion'), params.id])}"
            response.status = HttpStatus.BAD_REQUEST.value()
            render([errorCode: HttpStatus.BAD_REQUEST.value(), errorMessage: message] as JSON)
            return
        }
        render status: HttpStatus.NO_CONTENT.value()
    }

    private void bindUomConversion(UnitOfMeasureConversion uomConversion, jsonObject) {
        if (jsonObject.containsKey("fromUnitOfMeasure")) {
            String fromId = jsonObject.fromUnitOfMeasure instanceof Map
                    ? jsonObject.fromUnitOfMeasure.id
                    : jsonObject.fromUnitOfMeasure
            uomConversion.fromUnitOfMeasure = fromId ? UnitOfMeasure.get(fromId) : null
        }
        if (jsonObject.containsKey("toUnitOfMeasure")) {
            String toId = jsonObject.toUnitOfMeasure instanceof Map
                    ? jsonObject.toUnitOfMeasure.id
                    : jsonObject.toUnitOfMeasure
            uomConversion.toUnitOfMeasure = toId ? UnitOfMeasure.get(toId) : null
        }
        boolean invalidConversionRate = false
        if (jsonObject.containsKey("conversionRate")) {
            try {
                uomConversion.conversionRate = parseConversionRate(jsonObject.conversionRate)
            } catch (NumberFormatException ignored) {
                uomConversion.conversionRate = null
                invalidConversionRate = true
            }
        }
        if (jsonObject.containsKey("active")) {
            uomConversion.active = Boolean.parseBoolean(jsonObject.active.toString())
        }
        // validate() resets the errors object, so type errors must be rejected after it
        uomConversion.validate()
        if (invalidConversionRate) {
            uomConversion.errors.rejectValue("conversionRate", "typeMismatch.java.math.BigDecimal",
                    [jsonObject.conversionRate] as Object[], "Conversion rate must be a valid number")
        }
    }

    private static BigDecimal parseConversionRate(value) {
        if (value == null || value.toString().trim() == "") {
            return null
        }
        return new BigDecimal(value.toString().trim())
    }

    private static Map toJson(UnitOfMeasureConversion uomConversion) {
        return [
                id               : uomConversion.id,
                active           : uomConversion.active,
                fromUnitOfMeasure: uomConversion.fromUnitOfMeasure ? [
                        id  : uomConversion.fromUnitOfMeasure.id,
                        name: uomConversion.fromUnitOfMeasure.name,
                        code: uomConversion.fromUnitOfMeasure.code,
                ] : null,
                toUnitOfMeasure  : uomConversion.toUnitOfMeasure ? [
                        id  : uomConversion.toUnitOfMeasure.id,
                        name: uomConversion.toUnitOfMeasure.name,
                        code: uomConversion.toUnitOfMeasure.code,
                ] : null,
                conversionRate   : uomConversion.conversionRate,
                dateCreated      : uomConversion.dateCreated,
                lastUpdated      : uomConversion.lastUpdated,
        ]
    }
}
