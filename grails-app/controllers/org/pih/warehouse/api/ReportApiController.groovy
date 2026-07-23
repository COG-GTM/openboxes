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
import org.apache.commons.lang.StringEscapeUtils
import org.pih.warehouse.auth.AuthService
import org.pih.warehouse.core.Constants
import org.pih.warehouse.core.Location
import org.pih.warehouse.core.ReasonCode
import org.pih.warehouse.order.OrderItem
import org.pih.warehouse.product.Category
import org.pih.warehouse.product.Product
import org.pih.warehouse.report.ChecklistReportCommand
import org.pih.warehouse.shipping.Shipment

import java.text.DateFormat
import java.text.SimpleDateFormat

/**
 * JSON endpoints backing the React report screens (Phase 2, Reports).
 * Serializations mirror what the legacy GSP screens rendered server-side
 * (report/showOnOrderReport, report/showInventoryByLocationReport,
 * report/showRequestDetailReport, report/showPaginatedPackingListReport).
 */
class ReportApiController {

    def reportService
    def userService
    def orderService
    def shipmentService
    def forecastingService
    def inventoryService
    def productAvailabilityService
    def localizationService
    def messageSource

    /**
     * On-order summary rows (same data as /json/getSummaryOrderReport, which
     * backs the legacy On Order Report "summary" DataTable).
     */
    def onOrderSummary() {
        Location location = AuthService.currentLocation
        def data = reportService.getOnOrderSummary(location)
        render([data: data] as JSON)
    }

    /**
     * On-order detail rows (same data as /json/getDetailedOrderReport, which
     * backs the legacy On Order Report "details" DataTable).
     */
    def onOrderDetails() {
        Location location = AuthService.currentLocation
        def items = orderService.getPendingInboundOrderItems(location)
        items += shipmentService.getPendingInboundShipmentItems(location)

        def data = items.collect {
            def isOrderItem = it instanceof OrderItem
            [
                    productCode          : it.product?.productCode,
                    productName          : it.product?.name,
                    displayName          : it.product?.displayName,
                    qtyOrderedNotShipped : isOrderItem ? it.quantityRemaining * it.quantityPerUom : '',
                    qtyShippedNotReceived: isOrderItem ? '' : it.quantityRemaining,
                    orderNumber          : isOrderItem ? it.order.orderNumber : (it.shipment.isFromPurchaseOrder ? it.orderNumber : ''),
                    orderDescription     : isOrderItem ? it.order.name : (it.shipment.isFromPurchaseOrder ? it.orderName : ''),
                    supplierOrganization : isOrderItem ? it.order?.origin?.organization?.name : it.shipment?.origin?.organization?.name,
                    supplierLocation     : isOrderItem ? it.order.origin.name : it.shipment.origin.name,
                    supplierLocationGroup: isOrderItem ? it.order?.origin?.locationGroup?.name : it.shipment?.origin?.locationGroup?.name,
                    estimatedGoodsReadyDate: isOrderItem ? it.actualReadyDate?.format("MM/dd/yyyy") : '',
                    shipmentNumber       : isOrderItem ? '' : it.shipment.shipmentNumber,
                    shipDate             : isOrderItem ? '' : it.shipment.expectedShippingDate?.format("MM/dd/yyyy"),
                    shipmentType         : isOrderItem ? '' : it.shipment.shipmentType.name,
            ]
        }
        render([data: data] as JSON)
    }

    /**
     * Completed request items (same data as /json/getRequestDetailReport,
     * which backs the legacy Request Detail Report DataTable).
     * Requires originId, startDate and endDate (MM/dd/yyyy).
     */
    def requestDetails() {
        if (!params.originId || !params.startDate || !params.endDate) {
            response.status = 400
            render([errorMessage: "originId, startDate and endDate parameters are required"] as JSON)
            return
        }
        DateFormat dateFormat = new SimpleDateFormat("MM/dd/yyyy")
        Map reportParams = new HashMap(params)
        reportParams.startDate = dateFormat.parse(params.startDate)
        reportParams.endDate = dateFormat.parse(params.endDate)
        reportParams.tags = params.tags ? params.list("tags") : null
        reportParams.catalogs = params.catalogs ? params.list("catalogs") : null
        def data = forecastingService.getRequestDetailReport(reportParams)
        render([data: data] as JSON)
    }

