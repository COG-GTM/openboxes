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
import org.hibernate.ObjectNotFoundException

import org.pih.warehouse.core.Organization
import org.pih.warehouse.product.Product

class SupplierApiController {

    def locationService
    def documentService
    def orderService

    def search() {
        Integer max = Math.min(params.max ? params.int('max') : 10, 100)
        Integer offset = params.offset ? params.int('offset') : 0
        def suppliers = locationService.getSuppliers(params.q, max, offset)
        List data = suppliers.collect { supplier ->
            [
                    id                   : supplier.id,
                    name                 : supplier.name,
                    organization         : supplier.organization
                            ? [id: supplier.organization.id, name: supplier.organization.name]
                            : null,
                    pendingOrdersCount   : supplier.pendingOrdersCount,
                    pendingShipmentsCount: supplier.pendingShipmentsCount,
            ]
        }
        render([data: data, totalCount: suppliers.totalCount] as JSON)
    }

    def details() {
        Organization supplier = Organization.get(params.id)
        if (!supplier) {
            throw new ObjectNotFoundException(params.id, Organization.class.toString())
        }
        def documents = documentService.getAllDocumentsBySupplierOrganization(supplier)
        render([data: [
                id         : supplier.id,
                code       : supplier.code,
                name       : supplier.name,
                displayName: supplier.displayName,
                locations  : (supplier.locations ?: []).collect { [id: it.id, name: it.name] }.sort { it.name },
                documents  : documents,
        ]] as JSON)
    }

    def priceHistory() {
        Organization supplier = Organization.get(params.id)
        if (!supplier) {
            throw new ObjectNotFoundException(params.id, Organization.class.toString())
        }
        Product product = Product.get(params.productId)
        def data = orderService.getOrderItemsForPriceHistory(supplier, product, params.q ?: "")
        render([data: data] as JSON)
    }
}
