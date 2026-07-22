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
import org.springframework.http.HttpStatus

import org.pih.warehouse.core.PaymentTerm

class PaymentTermApiController {

    /**
     * Creates a payment term for the migrated paymentTerm create screen
     * (mirrors the create branch of the legacy PaymentTermController.save
     * action).
     */
    @Transactional
    def create() {
        def jsonObject = request.JSON
        PaymentTerm paymentTerm = new PaymentTerm(
                code: jsonObject.code ?: null,
                name: jsonObject.name ?: null,
                description: jsonObject.description ?: null,
                prepaymentPercent: jsonObject.prepaymentPercent != null && jsonObject.prepaymentPercent != ""
                        ? new BigDecimal(jsonObject.prepaymentPercent.toString())
                        : null,
                daysToPayment: jsonObject.daysToPayment != null && jsonObject.daysToPayment != ""
                        ? jsonObject.daysToPayment as Integer
                        : null)
        if (paymentTerm.hasErrors() || !paymentTerm.save(flush: true)) {
            throw new ValidationException("Invalid payment term", paymentTerm.errors)
        }
        response.status = HttpStatus.CREATED.value()
        render([data: [
                id               : paymentTerm.id,
                code             : paymentTerm.code,
                name             : paymentTerm.name,
                description      : paymentTerm.description,
                prepaymentPercent: paymentTerm.prepaymentPercent,
                daysToPayment    : paymentTerm.daysToPayment,
        ]] as JSON)
    }
}