    /**
     * Request-type reason codes for the Request Detail Report filter
     * (mirrors the g:selectRequestReasonCode taglib on the legacy screen).
     */
    def requestReasonCodes() {
        Locale locale = localizationService.getCurrentLocale()
        def data = ReasonCode.listRequestReasonCodes().collect { reasonCode ->
            [
                    id  : reasonCode.name(),
                    name: messageSource.getMessage("enum.ReasonCode.${reasonCode.name()}", null, reasonCode.name(), locale),
            ]
        }
        render([data: data] as JSON)
    }

    /**
     * Quantity on hand by product across multiple depot locations (the data
     * the legacy Inventory By Location Report rendered server-side).
     */
    def inventoryByLocation() {
        List<Location> locations = params.list("locations")
                .findAll { it }
                .collect { Location.get(it) }
                .findAll { it != null }
        List<Category> categories = params.list("categories")
                .findAll { it }
                .collect { Category.get(it) }
                .findAll { it != null }

        boolean includeSubcategories = params.includeSubcategories ?
                params.boolean("includeSubcategories") : true
        if (includeSubcategories) {
            categories = inventoryService.getExplodedCategories(categories)
        }

        Map entries = productAvailabilityService.getQuantityOnHandByProduct(locations, categories)

        def data = entries.findAll { it.key }.collect { entry ->
            def product = entry.key
            def row = entry.value
            [
                    productId                       : product.id,
                    productCode                     : product.productCode,
                    productName                     : product.name,
                    productFamily                   : product.productFamily?.name,
                    category                        : product.category?.name,
                    formularies                     : product.getProductCatalogs()?.collect { it.name }?.join(","),
                    tags                            : product.tagsToString(),
                    quantityOnHandByLocation        : locations.collectEntries { location ->
                        [(location.id): [
                                quantityOnHand            : row[location.id]?.quantityOnHand,
                                quantityAvailableToPromise: row[location.id]?.quantityAvailableToPromise,
                        ]]
                    },
                    totalQuantityOnHand             : row?.values()?.quantityOnHand?.sum(),
                    totalQuantityAvailableToPromise : row?.values()?.quantityAvailableToPromise?.sum(),
            ]
        }

        render([
                data     : data,
                locations: locations.collect { [id: it.id, name: it.name] },
        ] as JSON)
    }

    /**
     * Shipment options for the packing list report screen (mirrors the
     * g:selectShipment taglib backing the legacy screen's shipment picker).
     */
    def packingListShipments() {
        Location currentLocation = AuthService.currentLocation
        def shipments = shipmentService.getShipmentsByLocation(null, currentLocation, null).sort {
            it?.name?.toLowerCase()
        }
        def data = shipments.collect { Shipment shipment ->
            [
                    id   : shipment.id,
                    label: shipment.shipmentNumber + " " + shipment.name + " - " +
                            shipment.shipmentItemCount + " items" +
                            " (" + shipment.origin.name + " to " + shipment.destination.name + ")",
            ]
        }
        render([data: data] as JSON)
    }

    /**
     * Packing list entries grouped by container/pallet for a shipment (the
     * data the legacy Paginated Packing List Report rendered server-side).
     */
    def packingList() {
        Shipment shipment = params.shipmentId ? Shipment.get(params.shipmentId) : null
        if (!shipment) {
            render([data: null] as JSON)
            return
        }
        ChecklistReportCommand command = new ChecklistReportCommand()
        command.shipment = shipment
        reportService.generateShippingReport(command)

        def containers = (command.checklistReportEntryList ?: [])
                .groupBy { it?.shipmentItem?.container }
                .collect { container, checklistEntries ->
                    [
                            name   : container?.name,
                            entries: checklistEntries.collect { checklistEntry ->
                                def shipmentItem = checklistEntry?.shipmentItem
                                [
                                        productCode   : shipmentItem?.product?.productCode,
                                        productName   : shipmentItem?.product?.name,
                                        lotNumber     : shipmentItem?.lotNumber,
                                        expirationDate: shipmentItem?.expirationDate?.format("MM/dd/yyyy"),
                                        recipient     : shipmentItem?.recipient?.name ?:
                                                shipmentItem?.container?.recipient?.name ?:
                                                shipmentItem?.shipment?.recipient?.name,
                                        quantity      : shipmentItem?.quantity,
                                ]
                            },
                    ]
                }

        render([
                data: [
                        shipment  : [
                                id            : shipment.id,
                                name          : shipment.name,
                                shipmentNumber: shipment.shipmentNumber,
                        ],
                        containers: containers,
                ],
        ] as JSON)
    }

