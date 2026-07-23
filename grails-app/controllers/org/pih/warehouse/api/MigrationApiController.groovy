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
import grails.gorm.transactions.NotTransactional
import grails.gorm.transactions.Transactional

import org.hibernate.criterion.CriteriaSpecification
import org.springframework.http.HttpStatus

import org.pih.warehouse.auth.AuthService
import org.pih.warehouse.core.Constants
import org.pih.warehouse.core.Location
import org.pih.warehouse.data.TransactionSourceMigrationService
import org.pih.warehouse.inventory.Transaction
import org.pih.warehouse.inventory.TransactionType
import org.pih.warehouse.product.Product
import org.pih.warehouse.product.ProductAvailability
import org.pih.warehouse.reporting.ConsumptionFact
import org.pih.warehouse.reporting.DateDimension
import org.pih.warehouse.reporting.LocationDimension
import org.pih.warehouse.reporting.LotDimension
import org.pih.warehouse.reporting.ProductDimension
import org.pih.warehouse.reporting.TransactionFact

@Transactional(readOnly = true)
class MigrationApiController {

    def dataService
    def migrationService
    TransactionSourceMigrationService transactionSourceMigrationService
    def locationService
    def productAvailabilityService
    def reportService

    def dataMigration() {
        def organizations = migrationService.getSuppliersForMigration()
        def productSuppliers = migrationService.getProductsForMigration()
        TransactionType inventoryTransactionType = TransactionType.load(Constants.INVENTORY_TRANSACTION_TYPE_ID)
        TransactionType productInventoryTransactionType = TransactionType.load(Constants.PRODUCT_INVENTORY_TRANSACTION_TYPE_ID)
        Integer inventoryTransactionCount = Transaction.countByTransactionType(inventoryTransactionType)
        Integer productInventoryTransactionCount = Transaction.countByTransactionType(productInventoryTransactionType)
        Location currentLocation = AuthService.currentLocation
        Integer productInventoryTransactionInCurrentLocationCount = Transaction.countByTransactionTypeAndInventory(productInventoryTransactionType, currentLocation.inventory)
        List<Product> productsWithProductInventoryTransactionInCurrentLocation = migrationService.getProductsWithTransactions(currentLocation, productInventoryTransactionType)
        Map<String, List<String>> overlappingTransactions = migrationService.getOtherOverlappingTransactions(currentLocation, productInventoryTransactionType)
        Integer amountOfMissingInventoryImportTransactionSources = transactionSourceMigrationService.getAmountOfMissingInventoryImportTransactionSources()
        Integer amountOfMissingCycleCountTransactionSources = transactionSourceMigrationService.getAmountOfMissingCycleCountTransactionSources()
        // The amount of missing record stock transaction sources can only be determined if previous migrations
        // were completed (inventory import, cycle count related)
        Integer amountOfMissingRecordStockTransactionSources =
                ((amountOfMissingInventoryImportTransactionSources + amountOfMissingCycleCountTransactionSources) == 0)
                        ? transactionSourceMigrationService.getAmountOfMissingRecordStockTransactionSources()
                        : null

        render([data: [
                organizationCount                                        : organizations.size(),
                productSupplierCount                                     : productSuppliers.size(),
                inventoryTransactionCount                                : inventoryTransactionCount,
                productInventoryTransactionCount                         : productInventoryTransactionCount,
                productInventoryTransactionInCurrentLocationCount        : productInventoryTransactionInCurrentLocationCount,
                productsWithProductInventoryTransactionInCurrentLocation : productsWithProductInventoryTransactionInCurrentLocation*.productCode,
                overlappingTransactions                                  : overlappingTransactions,
                amountOfMissingInventoryImportTransactionSources         : amountOfMissingInventoryImportTransactionSources,
                amountOfMissingCycleCountTransactionSources              : amountOfMissingCycleCountTransactionSources,
                amountOfMissingRecordStockTransactionSources             : amountOfMissingRecordStockTransactionSources,
        ]] as JSON)
    }

    def dataQuality() {
        render([data: [
                receiptsWithoutTransactionCount          : migrationService.getReceiptsWithoutTransaction().size(),
                shipmentsWithoutTransactionsCount        : migrationService.getShipmentsWithoutTransactions().size(),
                stockMovementsWithoutShipmentItemsCount  : migrationService.getStockMovementsWithoutShipmentItems().size(),
        ]] as JSON)
    }

    def receiptsWithoutTransaction() {
        def data = migrationService.getReceiptsWithoutTransaction().collect {
            [
                    shipmentId    : it.shipment?.id,
                    shipmentNumber: it.shipment?.shipmentNumber,
                    shipmentStatus: it.shipment?.currentStatus?.name(),
                    shipmentName  : it?.shipment?.name,
                    receiptNumber : it.receiptNumber,
                    receiptStatus : it.receiptStatusCode.name(),
            ]
        }.sort { it?.shipmentNumber }
        render([data: data, totalCount: data.size()] as JSON)
    }

