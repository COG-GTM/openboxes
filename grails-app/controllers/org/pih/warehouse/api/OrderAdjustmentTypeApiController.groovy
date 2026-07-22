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
import org.springframework.http.HttpStatus

import org.pih.warehouse.core.GlAccount
import org.pih.warehouse.core.Location
import org.pih.warehouse.order.OrderAdjustmentType
import org.pih.warehouse.order.OrderAdjustmentTypeCode

class OrderAdjustmentTypeApiController {

    def list() {
        Integer max = Math.min(params.max ? params.int('max') : 10, 100)
        Integer offset = params.offset ? params.int('offset') : 0
        String sort = params.sort in ['id', 'name', 'description', 'code', 'dateCreated', 'lastUpdated'] ? params.sort : 'id'
        String sortOrder = params.order == 'desc' ? 'desc' : 'asc'
        def results = OrderAdjustmentType.createCriteria().list(max: max, offset: offset) {
            if (params.q) {
                ilike("name", "${params.q}%")
            }
            order(sort, sortOrder)
        }
        render([data: results.collect { toJson(it) }, totalCount: results.totalCount] as JSON)
    }

    def read() {
        OrderAdjustmentType orderAdjustmentType = OrderAdjustmentType.get(params.id)
        if (!orderAdjustmentType) {
            throw new ObjectNotFoundException(params.id, OrderAdjustmentType.class.toString())
        }
        render([data: toJson(orderAdjustmentType)] as JSON)
    }

    @Transactional
    def create() {
        def jsonObject = request.JSON
        String validationError = validateAccountingRequirement(jsonObject) ?: validateCode(jsonObject)
        if (validationError) {
            response.status = HttpStatus.BAD_REQUEST.value()
            render([errorCode: HttpStatus.BAD_REQUEST.value(), errorMessage: validationError] as JSON)
            return
        }
        OrderAdjustmentType orderAdjustmentType = new OrderAdjustmentType()
        bindOrderAdjustmentType(orderAdjustmentType, jsonObject)
        if (orderAdjustmentType.hasErrors() || !orderAdjustmentType.save(flush: true)) {
            throw new ValidationException("Invalid order adjustment type", orderAdjustmentType.errors)
        }
        response.status = HttpStatus.CREATED.value()
        render([data: toJson(orderAdjustmentType)] as JSON)
    }

    @Transactional
    def update() {
        OrderAdjustmentType orderAdjustmentType = OrderAdjustmentType.get(params.id)
        if (!orderAdjustmentType) {
            throw new ObjectNotFoundException(params.id, OrderAdjustmentType.class.toString())
        }
        def jsonObject = request.JSON
        String validationError = validateAccountingRequirement(jsonObject) ?: validateCode(jsonObject)
        if (validationError) {
            response.status = HttpStatus.BAD_REQUEST.value()
            render([errorCode: HttpStatus.BAD_REQUEST.value(), errorMessage: validationError] as JSON)
            return
        }
        bindOrderAdjustmentType(orderAdjustmentType, jsonObject)
        if (orderAdjustmentType.hasErrors() || !orderAdjustmentType.save(flush: true)) {
            throw new ValidationException("Invalid order adjustment type", orderAdjustmentType.errors)
        }
        render([data: toJson(orderAdjustmentType)] as JSON)
    }

    /**
     * When the current location requires accounting, a GL account is required
     * (mirrors the client-side validateForm check on the legacy screens).
     */
    private String validateAccountingRequirement(jsonObject) {
        Location currentLocation = Location.get(session.warehouse.id)
        if (currentLocation.isAccountingRequired() && !jsonObject.glAccount?.id) {
            return "GL account is required"
        }
        return null
    }

    private static String validateCode(jsonObject) {
        String code = jsonObject.containsKey("code") ? jsonObject.code as String : null
        if (code && !OrderAdjustmentTypeCode.values().any { it.name() == code }) {
            return "Invalid order adjustment type code '${code}'"
        }
        return null
    }

    private void bindOrderAdjustmentType(OrderAdjustmentType orderAdjustmentType, jsonObject) {
        if (jsonObject.containsKey("name")) {
            orderAdjustmentType.name = jsonObject.name ?: null
        }
        if (jsonObject.containsKey("description")) {
            orderAdjustmentType.description = jsonObject.description ?: null
        }
        if (jsonObject.containsKey("code")) {
            orderAdjustmentType.code = jsonObject.code
                    ? OrderAdjustmentTypeCode.valueOf(jsonObject.code as String)
                    : null
        }
        if (jsonObject.containsKey("glAccount")) {
            orderAdjustmentType.glAccount = jsonObject.glAccount?.id
                    ? GlAccount.get(jsonObject.glAccount.id)
                    : null
        }
        orderAdjustmentType.validate()
    }

    private static Map toJson(OrderAdjustmentType orderAdjustmentType) {
        return [
                id         : orderAdjustmentType.id,
                name       : orderAdjustmentType.name,
                description: orderAdjustmentType.description,
                code       : orderAdjustmentType.code?.name(),
                glAccount  : orderAdjustmentType.glAccount ? [
                        id  : orderAdjustmentType.glAccount.id,
                        code: orderAdjustmentType.glAccount.code,
                        name: orderAdjustmentType.glAccount.name,
                ] : null,
                dateCreated: orderAdjustmentType.dateCreated,
                lastUpdated: orderAdjustmentType.lastUpdated,
        ]
    }
}
