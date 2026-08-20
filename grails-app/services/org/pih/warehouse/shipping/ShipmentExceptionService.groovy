/**
 * Copyright (c) 2012 Partners In Health.  All rights reserved.
 * The use and distribution terms for this software are covered by the
 * Eclipse Public License 1.0 (http://opensource.org/licenses/eclipse-1.0.php)
 * which can be found in the file epl-v10.html at the root of this distribution.
 **/
package org.pih.warehouse.shipping

import grails.gorm.transactions.Transactional
import org.pih.warehouse.api.ShipmentExceptionCommand
import org.pih.warehouse.core.EventCode
import org.pih.warehouse.core.Location

import java.time.LocalDate
import java.time.ZoneId
import java.time.temporal.ChronoUnit

@Transactional(readOnly = true)
class ShipmentExceptionService {

    Map getOverdueInboundShipments(Location warehouse, ShipmentExceptionCommand command) {
        List<Location> inboundLocations = [warehouse] + Location.findAllByParentLocation(warehouse)
        Location origin = command.origin ? Location.get(command.origin) : null
        Location destination = command.destination ? Location.get(command.destination) : null

        if ((command.origin && !origin) || (command.destination && !destination) ||
                (destination && !inboundLocations*.id.contains(destination.id))) {
            return page([], command)
        }

        Date startOfToday = new Date().clearTime()
        List<Shipment> shipments = Shipment.createCriteria().list {
            isNotNull("expectedDeliveryDate")
            lt("expectedDeliveryDate", startOfToday)
            inList("destination", inboundLocations)
            if (origin) {
                eq("origin", origin)
            }
            if (destination) {
                eq("destination", destination)
            }
        }

        ZoneId zone = ZoneId.systemDefault()
        LocalDate today = LocalDate.now(zone)
        List<Map> rows = shipments.collect { Shipment shipment ->
            Date deliveredDate = shipment.dateDelivered()
            def latestEvent = shipment.getMostRecentEvent()
            if (deliveredDate || latestEvent?.eventType?.eventCode == EventCode.CANCELLED) {
                return null
            }

            LocalDate expectedDeliveryDate = shipment.expectedDeliveryDate.toInstant().atZone(zone).toLocalDate()
            Integer daysLate = ChronoUnit.DAYS.between(expectedDeliveryDate, today) as Integer
            if (daysLate < command.minDaysLate) {
                return null
            }

            [
                    id                   : shipment.id,
                    shipmentNumber       : shipment.shipmentNumber,
                    name                 : shipment.name,
                    shipmentType         : shipment.shipmentType?.name,
                    origin               : locationReference(shipment.origin),
                    destination          : locationReference(shipment.destination),
                    expectedShippingDate : shipment.expectedShippingDate,
                    expectedDeliveryDate : shipment.expectedDeliveryDate,
                    daysLate              : daysLate,
                    status               : shipment.status?.code?.name(),
                    shipmentItemCount    : shipment.shipmentItemCount ?: shipment.shipmentItems?.size() ?: 0,
            ]
        }.findAll()

        Comparator comparator = { Map left, Map right ->
            def leftValue = sortValue(left, command.sort)
            def rightValue = sortValue(right, command.sort)
            compareValues(leftValue, rightValue)
        } as Comparator
        rows.sort(command.order == "desc" ? comparator.reversed() : comparator)
        page(rows, command)
    }

    private static Map locationReference(Location location) {
        [
                id            : location.id,
                name          : location.name,
                locationNumber: location.locationNumber,
        ]
    }

    private static Object sortValue(Map row, String sort) {
        switch (sort) {
            case "origin":
            case "destination":
                return row[sort]?.name?.toLowerCase()
            default:
                return row[sort]
        }
    }

    private static int compareValues(Object left, Object right) {
        if (left == right) return 0
        if (left == null) return -1
        if (right == null) return 1
        return left <=> right
    }

    private static Map page(List<Map> rows, ShipmentExceptionCommand command) {
        int from = Math.min(command.offset, rows.size())
        int to = Math.min(from + command.max, rows.size())
        List<Map> data = rows.subList(from, to)
        [
                data      : data,
                count     : data.size(),
                max       : command.max,
                offset    : command.offset,
                totalCount: rows.size(),
        ]
    }
}
