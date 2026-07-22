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
import org.grails.web.json.JSONObject
import org.hibernate.Criteria
import grails.gorm.transactions.Transactional
import org.pih.warehouse.core.ActivityCode
import org.pih.warehouse.core.Location
import org.pih.warehouse.core.LocationDataService
import org.pih.warehouse.core.LocationIdentifierService
import org.pih.warehouse.core.LocationGroup
import org.pih.warehouse.core.LocationRole
import org.pih.warehouse.core.LocationType
import org.pih.warehouse.core.Organization
import org.pih.warehouse.core.RoleType
import org.pih.warehouse.core.User
import org.pih.warehouse.importer.CSVUtils
import org.pih.warehouse.importer.ImportDataCommand
import org.pih.warehouse.inventory.InventoryLevel
import org.pih.warehouse.product.ProductAvailability
import grails.core.GrailsApplication
import org.springframework.web.multipart.MultipartFile
import org.pih.warehouse.core.LocationStatus

class LocationApiController extends BaseDomainApiController {

    def locationService
    def userService
    GrailsApplication grailsApplication
    LocationIdentifierService locationIdentifierService
    def inventoryService
    def documentService
    LocationDataService locationGormService

    def read() {
        Location location = Location.get(params.id)
        render([data: location] as JSON)
    }

    /**
     * Paginated location search backing the React location list screen
     * (same filters as the legacy location/list GSP).
     */
    def search() {
        Organization organization = params["organization.id"] ? Organization.get(params["organization.id"]) : null
        LocationType locationType = params["locationType.id"] ? LocationType.get(params["locationType.id"]) : null
        LocationGroup locationGroup = params["locationGroup.id"] ? LocationGroup.get(params["locationGroup.id"]) : null

        Integer max = Math.min(params.max ? params.int("max") : 10, 100)
        Integer offset = params.offset ? params.int("offset") : 0

        def locations = locationService.getLocations(organization, locationType, locationGroup,
                params.q, max, offset, params.sort ?: "name", params.order ?: "asc")

        def data = locations.collect { Location location ->
            [
                    id                 : location.id,
                    name               : location.name,
                    locationNumber     : location.locationNumber,
                    locationType       : location.locationType,
                    locationGroup      : location.locationGroup ? [id: location.locationGroup.id, name: location.locationGroup.name] : null,
                    organization       : location.organization ? [id: location.organization.id, name: location.organization.name, code: location.organization.code] : null,
                    status             : location.status?.name(),
                    active             : location.active,
                    fgColor            : location.fgColor,
                    bgColor            : location.bgColor,
                    supportedActivities: (location.supportedActivities ?: location.locationType?.supportedActivities) as List,
            ]
        }

        render([data: data, totalCount: locations.totalCount] as JSON)
    }

    /**
     * Extended location rendering backing the React location edit screen.
     */
    def details() {
        Location location = Location.get(params.id)
        if (!location) {
            render([data: null] as JSON)
            return
        }

        List supportedActivities = (location.supportedActivities ?: []) as List
        List defaultSupportedActivities = (location.locationType?.supportedActivities ?: []) as List
        boolean useDefaultActivities = supportedActivities.empty ||
                (supportedActivities as Set) == (defaultSupportedActivities as Set)

        def data = [
                id                        : location.id,
                name                      : location.name,
                description               : location.description,
                locationNumber            : location.locationNumber,
                active                    : location.active,
                fgColor                   : location.fgColor,
                bgColor                   : location.bgColor,
                status                    : location.status?.name(),
                locationType              : location.locationType,
                locationGroup             : location.locationGroup ? [id: location.locationGroup.id, name: location.locationGroup.name] : null,
                organization              : location.organization ? [id: location.organization.id, name: location.organization.name, code: location.organization.code] : null,
                manager                   : location.manager ? [id: location.manager.id, name: location.manager.name] : null,
                parentLocation            : location.parentLocation ? location.parentLocation.toBaseJson() : null,
                zone                      : location.zone ? location.zone.toBaseJson() : null,
                isInternalLocation        : location.isInternalLocation(),
                isZoneLocation            : location.isZoneLocation(),
                hasLogo                   : location.logo ? true : false,
                supportedActivities       : useDefaultActivities ? defaultSupportedActivities : supportedActivities,
                defaultSupportedActivities: defaultSupportedActivities,
                useDefaultActivities      : useDefaultActivities,
                address                   : location.address ? [
                        id             : location.address.id,
                        address        : location.address.address,
                        address2       : location.address.address2,
                        city           : location.address.city,
                        stateOrProvince: location.address.stateOrProvince,
                        postalCode     : location.address.postalCode,
                        country        : location.address.country,
                        description    : location.address.description,
                ] : null,
        ]

        render([data: data] as JSON)
    }

    /**
     * Bin locations of a facility (or bins assigned to a zone), backing the
     * React location/showBinLocations screen.
     */
    def binLocations() {
        Location location = Location.get(params.id)
        if (!location) {
            render([data: null] as JSON)
            return
        }
        def binLocations = location.isZoneLocation() ?
                Location.findAllByZone(location) : locationService.getBinLocations(location)

        def data = binLocations.collect { Location binLocation ->
            [
                    id          : binLocation.id,
                    name        : binLocation.name,
                    active      : binLocation.active,
                    zone        : binLocation.zone ? [id: binLocation.zone.id, name: binLocation.zone.name] : null,
                    locationType: binLocation.locationType,
            ]
        }
        render([data: data] as JSON)
    }