    /**
     * Rows backing the React report/showBinLocationReport screen. Mirrors
     * JsonController.getBinLocationReport (the dataTables source the legacy
     * GSP consumed), including finance-role gating of unit cost / total value.
     */
    def binLocationReport() {
        String locationId = params?.location?.id ?: session?.warehouse?.id
        Location location = Location.get(locationId)
        if (!location) {
            response.status = 404
            render([errorMessage: "Location with id ${locationId} not found"] as JSON)
            return
        }
        def data = productAvailabilityService.getQuantityOnHandByBinLocation(location)

        if (params.status) {
            data = data.findAll { it.status == params.status }
        }

        def hasRoleFinance = userService.hasRoleFinance(session?.user)

        data = data.collect {
            def quantity = it?.quantity ?: 0
            def quantityAvailableToPromise = it?.quantityAvailableToPromise ?: 0
            def unitCost = hasRoleFinance ? (it?.product?.pricePerUnit ?: 0.0) : null
            def totalValue = hasRoleFinance ? g.formatNumber(number: quantity * unitCost) : null
            [
                    id                        : it.product?.id,
                    status                    : g.message(code: "binLocationSummary.${it.status}.label"),
                    productCode               : it.product?.productCode,
                    productName               : it?.product?.name,
                    displayName               : it?.product?.displayName,
                    productGroup              : it?.product?.genericProduct?.name,
                    category                  : it?.product?.category?.name,
                    lotNumber                 : it?.inventoryItem?.lotNumber,
                    lotStatus                 : it?.inventoryItem?.lotStatus?.toString(),
                    expirationDate            : g.formatDate(date: it?.inventoryItem?.expirationDate, format: "dd/MMM/yyyy"),
                    unitOfMeasure             : it?.product?.unitOfMeasure,
                    zone                      : it?.binLocation?.zone?.name ?: "",
                    binLocation               : it?.binLocation?.name ?: "Default",
                    isOnHold                  : it?.binLocation?.isOnHold(),
                    quantity                  : quantity,
                    quantityAvailableToPromise: quantityAvailableToPromise,
                    unitCost                  : unitCost,
                    totalValue                : totalValue,
                    handlingIcons             : it.product?.getHandlingIcons()
            ]
        }

        // Default sort of the legacy DataTable: zone desc, then bin location desc
        data = data.sort { a, b ->
            (b.zone <=> a.zone) ?: (b.binLocation <=> a.binLocation)
        }

        render([data: data, location: [id: location.id, name: location.name]] as JSON)
    }

