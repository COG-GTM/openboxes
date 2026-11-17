package org.pih.warehouse.inventory

import grails.testing.gorm.DataTest
import spock.lang.Specification

import org.pih.warehouse.api.AvailableItem
import org.pih.warehouse.api.PickPageItem
import org.pih.warehouse.api.SuggestedItem
import org.pih.warehouse.core.Location
import org.pih.warehouse.product.Product
import org.pih.warehouse.requisition.Requisition
import org.pih.warehouse.requisition.RequisitionItem

class StockMovementServiceAutopickSpec extends Specification implements DataTest {

    StockMovementService stockMovementService
    ProductAvailabilityService productAvailabilityServiceStub

    Location depot = new Location(name: 'Main Warehouse')
    Location bin = new Location(name: 'RM1-RACK1-SHELF1')
    Product product = new Product(productCode: '10001', name: 'Lamivudine 150mg tablet')

    void setupSpec() {
        mockDomains(Requisition, RequisitionItem)
    }

    void setup() {
        stockMovementService = new StockMovementService()
        productAvailabilityServiceStub = Stub(ProductAvailabilityService) {
            sortAvailableItems(_) >> { args -> new ProductAvailabilityService().sortAvailableItems(args[0]) }
        }
        stockMovementService.productAvailabilityService = productAvailabilityServiceStub
    }

    private AvailableItem availableItem(String lotNumber, Date expirationDate, Integer quantity) {
        InventoryItem inventoryItem = new InventoryItem(product: product, lotNumber: lotNumber, expirationDate: expirationDate)
        inventoryItem.id = lotNumber
        return new AvailableItem(inventoryItem: inventoryItem, binLocation: bin,
                quantityAvailable: quantity, quantityOnHand: quantity)
    }

    private RequisitionItem requisitionItem(Integer quantity) {
        Requisition requisition = new Requisition(origin: depot)
        return new RequisitionItem(requisition: requisition, product: product, quantity: quantity)
    }

    void 'autopick skips an expired lot when an unexpired lot is in stock'() {
        given: 'an expired lot (earliest expiry) and an unexpired lot at the same depot'
        AvailableItem expiredLot = availableItem('4041283', new Date() - 365, 100)
        AvailableItem unexpiredLot = availableItem('WALK50117', new Date() + 365 * 4, 100)
        productAvailabilityServiceStub.getAllAvailableBinLocations(depot, product.id) >> [expiredLot, unexpiredLot]

        when:
        List<AvailableItem> availableItems = stockMovementService.getAvailableItems(depot, requisitionItem(5))
        List<SuggestedItem> suggestedItems = stockMovementService.getSuggestedItems(availableItems, 5, true)

        then: 'the expired lot is still listed for manual picking, but after the unexpired lot'
        availableItems*.inventoryItem*.lotNumber == ['WALK50117', '4041283']

        and: 'autopick suggests only the unexpired lot'
        suggestedItems.size() == 1
        suggestedItems[0].inventoryItem.lotNumber == 'WALK50117'
        suggestedItems[0].quantityPicked == 5
    }

    void 'autopick does not top up a short unexpired lot with an expired lot'() {
        given:
        AvailableItem expiredLot = availableItem('4041283', new Date() - 30, 100)
        AvailableItem unexpiredLot = availableItem('WALK50117', new Date() + 365, 3)

        when:
        List<SuggestedItem> suggestedItems = stockMovementService.getSuggestedItems([expiredLot, unexpiredLot], 5, true)

        then:
        suggestedItems*.inventoryItem*.lotNumber == ['WALK50117']
        suggestedItems[0].quantityPicked == 3
    }

    void 'autopick suggests nothing when only expired lots are in stock'() {
        expect:
        stockMovementService.getSuggestedItems([availableItem('4041283', new Date() - 1, 100)], 5, true).isEmpty()
    }

    void 'autopick treats a lot expiring today as expired and still picks lots without expiry in FEFO order'() {
        given:
        AvailableItem noExpiry = availableItem('NOEXP', null, 2)
        AvailableItem expiresToday = availableItem('TODAY', new Date().clearTime(), 2)
        AvailableItem expiresTomorrow = availableItem('TOMORROW', new Date().clearTime() + 1, 2)
        AvailableItem expiresLater = availableItem('LATER', new Date() + 30, 2)
        productAvailabilityServiceStub.getAllAvailableBinLocations(depot, product.id) >> [noExpiry, expiresLater, expiresToday, expiresTomorrow]

        when:
        List<AvailableItem> availableItems = stockMovementService.getAvailableItems(depot, requisitionItem(8))
        List<SuggestedItem> suggestedItems = stockMovementService.getSuggestedItems(availableItems, 8, true)

        then:
        expiresToday.expired
        suggestedItems*.inventoryItem*.lotNumber == ['TOMORROW', 'LATER', 'NOEXP']
    }

    void 'CSV pick import still picks an expired lot the row names when its bin is blank'() {
        given: 'the row names expired lot 4041283, which is only in physical bin RM1-RACK1-SHELF1'
        InventoryItem expiredLot = new InventoryItem(product: product, lotNumber: '4041283', expirationDate: new Date() - 365)
        expiredLot.id = '4041283'
        AvailableItem expiredLotInBin = new AvailableItem(inventoryItem: expiredLot, binLocation: bin, quantityAvailable: 100, quantityOnHand: 100)
        AvailableItem unexpiredLot = availableItem('WALK50117', new Date() + 365 * 4, 100)
        PickPageItem pickPageItem = new PickPageItem(requisitionItem: requisitionItem(5), availableItems: [expiredLotInBin, unexpiredLot])

        when: 'the import allocates the named lot the way importPicklistItems does for a blank bin'
        List<AvailableItem> lotItems = pickPageItem.getAvailableItems(expiredLot)
        lotItems = stockMovementService.applyAllocationRulesOnAvailableItems(lotItems, 5)
        List<SuggestedItem> suggestedItems = stockMovementService.getSuggestedItems(lotItems, 5)

        then:
        suggestedItems.size() == 1
        suggestedItems[0].inventoryItem.lotNumber == '4041283'
        suggestedItems[0].binLocation == bin
        suggestedItems[0].quantityPicked == 5
    }
}
