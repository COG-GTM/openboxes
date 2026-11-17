package org.pih.warehouse.picklist

import grails.testing.gorm.DataTest
import spock.lang.Specification

import org.pih.warehouse.api.AvailableItem
import org.pih.warehouse.api.SuggestedItem
import org.pih.warehouse.core.Location
import org.pih.warehouse.inventory.InventoryItem
import org.pih.warehouse.inventory.InventoryLevel
import org.pih.warehouse.inventory.ProductAvailabilityService
import org.pih.warehouse.order.Order
import org.pih.warehouse.order.OrderItem
import org.pih.warehouse.product.Product

class PicklistServiceAutopickSpec extends Specification implements DataTest {

    PicklistService picklistService
    ProductAvailabilityService productAvailabilityServiceStub

    Location depot = new Location(name: 'Main Warehouse')
    Location ward = new Location(name: 'Ward A')
    Location bin = new Location(name: 'RM1-RACK1-SHELF1')
    Product product = new Product(productCode: '10001', name: 'Lamivudine 150mg tablet')

    void setupSpec() {
        mockDomains(InventoryLevel)
    }

    void setup() {
        picklistService = new PicklistService()
        productAvailabilityServiceStub = Stub(ProductAvailabilityService) {
            sortAvailableItems(_) >> { args -> new ProductAvailabilityService().sortAvailableItems(args[0]) }
        }
        picklistService.productAvailabilityService = productAvailabilityServiceStub
    }

    private AvailableItem availableItem(String lotNumber, Date expirationDate, Integer quantity) {
        InventoryItem inventoryItem = new InventoryItem(product: product, lotNumber: lotNumber, expirationDate: expirationDate)
        return new AvailableItem(inventoryItem: inventoryItem, binLocation: bin,
                quantityAvailable: quantity, quantityOnHand: quantity)
    }

    private OrderItem replenishmentOrderItem(Integer quantity) {
        Order order = new Order(origin: depot, destination: ward)
        return new OrderItem(order: order, product: product, quantity: quantity)
    }

    void 'replenishment autopick skips an expired lot when an unexpired lot is in stock'() {
        given: 'an expired lot (earliest expiry, so first in FEFO order) and an unexpired lot at the same depot'
        AvailableItem expiredLot = availableItem('4041283', new Date() - 365, 100)
        AvailableItem unexpiredLot = availableItem('WALK50117', new Date() + 365 * 4, 100)
        productAvailabilityServiceStub.getAvailableBinLocations(depot, product.id) >> [unexpiredLot, expiredLot]
        OrderItem orderItem = replenishmentOrderItem(5)

        when:
        List<AvailableItem> availableItems = picklistService.getAvailableItems(depot, orderItem)
        List<SuggestedItem> suggestedItems = picklistService.getSuggestedItems(availableItems, 5, ward)

        then: 'the expired lot is still listed for manual picking'
        availableItems*.inventoryItem*.lotNumber == ['4041283', 'WALK50117']

        and: 'autopick suggests only the unexpired lot'
        suggestedItems.size() == 1
        suggestedItems[0].inventoryItem.lotNumber == 'WALK50117'
        suggestedItems[0].quantityPicked == 5
    }

    void 'replenishment autopick does not cover a shortfall with an expired lot'() {
        given: 'not enough unexpired stock on its own'
        AvailableItem expiredLot = availableItem('4041283', new Date() - 30, 100)
        AvailableItem unexpiredLot = availableItem('WALK50117', new Date() + 365, 3)

        expect: 'nothing is suggested, as when the depot is short, so the user picks manually'
        picklistService.getSuggestedItems([expiredLot, unexpiredLot], 5, ward).isEmpty()
    }

    void 'replenishment autopick suggests nothing when only expired lots are in stock'() {
        expect:
        picklistService.getSuggestedItems([availableItem('4041283', new Date() - 1, 100)], 5, ward).isEmpty()
    }

    void 'a lot expiring today is skipped, while later and undated lots are autopicked in FEFO order'() {
        given:
        AvailableItem noExpiry = availableItem('NOEXP', null, 2)
        AvailableItem expiresToday = availableItem('TODAY', new Date().clearTime(), 10)
        AvailableItem expiresTomorrow = availableItem('TOMORROW', new Date().clearTime() + 1, 2)
        AvailableItem expiresLater = availableItem('LATER', new Date() + 30, 2)
        productAvailabilityServiceStub.getAvailableBinLocations(depot, product.id) >> [noExpiry, expiresLater, expiresToday, expiresTomorrow]
        OrderItem orderItem = replenishmentOrderItem(6)

        when:
        List<AvailableItem> availableItems = picklistService.getAvailableItems(depot, orderItem)
        List<SuggestedItem> suggestedItems = picklistService.getSuggestedItems(availableItems, 6, ward)

        then:
        suggestedItems*.inventoryItem*.lotNumber == ['TOMORROW', 'LATER', 'NOEXP']
        suggestedItems*.quantityPicked == [2, 2, 2]
    }
}
