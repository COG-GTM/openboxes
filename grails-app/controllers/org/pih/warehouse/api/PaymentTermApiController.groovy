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

import org.pih.warehouse.core.PaymentTerm

class PaymentTermApiController {

    def list() {
        Integer max = Math.min(params.max ? params.int('max') : 10, 100)
        Integer offset = params.offset ? params.int('offset') : 0
        String sort = params.sort in ['id', 'code', 'name', 'description', 'prepaymentPercent', 'daysToPayment'] ? params.sort : 'id'
        String sortOrder = params.order == 'desc' ? 'desc' : 'asc'
        def results = PaymentTerm.createCriteria().list(max: max, offset: offset) {
            if (params.q) {
                ilike("name", "${params.q}%")
            }
            order(sort, sortOrder)
        }
        render([data: results.collect { toJson(it) }, totalCount: results.totalCount] as JSON)
    }

    def read() {
        PaymentTerm paymentTerm = PaymentTerm.get(params.id)
        if (!paymentTerm) {
            throw new ObjectNotFoundException(params.id, PaymentTerm.class.toString())
        }
        render([data: toJson(paymentTerm)] as JSON)
    }

    /**
     * Creates a payment term for the migrated paymentTerm create screen
     * (mirrors the create branch of the legacy PaymentTermController.save
     * action).
     */
    @Transactional
    def create() {
        def jsonObject = request.JSON
        PaymentTerm paymentTerm = new PaymentTerm()
        bindPaymentTerm(paymentTerm, jsonObject)
        if (paymentTerm.hasErrors() || !paymentTerm.save(flush: true)) {
            throw new ValidationException("Invalid payment term", paymentTerm.errors)
        }
        response.status = HttpStatus.CREATED.value()
        render([data: toJson(paymentTerm)] as JSON)
    }

    /**
     * Updates a payment term for the migrated paymentTerm edit screen
     * (mirrors the update branch of the legacy PaymentTermController.save
     * action).
     */
    @Transactional
    def update() {
        PaymentTerm paymentTerm = PaymentTerm.get(params.id)
        if (!paymentTerm) {
            throw new ObjectNotFoundException(params.id, PaymentTerm.class.toString())
        }
        def jsonObject = request.JSON
        bindPaymentTerm(paymentTerm, jsonObject)
        if (paymentTerm.hasErrors() || !paymentTerm.save(flush: true)) {
            throw new ValidationException("Invalid payment term", paymentTerm.errors)
        }
        render([data: toJson(paymentTerm)] as JSON)
    }

    private static void bindPaymentTerm(PaymentTerm paymentTerm, jsonObject) {
        if (jsonObject.containsKey("code")) {
            paymentTerm.code = jsonObject.code ?: null
        }
        if (jsonObject.containsKey("name")) {
            paymentTerm.name = jsonObject.name ?: null
        }
        if (jsonObject.containsKey("description")) {
            paymentTerm.description = jsonObject.description ?: null
        }
        if (jsonObject.containsKey("prepaymentPercent")) {
            paymentTerm.prepaymentPercent = jsonObject.prepaymentPercent != null && jsonObject.prepaymentPercent != ""
                    ? new BigDecimal(jsonObject.prepaymentPercent.toString())
                    : null
        }
        if (jsonObject.containsKey("daysToPayment")) {
            paymentTerm.daysToPayment = jsonObject.daysToPayment != null && jsonObject.daysToPayment != ""
                    ? jsonObject.daysToPayment as Integer
                    : null
        }
        paymentTerm.validate()
    }

    private static Map toJson(PaymentTerm paymentTerm) {
        return [
                id               : paymentTerm.id,
                code             : paymentTerm.code,
                name             : paymentTerm.name,
                description      : paymentTerm.description,
                prepaymentPercent: paymentTerm.prepaymentPercent,
                daysToPayment    : paymentTerm.daysToPayment,
        ]
    }
}