    /**
     * Zone locations of a facility, backing the React location/showZoneLocations screen.
     */
    def zoneLocations() {
        Location location = Location.get(params.id)
        if (!location) {
            render([data: null] as JSON)
            return
        }
        def zoneLocations = locationService.getZones(location)
        def data = zoneLocations.collect { Location zoneLocation ->
            [
                    id          : zoneLocation.id,
                    name        : zoneLocation.name,
                    active      : zoneLocation.active,
                    locationType: zoneLocation.locationType,
            ]
        }
        render([data: data] as JSON)
    }

    /**
     * Contents (inventory) of a bin location, backing the React location/showContents screen.
     */
    def contents() {
        Location binLocation = Location.get(params.id)
        if (!binLocation) {
            render([data: null] as JSON)
            return
        }
        List contents = inventoryService.getQuantityByBinLocation(binLocation.parentLocation, binLocation)
        def data = contents.collect { entry ->
            [
                    product      : [
                            id         : entry?.product?.id,
                            name       : entry?.product?.name,
                            productCode: entry?.product?.productCode,
                    ],
                    inventoryItem: [
                            id            : entry?.inventoryItem?.id,
                            lotNumber     : entry?.inventoryItem?.lotNumber,
                            expirationDate: entry?.inventoryItem?.expirationDate?.format("MMM yyyy"),
                    ],
                    quantity     : entry?.quantity,
            ]
        }
        render([data: data, binLocation: [id: binLocation.id, name: binLocation.name]] as JSON)
    }

    /**
     * Remove the logo of a location, backing the React location/uploadLogo screen.
     */
    def deleteLogo() {
        Location location = Location.get(params.id)
        if (!location) {
            render([data: null] as JSON)
            return
        }
        location.logo = []
        locationGormService.save(location)
        render(status: 204)
    }

    def list() {

        def minLength = grailsApplication.config.openboxes.typeahead.minLength
        if (params.name && params.name.size() < minLength) {
            render([data: []])
            return
        }

        Location currentLocation = Location.get(session?.warehouse?.id)
        User currentUser = User.get(session?.user?.id)
        boolean isSuperuser = userService.isSuperuser(session?.user)
        String direction = params?.direction
        def fields = params.fields ? params.fields.split(",") : null
        def locations = new HashSet()
        def isRequestor = userService.isUserRequestor(currentUser)
        def requestorInAnyLocation = userService.hasRoleRequestorInAnyLocations(currentUser)
        def inRoleBrowser = currentUser.hasDefaultRole(RoleType.ROLE_BROWSER)
        def inRoleAssistant = currentUser.hasDefaultRole(RoleType.ROLE_ASSISTANT)
        def inRoleManager = currentUser.hasDefaultRole(RoleType.ROLE_MANAGER)
        def inRoleAdmin = currentUser.hasDefaultRole(RoleType.ROLE_ADMIN)
        def inRoleSuperuser = currentUser.hasDefaultRole(RoleType.ROLE_SUPERUSER)


        def requiredRoles = RoleType.listRoleTypesForLocationChooser()


        if (params.locationChooser && isRequestor && !currentUser.locationRoles && !inRoleBrowser) {
            locations = locationService.getLocations(null, null)
            locations = locations.findAll { it.supportedActivities && it.supports(ActivityCode.SUBMIT_REQUEST) && it.status == LocationStatus.ENABLED }
        } else if (params.locationChooser && requestorInAnyLocation && inRoleBrowser) {
            locations = locationService.getRequestorLocations(currentUser)
            locations += locationService.getLocations(fields, params, isSuperuser, direction, currentLocation, currentUser, true)
        } else {
            if (params.locationChooser && requestorInAnyLocation) {
                locations += locationService.getRequestorLocations(currentUser)
            }
            // If a user doesn't have at least one of the requiredRoles by default, get locations where the user HAS any of those roles
            if (params.locationChooser && !inRoleBrowser && !inRoleAssistant && !inRoleManager && !inRoleAdmin && !inRoleSuperuser) {
                currentUser.locationRoles.each { LocationRole locationRole ->
                    if (requiredRoles.contains(locationRole.role.roleType)) {
                        locations += locationRole.location
                    }
                }
            } else {
                locations += locationService.getLocations(fields, params, isSuperuser, direction, currentLocation, currentUser, params.locationChooser ? true : false)
            }
        }

        if (params.presentation == "toBaseJson") {
            locations = locations?.collect { Location location -> location.toBaseJson()}
        }

        render ([data:locations] as JSON)
    }


