/**
 * Copyright (c) 2025 Partners In Health.  All rights reserved.
 * The use and distribution terms for this software are covered by the
 * Eclipse Public License 1.0 (http://opensource.org/licenses/eclipse-1.0.php)
 * which can be found in the file epl-v10.html at the root of this distribution.
 * By using this software in any fashion, you are agreeing to be bound by
 * the terms of this license.
 * You must not remove this notice, or any other, from this software.
 **/
package org.pih.warehouse.api

import grails.converters.JSON
import grails.validation.ValidationException

import org.pih.warehouse.core.Location
import org.pih.warehouse.inventory.InventoryLevel
import org.pih.warehouse.inventory.InventoryService
import org.pih.warehouse.inventory.ProductAvailabilityService
import org.pih.warehouse.inventory.RecordInventoryCommand
import org.pih.warehouse.product.Product

class RecordStockApiController {

    InventoryService inventoryService
    ProductAvailabilityService productAvailabilityService

    /**
     * Returns everything the React "Record Stock" screen needs to render its
     * form: the product, the facility's inventory id, current totals and the
     * prefilled count rows. Mirrors InventoryItemController.showRecordInventory.
     */
    def getRecordStock(RecordInventoryCommand command) {
        Location facility = Location.get(params.facility)
        if (!facility) {
            throw new IllegalArgumentException("Unable to locate facility with id ${params.facility}")
        }
        if (!command.inventory) {
            command.inventory = facility.inventory
        }
        inventoryService.populateRecordInventoryCommand(command, params)
        if (command.hasErrors()) {
            throw new ValidationException("Invalid record stock request", command.errors)
        }

        Product product = command.product
        List transactionEntryList = inventoryService.getTransactionEntriesByInventoryAndProduct(command.inventory, [product])
        InventoryLevel inventoryLevel = InventoryLevel.findByProductAndInventory(product, command.inventory)
        Integer totalQuantity = inventoryService.getQuantityByProductMap(transactionEntryList)[product] ?: 0
        Integer totalQuantityAvailableToPromise = inventoryService.getQuantityAvailableToPromise(product, command.inventory?.warehouse)

        render([data: [
                product                        : [
                        id                 : product.id,
                        productCode        : product.productCode,
                        name               : product.name,
                        unitOfMeasure      : product.unitOfMeasure,
                        lotAndExpiryControl: product.lotAndExpiryControl,
                ],
                inventory                      : [id: command.inventory?.id],
                inventoryLevel                 : inventoryLevel ? [
                        id             : inventoryLevel.id,
                        status         : inventoryLevel.status?.name(),
                        minQuantity    : inventoryLevel.minQuantity,
                        reorderQuantity: inventoryLevel.reorderQuantity,
                        maxQuantity    : inventoryLevel.maxQuantity,
                ] : null,
                totalQuantityOnHand            : totalQuantity,
                totalQuantityAvailableToPromise: totalQuantityAvailableToPromise ?: 0,
                recordInventoryRows            : command.recordInventoryRows.collect {
                    [
                            id            : it.id,
                            lotNumber     : it.lotNumber,
                            binLocation   : it.binLocation ? [id: it.binLocation.id, name: it.binLocation.name] : null,
                            expirationDate: it.expirationDate?.format("yyyy-MM-dd"),
                            oldQuantity   : it.oldQuantity,
                            newQuantity   : it.newQuantity,
                            comment       : it.comment,
                    ]
                },
        ]] as JSON)
    }

    def saveRecordStock(RecordInventoryCommand command) {
        inventoryService.saveRecordInventoryCommand(command, params)
        // TODO: refactor saveRecordInventoryCommand to not catch exceptions. It does so now because it's used
        //       in a non-API GSP controller which doesn't gracefully handle exceptions. We'll likely need to split it
        //       into API and non-API service methods. Once we do that, we can remove this if check because exceptions
        //       will be thrown in the service if the command is invalid.
        if (command.hasErrors()) {
            throw new ValidationException("Invalid record stock", command.errors)
        }

        // TODO: Move this refresh into saveRecordInventoryCommand. They don't need to be in separate transactions.
        // We disabled recalculating product availability during the record stock operation (to avoid
        // recalculating it multiple times) so now we need to refresh it manually.
        productAvailabilityService.refreshProductsAvailability(
                command?.inventory?.warehouse?.id,
                [command?.product?.id],
                false)

        render([data: command] as JSON)
    }
}
