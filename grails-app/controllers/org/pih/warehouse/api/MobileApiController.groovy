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
import grails.orm.PagedResultList

import org.pih.warehouse.core.Location
import org.pih.warehouse.inventory.StockMovementStatusCode
import org.pih.warehouse.order.Order
import org.pih.warehouse.order.OrderTypeCode
import org.pih.warehouse.product.Product
import org.pih.warehouse.product.ProductSummary
import org.pih.warehouse.requisition.Requisition

class MobileApiController {

    def stockMovementService

    /**
     * Dashboard indicator counts backing the React mobile/index screen.
     * Mirrors the legacy MobileController.index model.
     */
    def dashboard() {
        Location location = currentLocation()
        if (!location) return
        def productCount = ProductSummary.countByLocation(location)

        def orderCount = Order.createCriteria().count {
            eq("destination", location)
            orderType {
                eq("orderTypeCode", OrderTypeCode.PURCHASE_ORDER)
            }
        }

        def requisitionCount = Requisition.createCriteria().count {
            eq("origin", location)
        }

        render([data: [
                [id: "inventoryItems", name: "Inventory Items", class: "fa fa-box", count: productCount],
                [id: "purchaseOrders", name: "Purchase Orders", class: "fa fa-shopping-cart", count: orderCount],
                [id: "replenishmentOrders", name: "Replenishment Orders", class: "fa fa-truck", count: requisitionCount],
        ]] as JSON)
    }

    /**
     * Paginated product summaries for the current location, backing the React
     * mobile/productList screen. Mirrors MobileController.productList.
     */
    def productSummaries() {
        Location location = currentLocation()
        if (!location) return
        def productSummaries = ProductSummary.createCriteria().list(max: params.max ?: 10, offset: params.offset ?: 0) {
            eq("location", location)
            order("product", "asc")
        }
        render([
                data      : productSummaries.collect { toProductSummaryJson(it) },
                totalCount: productSummaries.totalCount,
        ] as JSON)
    }

    /**
     * Product summary details for a single product (by id or product code),
     * backing the React mobile/productDetails screen. Mirrors
     * MobileController.productDetails, including the "not available in this
     * location" case ({"data": null} plus an errorMessage).
     */
    def productSummaryDetails() {
        Location location = currentLocation()
        if (!location) return
        Product product = Product.findByIdOrProductCode(params.id, params.id)
        ProductSummary productSummary = product ? ProductSummary.findByProductAndLocation(product, location) : null
        if (!productSummary) {
            render([data: null, errorMessage: "Product ${product?.productCode ?: params.id} is not available in ${location.locationNumber ?: location.name}"] as JSON)
            return
        }
        Map json = toProductSummaryJson(productSummary)
        json.product.attributes = productSummary.product.attributes.collect { productAttribute ->
            [
                    name         : productAttribute?.attribute?.name,
                    value        : productAttribute?.value,
                    unitOfMeasure: productAttribute?.unitOfMeasure?.name ?: productAttribute?.attribute?.unitOfMeasureClass?.baseUom?.name,
            ]
        }
        render([data: json] as JSON)
    }

    /**
     * Pending outbound stock movements originating from the current location,
     * backing the React mobile/outboundList screen. Mirrors
     * MobileController.outboundList.
     */
    def outboundItems() {
        Location origin = params["origin.id"] ? Location.get(params["origin.id"]) : null
        if (!origin) {
            origin = currentLocation()
            if (!origin) return
        }
        StockMovement stockMovement = new StockMovement(
                origin: origin,
                stockMovementDirection: StockMovementDirection.OUTBOUND,
                stockMovementStatusCode: StockMovementStatusCode.PENDING)
        params.max = params.max ?: 10
        params.offset = params.offset ?: 0
        def stockMovements = stockMovementService.getStockMovements(stockMovement, params)
        Integer totalCount = stockMovements instanceof PagedResultList ? stockMovements.totalCount : (stockMovements?.size() ?: 0)
        render([
                data      : stockMovements.collect { sm ->
                    [
                            id                   : sm?.id,
                            status               : sm?.status?.toString(),
                            identifier           : sm?.identifier,
                            destination          : [
                                    id            : sm?.destination?.id,
                                    name          : sm?.destination?.name,
                                    locationNumber: sm?.destination?.locationNumber,
                            ],
                            requestedDeliveryDate: sm?.requisition?.requestedDeliveryDate?.format("dd MMM yyyy"),
                    ]
                },
                totalCount: totalCount,
        ] as JSON)
    }

    /**
     * The mobile endpoints operate on the session's current location; respond
     * 400 when no location has been chosen yet (POST /api/chooseLocation/{id}).
     */
    private Location currentLocation() {
        Location location = Location.get(session.warehouse?.id)
        if (!location) {
            response.status = 400
            render([errorCode: 400, errorMessage: "Choose a location before using the mobile API"] as JSON)
        }
        return location
    }

    private Map toProductSummaryJson(ProductSummary productSummary) {
        Product product = productSummary.product
        return [
                product       : [
                        id           : product?.id,
                        productCode  : product?.productCode,
                        name         : product?.name,
                        description  : product?.description,
                        unitOfMeasure: product?.unitOfMeasure,
                        thumbnailId  : product?.thumbnail?.id,
                        handlingIcons: product?.handlingIcons,
                ],
                quantityOnHand: productSummary.quantityOnHand,
        ]
    }
}
