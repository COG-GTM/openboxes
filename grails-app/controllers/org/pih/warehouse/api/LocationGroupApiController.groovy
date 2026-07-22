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
import org.pih.warehouse.core.Location
import org.pih.warehouse.core.LocationGroup
import org.pih.warehouse.core.LocationGroupCommand
import org.pih.warehouse.core.LocationGroupService

class LocationGroupApiController extends BaseDomainApiController {

    LocationGroupService locationGroupService

    def list() {
        List<LocationGroup> locationGroups = locationGroupService.getLocationGroups(params)
        render ([data:locationGroups] as JSON)
    }

    def search() {
        Integer max = Math.min(params.max ? params.int('max') : 10, 100)
        Integer offset = params.offset ? params.int('offset') : 0
        String sortOrder = params.order == 'desc' ? 'desc' : 'asc'
        def results = LocationGroup.createCriteria().list(max: max, offset: offset) {
            if (params.q) {
                or {
                    ilike("id", "${params.q}%")
                    ilike("name", "${params.q}%")
                }
            }
            order("name", sortOrder)
        }
        List data = results.collect { LocationGroup locationGroup ->
            [
                    id            : locationGroup.id,
                    name          : locationGroup.name,
                    description   : locationGroup.address?.description,
                    locationsCount: Location.countByLocationGroup(locationGroup),
            ]
        }
        render([data: data, totalCount: results.totalCount] as JSON)
    }

    def details() {
        LocationGroup locationGroup = locationGroupService.getLocationGroup(params.id)
        render([data: [
                id       : locationGroup.id,
                name     : locationGroup.name,
                version  : locationGroup.version,
                address  : locationGroup.address ? [
                        id             : locationGroup.address.id,
                        address        : locationGroup.address.address,
                        address2       : locationGroup.address.address2,
                        city           : locationGroup.address.city,
                        stateOrProvince: locationGroup.address.stateOrProvince,
                        postalCode     : locationGroup.address.postalCode,
                        country        : locationGroup.address.country,
                        description    : locationGroup.address.description,
                ] : null,
                locations: locationGroup.locations.collect { [id: it.id, name: it.name] }.sort { it.name },
        ]] as JSON)
    }

    def read() {
        LocationGroup locationGroup = locationGroupService.getLocationGroup(params.id)
        render([data: locationGroup] as JSON)
    }

    def create(LocationGroupCommand command) {
        LocationGroup locationGroup = locationGroupService.createLocationGroup(command)
        render([data: [id: locationGroup.id]] as JSON)
    }

    def update(LocationGroupCommand command) {
        LocationGroup locationGroup = locationGroupService.updateLocationGroup(params.id, command)
        render([data: locationGroup] as JSON)
    }

    def delete() {
        locationGroupService.deleteLocationGroup(params.id)
        render status: 204
    }
}
