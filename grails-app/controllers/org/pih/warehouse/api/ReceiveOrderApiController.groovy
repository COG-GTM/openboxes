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
import org.grails.orm.hibernate.cfg.GrailsHibernateUtil
import org.springframework.http.HttpStatus

import org.pih.warehouse.core.Location
import org.pih.warehouse.core.Person
import org.pih.warehouse.core.User
import org.pih.warehouse.order.Order
import org.pih.warehouse.order.OrderCommand
import org.pih.warehouse.order.OrderException
import org.pih.warehouse.order.OrderItem
import org.pih.warehouse.order.OrderItemCommand
import org.pih.warehouse.order.OrderService
import org.pih.warehouse.product.Product
import org.pih.warehouse.shipping.ReceiptException
import org.pih.warehouse.shipping.ShipmentException
import org.pih.warehouse.shipping.ShipmentType

@Transactional
class ReceiveOrderApiController {

    OrderService orderService
    def messageSource

    /**
     * Data for the migrated receive order workflow (mirrors the order and
     * order item command state assembled by the legacy
     * ReceiveOrderWorkflowController webflow via OrderService.getOrder).
     */
    def read() {
        Order order = Order.get(params.id)
        if (!order) {
            response.status = HttpStatus.NOT_FOUND.value()
            render([errorCode: HttpStatus.NOT_FOUND.value(), errorMessage: "Order ${params.id} not found"] as JSON)
            return
        }
        // The legacy webflow preset the recipient to the current user
        Person defaultRecipient = session.user?.id ? Person.get(session.user.id) : null
        render([data: [
                id              : order.id,
                defaultRecipient: defaultRecipient ? [id: defaultRecipient.id, name: defaultRecipient.name] : null,
                orderNumber: order.orderNumber,
                name       : order.name,
                dateOrdered: order.dateOrdered,
                origin     : order.origin ? [id: order.origin.id, name: order.origin.name] : null,
                destination: order.destination ? [id: order.destination.id, name: order.destination.name] : null,
                orderedBy  : serializePerson(order.orderedBy),
                orderItems : (order.listOrderItems() ?: []).collect { OrderItem orderItem ->
                    [
                            id                   : orderItem.id,
                            type                 : orderItem.orderItemType,
                            description          : orderItem.description,
                            product              : orderItem.product ? [
                                    id           : orderItem.product.id,
                                    productCode  : orderItem.product.productCode,
                                    name         : orderItem.product.name,
                                    unitOfMeasure: orderItem.product.unitOfMeasure,
                            ] : null,
                            quantityOrdered      : orderItem.quantity,
                            quantityFulfilled    : orderItem.quantityShipped,
                            isCompletelyFulfilled: orderItem.isCompletelyFulfilled(),
                    ]
                },
        ]] as JSON)
    }