    /**
     * Rows backing the React report/showCycleCountReport screen. Mirrors the
     * model computed by ReportController.showCycleCountReport (non-print
     * branch), preserving the legacy CSV-escaped values.
     */
    def cycleCountReport() {
        Location location = Location.load(session.warehouse.id)
        List binLocations = inventoryService.getQuantityByBinLocation(location)

        List rows = binLocations.collect { row ->
            Product product = Product.get(row?.product?.id)
            def latestInventoryDate = row?.product?.latestInventoryDate(location.id) ?: row?.product.earliestReceivingDate(location.id)
            [
                    productCode      : StringEscapeUtils.escapeCsv(row?.product?.productCode),
                    productName      : row?.product.name ?: "",
                    productFamily    : product?.productFamily?.toString() ?: "",
                    category         : StringEscapeUtils.escapeCsv(product?.category?.name ?: ""),
                    formularies      : product?.productCatalogs?.join(", ") ?: "",
                    lotNumber        : StringEscapeUtils.escapeCsv(row?.inventoryItem.lotNumber ?: ""),
                    expirationDate   : row?.inventoryItem.expirationDate ? row?.inventoryItem.expirationDate.format(Constants.EXPIRATION_DATE_FORMAT) : "",
                    abcClassification: StringEscapeUtils.escapeCsv(row?.product.getAbcClassification(location.id) ?: ""),
                    binLocation      : StringEscapeUtils.escapeCsv(row?.binLocation?.name ?: ""),
                    status           : g.message(code: "binLocationSummary.${row?.status}.label"),
                    lastInventoryDate: latestInventoryDate ? latestInventoryDate.format(Constants.EXPIRATION_DATE_FORMAT) : "",
                    quantityOnHand   : row?.quantity ?: 0,
            ]
        }

        render([data: rows, location: [id: location.id, name: location.name]] as JSON)
    }

    /**
     * Shipment checklist data backing the React print report screens
     * (printShippingReport, printPickListReport,
     * printPaginatedPackingListReport). Mirrors what the legacy GSPs pulled
     * off ChecklistReportCommand after reportService.generateShippingReport(),
     * plus the bin-location availability map used by the pick list report.
     */
    def shippingReport() {
        Shipment shipment = Shipment.get(params.id)
        if (!shipment) {
            response.status = 404
            render([errorMessage: "Shipment with id ${params.id} not found"] as JSON)
            return
        }

        ChecklistReportCommand command = new ChecklistReportCommand(shipment: shipment)
        reportService.generateShippingReport(command)
        Map binLocationMap = inventoryService.getBinLocations(shipment)

        List entries = command.checklistReportEntryList.collect { entry ->
            def shipmentItem = entry.shipmentItem
            def inventoryItem = shipmentItem?.inventoryItem
            def product = inventoryItem?.product ?: shipmentItem?.product
            def container = shipmentItem?.container
            def expirationDate = inventoryItem?.expirationDate ?: shipmentItem?.expirationDate
            def recipient = shipmentItem?.recipient?.name
                    ?: container?.recipient?.name
                    ?: shipmentItem?.shipment?.recipient?.name
            [
                    container        : container ? [
                            id                 : container.id,
                            name               : container.name,
                            parentContainerName: container.parentContainer?.name,
                    ] : null,
                    productCode      : product?.productCode,
                    productName      : product?.displayNameOrDefaultName,
                    coldChain        : product?.coldChain ?: false,
                    unitOfMeasure    : product?.unitOfMeasure,
                    lotNumber        : inventoryItem?.lotNumber ?: shipmentItem?.lotNumber,
                    expirationDate   : expirationDate ? expirationDate.format(Constants.DEFAULT_MONTH_YEAR_DATE_FORMAT) : null,
                    quantity         : shipmentItem?.quantity,
                    recipient        : recipient,
                    binLocationPicked: shipmentItem?.binLocation?.name,
                    binLocations     : (binLocationMap[inventoryItem] ?: []).collect {
                        [binLocation: it?.binLocation?.name, quantity: it?.quantity]
                    },
            ]
        }

        render([data: [
                shipment: [
                        id                  : shipment.id,
                        name                : shipment.name,
                        shipmentNumber      : shipment.shipmentNumber,
                        expectedShippingDate: shipment.expectedShippingDate?.format("MMM dd, yyyy hh:mma z"),
                        expectedDeliveryDate: shipment.expectedDeliveryDate?.format("MMM dd, yyyy hh:mma z"),
                        origin              : [id: shipment.origin?.id, name: shipment.origin?.name],
                        destination         : [id: shipment.destination?.id, name: shipment.destination?.name],
                        licensePlateNumber  : shipment.getReferenceNumber("License Plate Number")?.identifier,
                ],
                printedBy: session?.user?.name,
                entries  : entries,
        ]] as JSON)
    }
}