    def shipmentsWithoutTransactions() {
        def data = migrationService.getShipmentsWithoutTransactions().collect {
            [
                    shipmentId    : it?.id,
                    shipmentNumber: it?.shipmentNumber,
                    shipmentStatus: it.currentStatus.name(),
                    origin        : it.origin.name,
                    destination   : it.destination.name,
            ]
        }
        render([data: data, totalCount: data.size()] as JSON)
    }

    def stockMovementsWithoutShipmentItems() {
        def data = migrationService.getStockMovementsWithoutShipmentItems().collect {
            [
                    id         : it?.id,
                    identifier : it?.request_number,
                    status     : it.status,
                    dateCreated: it.date_created?.toString(),
                    origin     : it.origin,
                    requested  : it.requested,
                    picked     : it.picked,
                    shipped    : it.shipped,
                    issued     : it.issued,
            ]
        }.sort { it?.dateCreated }
        render([data: data, totalCount: data.size()] as JSON)
    }

    def dimensionTables() {
        render([data: [
                dateDimensionCount    : DateDimension.count(),
                locationDimensionCount: LocationDimension.count(),
                lotDimensionCount     : LotDimension.count(),
                productDimensionCount : ProductDimension.count(),
        ]] as JSON)
    }

    def factTables() {
        def stockoutFactCount = dataService.executeQuery("select count(*) as count from stockout_fact")[0]?.count ?: 0
        render([data: [
                transactionFactCount: TransactionFact.count(),
                consumptionFactCount: ConsumptionFact.count(),
                stockoutFactCount   : stockoutFactCount,
        ]] as JSON)
    }

    def materializedViews() {
        def productDemandCount = dataService.executeQuery("select count(*) as count from product_demand_details")[0]?.count ?: 0
        def productAvailabilityCount = dataService.executeQuery("select count(*) as count from product_availability")[0]?.count ?: 0
        render([data: [
                productDemandCount      : productDemandCount,
                productAvailabilityCount: productAvailabilityCount,
        ]] as JSON)
    }

    def productAvailability() {
        def countByLocation = ProductAvailability.createCriteria().list {
            resultTransformer(CriteriaSpecification.ALIAS_TO_ENTITY_MAP)
            projections {
                count("id", "count")
                groupProperty("location", "location")
            }
        }
        def data = locationService.depots.collect { Location location ->
            def count = countByLocation.find { it.location == location }?.count ?: null
            [
                    locationId              : location.id,
                    locationName            : location.name,
                    productAvailabilityCount: count,
            ]
        }
        render([data: data] as JSON)
    }

    def productAvailabilityCount() {
        Location location = Location.get(params.locationId)
        if (!location) {
            response.status = HttpStatus.NOT_FOUND.value()
            render([errorCode: HttpStatus.NOT_FOUND.value(),
                    errorMessage: "No location found for id ${params.locationId}".toString()] as JSON)
            return
        }
        def results = ProductAvailability.createCriteria().list {
            resultTransformer(CriteriaSpecification.ALIAS_TO_ENTITY_MAP)
            projections {
                count("id", "count")
            }
            eq("location", location)
        }
        def count = results ? results[0].count : null
        render([data: [locationId: location.id, count: count]] as JSON)
    }

    @Transactional
    def calculateProductAvailability() {
        Location location = Location.get(params.locationId)
        if (!location) {
            response.status = HttpStatus.NOT_FOUND.value()
            render([errorCode: HttpStatus.NOT_FOUND.value(),
                    errorMessage: "No location found for id ${params.locationId}".toString()] as JSON)
            return
        }
        def binLocations = productAvailabilityService.calculateBinLocations(location)
        render([data: [locationId: location.id, count: binLocations.size()]] as JSON)
    }

    // The service manages its own transactions (the all-locations refresh runs a
    // GPars pool with per-thread persistence contexts), so no controller-level
    // transaction should be held open around it.
    @NotTransactional
    def refreshProductAvailability() {
        String locationId = params.locationId ?: request.JSON?.locationId
        if (locationId) {
            Location location = Location.get(locationId)
            if (!location) {
                response.status = HttpStatus.NOT_FOUND.value()
                render([errorCode: HttpStatus.NOT_FOUND.value(),
                        errorMessage: "No location found for id ${locationId}".toString()] as JSON)
                return
            }
            productAvailabilityService.refreshProductAvailability(location, true)
            render([data: "Refreshed product availability for location ${location.name}".toString()] as JSON)
            return
        }
        productAvailabilityService.refreshProductAvailability(Boolean.TRUE)
        render([data: "Refreshed product availability"] as JSON)
    }

    @Transactional
    def refreshProductDemand() {
        reportService.refreshProductDemandData()
        render([data: "Refreshed product demand data"] as JSON)
    }
}