    /**
     * Receives an order: creates, sends and receives a shipment for the
     * submitted order items (mirrors the confirmOrderReceipt submit
     * transition of the legacy receive order webflow, which delegates to
     * OrderService.saveOrderShipment).
     */
    def save() {
        Order order = Order.get(params.id)
        if (!order) {
            response.status = HttpStatus.NOT_FOUND.value()
            render([errorCode: HttpStatus.NOT_FOUND.value(), errorMessage: "Order ${params.id} not found"] as JSON)
            return
        }
        def jsonObject = request.JSON

        OrderCommand orderCommand = orderService.getOrder(order.id, jsonObject.recipient?.id as String)
        orderCommand.shipmentType = jsonObject.shipmentType?.id ? ShipmentType.get(jsonObject.shipmentType.id) : null
        orderCommand.recipient = jsonObject.recipient?.id ? Person.get(jsonObject.recipient.id) : null
        orderCommand.shippedOn = parseDate(jsonObject.shippedOn as String)
        orderCommand.deliveredOn = parseDate(jsonObject.deliveredOn as String)
        orderCommand.currentUser = User.get(session.user.id)
        orderCommand.currentLocation = Location.get(session.warehouse.id)

        def orderItemCommands = []
        jsonObject.orderItems?.each { row ->
            OrderItemCommand orderItemCommand = new OrderItemCommand()
            orderItemCommand.orderItem = row.orderItem?.id ? OrderItem.get(row.orderItem.id) : null
            orderItemCommand.primary = row.primary != null ? row.primary as Boolean : true
            orderItemCommand.type = orderItemCommand.orderItem?.orderItemType
            orderItemCommand.description = orderItemCommand.orderItem?.description
            orderItemCommand.quantityOrdered = orderItemCommand.orderItem?.quantity
            orderItemCommand.productReceived = row.productReceived?.id ? Product.get(row.productReceived.id) : null
            orderItemCommand.lotNumber = row.lotNumber ?: null
            orderItemCommand.expirationDate = parseDate(row.expirationDate as String)
            orderItemCommand.quantityReceived = row.quantityReceived != null && row.quantityReceived != "" ? row.quantityReceived as Integer : null
            orderItemCommands << orderItemCommand
        }
        orderCommand.orderItems = orderItemCommands

        // OrderService.saveOrderShipment clears the Hibernate session mid-save,
        // so eagerly initialize the order type proxies that
        // ShipmentService.validateShipment reads afterwards via shipment.orders
        orderItemCommands.each { OrderItemCommand orderItemCommand ->
            orderItemCommand.orderItem?.order?.orderType?.isReturnOrder()
        }

        List<String> errorMessages = []
        // Validate only the fields the receive order flow collects; the
        // shipment/shipmentItem properties are populated later by
        // OrderService.saveOrderShipment and must not fail validation here.
        if (!orderCommand.validate(["shipmentType", "recipient", "shippedOn", "deliveredOn"])) {
            errorMessages += orderCommand.errors.allErrors.collect {
                messageSource.getMessage(it, request?.locale)
            }
        }
        orderItemCommands.each { OrderItemCommand orderItemCommand ->
            if (orderItemCommand.quantityReceived && !orderItemCommand.validate(["productReceived"])) {
                errorMessages += orderItemCommand.errors.allErrors.collect {
                    messageSource.getMessage(it, request?.locale)
                }
            }
        }
        if (errorMessages) {
            response.status = HttpStatus.BAD_REQUEST.value()
            render([errorCode: HttpStatus.BAD_REQUEST.value(), errorMessages: errorMessages] as JSON)
            return
        }

        try {
            orderService.saveOrderShipment(orderCommand)
        } catch (ShipmentException e) {
            renderSaveError(e.shipment?.errors ? e.shipment.errors.allErrors.collect { messageSource.getMessage(it, request?.locale) } : [e.message])
            return
        } catch (ReceiptException e) {
            renderSaveError(e.receipt?.errors ? e.receipt.errors.allErrors.collect { messageSource.getMessage(it, request?.locale) } : [e.message])
            return
        } catch (OrderException e) {
            renderSaveError(e.order?.errors ? e.order.errors.allErrors.collect { messageSource.getMessage(it, request?.locale) } : [e.message])
            return
        }
        render([data: [orderId: order.id, shipmentId: orderCommand.shipment?.id]] as JSON)
    }

    private static Map serializePerson(Person person) {
        if (!person) {
            return null
        }
        // orderedBy may be a Hibernate proxy of a Person subclass (e.g. User);
        // unwrap it before property access to avoid reflection errors
        Person unwrapped = (Person) GrailsHibernateUtil.unwrapIfProxy(person)
        return [id: unwrapped.id, name: unwrapped.name]
    }

    private void renderSaveError(List<String> errorMessages) {
        response.status = HttpStatus.INTERNAL_SERVER_ERROR.value()
        render([errorCode: HttpStatus.INTERNAL_SERVER_ERROR.value(), errorMessages: errorMessages ?: ["An error occurred while receiving the order"]] as JSON)
    }

    private static Date parseDate(String value) {
        if (!value) {
            return null
        }
        return Date.parse("yyyy-MM-dd", value.take(10))
    }
}
