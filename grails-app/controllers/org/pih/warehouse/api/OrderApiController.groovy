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
import org.springframework.http.HttpStatus

import org.pih.warehouse.core.Comment
import org.pih.warehouse.core.User
import org.pih.warehouse.order.Order

class OrderApiController {

    def read() {
        Order order = Order.get(params.id)
        if (!order) {
            response.status = HttpStatus.NOT_FOUND.value()
            render([errorCode: HttpStatus.NOT_FOUND.value(), errorMessage: "Order ${params.id} not found"] as JSON)
            return
        }
        render([data: toJson(order)] as JSON)
    }

    /**
     * Mirrors the legacy OrderController.saveComment action (create branch) for
     * the migrated order add comment screen.
     */
    @Transactional
    def createComment() {
        Order order = Order.get(params.id)
        if (!order) {
            response.status = HttpStatus.NOT_FOUND.value()
            render([errorCode: HttpStatus.NOT_FOUND.value(), errorMessage: "Order ${params.id} not found"] as JSON)
            return
        }
        def jsonObject = request.JSON
        Comment comment = new Comment(
                comment: jsonObject.comment ?: null,
                sender: User.get(session.user.id),
                recipient: jsonObject.recipient?.id ? User.get(jsonObject.recipient.id) : null)
        comment.validate()
        if (comment.hasErrors()) {
            transactionStatus.setRollbackOnly()
            response.status = HttpStatus.BAD_REQUEST.value()
            render([errorCode: HttpStatus.BAD_REQUEST.value(), errorMessage: "Validation errors",
                    errors: comment.errors.allErrors.collect { g.message(error: it) }] as JSON)
            return
        }
        order.addToComments(comment)
        if (order.hasErrors() || !order.save(flush: true)) {
            transactionStatus.setRollbackOnly()
            response.status = HttpStatus.BAD_REQUEST.value()
            render([errorCode: HttpStatus.BAD_REQUEST.value(), errorMessage: "Validation errors",
                    errors: order.errors.allErrors.collect { g.message(error: it) }] as JSON)
            return
        }
        response.status = HttpStatus.CREATED.value()
        render([data: [
                id       : comment.id,
                comment  : comment.comment,
                sender   : comment.sender ? [id: comment.sender.id, name: comment.sender.name] : null,
                recipient: comment.recipient ? [id: comment.recipient.id, name: comment.recipient.name] : null,
        ]] as JSON)
    }

    private static Map toJson(Order order) {
        return [
                id           : order.id,
                orderNumber  : order.orderNumber,
                name         : order.name,
                description  : order.description,
                status       : order.status?.name(),
                orderType    : [
                        id  : order.orderType?.id,
                        code: order.orderType?.code,
                        name: order.orderType?.name,
                ],
                isPutawayOrder: order.orderType?.isPutawayOrder() ?: false,
        ]
    }
}