    def productSummary() {
        Location currentLocation = Location.load(session.warehouse.id)
        def data = ProductAvailability.createCriteria().list {
            resultTransformer(Criteria.ALIAS_TO_ENTITY_MAP)
            projections {
                product {
                    groupProperty("id", "productId")
                    groupProperty("name", "productName")
                    groupProperty("productCode", "productCode")
                }
                sum("quantityOnHand", "quantityOnHand")
            }
            eq("location", currentLocation)
        }
        render ([data:data] as JSON)

    }

    def locationTypes() {
        String[] activityCodes = params.list('activityCode');
        def locationTypes = LocationType.list()

        if (activityCodes.length > 0) {
            locationTypes = locationTypes.findAll { locationType ->
                activityCodes.any { activityCode -> locationType.supports(activityCode) }
            }
        }

        def data = locationTypes.collect { locationType ->
            [
                    id                  : locationType.id,
                    name                : locationType.name,
                    description         : locationType.description,
                    locationTypeCode    : locationType?.locationTypeCode?.name(),
                    supportedActivities : locationType.supportedActivities
            ]
        }

        render ([data:data] as JSON)
    }

    def supportedActivities() {
        def data = ActivityCode.list().collect { it.name() }
        render ([data: data] as JSON)
    }

    def create() {
        Location location = new Location()
        JSONObject jsonObject = request.JSON

        bindLocationData(location, jsonObject)

        boolean useDefaultActivities = Boolean.valueOf(params.useDefaultActivities ?: "false")
        boolean assignCurrentLocationGroup = Boolean.valueOf(params.assignCurrentLocationGroup ?: "false")
        locationService.createLocation(location, useDefaultActivities, assignCurrentLocationGroup)

        render ([data: location] as JSON)
    }

    def update() {
        JSONObject jsonObject = request.JSON

        Location existingLocation = Location.get(params.id)

        if (!existingLocation) {
            throw new IllegalArgumentException("No Location found for location ID ${params.id}")
        }

        bindLocationData(existingLocation, jsonObject)

        boolean useDefaultActivities = Boolean.valueOf(params.useDefaultActivities ?: "false")
        if (useDefaultActivities && existingLocation?.supportedActivities) {
            existingLocation.supportedActivities.clear()
        }

        existingLocation.address?.validate()
        locationGormService.save(existingLocation)

        render([data: existingLocation] as JSON)
    }

    Location bindLocationData(Location location, JSONObject jsonObject) {
        // We only want to set the supportedActivities if we provide it in the payload
        if (jsonObject.containsKey("supportedActivities")) {
            jsonObject.supportedActivities = jsonObject.supportedActivities ?: [ActivityCode.NONE.id]
        }
        bindData(location, jsonObject, [exclude: ['logo', 'zoneId']])

        String logo = jsonObject.logo

        if (logo) {
            location.logo = logo.decodeBase64()
        }

        if (!location.locationNumber) {
            location.locationNumber = locationIdentifierService.generate(location)
        }

        if (!location.inventory) {
            location.inventory = inventoryService.addInventory(location)
        }

        return location
    }

    def delete() {
        def existingLocation = Location.get(params.id)
        if (!existingLocation) {
            throw new IllegalArgumentException("No Location found for location ID ${params.id}")
        }
        if (existingLocation.isZoneLocation() && Location.findAllByZone(existingLocation)) {
            throw new IllegalArgumentException("You cannot delete zone that is assigned to a bin location ${params.id}")
        }

        try {
            locationService.deleteLocation(existingLocation)
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            throw new Exception("${warehouse.message(code: 'default.not.deleted.with.reason.message', args: [warehouse.message(code: 'location.label', default: 'Location'), existingLocation.id, e.message])}")
        }

        render(status: 204)
    }

    def downloadTemplate() {
        def csv = "id,name,active,locationNumber,locationType,locationGroup,parentLocation,organization,streetAddress,streetAddress2,city,stateOrProvince,postalCode,country,description\n"

        response.setHeader("Content-disposition", "attachment; filename=\"Location_template.csv\"")
        render(contentType: "text/csv", text: CSVUtils.prependBomToCsvString(csv.toString()), encoding: "UTF-8")
    }

    def importCsv(ImportDataCommand command) {
        def importFile = command.importFile

        if (importFile.isEmpty()) {
            throw new IllegalArgumentException("File cannot be empty")
        }

        if (importFile.contentType != "text/csv") {
            throw new IllegalArgumentException("File must be in CSV format")
        }

        locationService.importLocationCsv(command)

        render status: 200
    }

    def downloadBinLocationTemplate() {
        def filename = "binLocations.xls"
        try {
            def file = documentService.findFile("templates/" + filename)
            response.setHeader 'Content-disposition', "attachment; filename=\"${filename}\""
            response.outputStream << file.bytes
            response.outputStream.flush()
        }
        catch (FileNotFoundException e) {
            render status: 404
        }
    }

    def importBinLocations() {
        try {
            MultipartFile multipartFile = request.getFile('fileContents')
            if (multipartFile.empty) {
                throw new IllegalArgumentException("File cannot be empty")
            }

            locationService.importBinLocations(params.id, multipartFile.inputStream)

        } catch (Exception e) {
            response.status = 500
            render([errorCode: 500, errorMessage: e?.message ?: "An unknown error occurred during import"] as JSON)
            return
        }

        render status: 200
    }
}
