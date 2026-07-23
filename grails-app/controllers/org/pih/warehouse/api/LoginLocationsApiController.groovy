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
import org.pih.warehouse.core.User

class LoginLocationsApiController {

    def locationService

    /**
     * Data backing the React location chooser screen (dashboard/chooseLocation).
     * Mirrors DashboardController.chooseLocation's former GSP model: locations a
     * user may log into, grouped by organization name, plus the user's saved
     * location and last-login metadata for the screen footer.
     */
    def list() {
        User user = User.get(session.user.id)
        Location currentLocation = session.warehouse ? Location.get(session.warehouse.id) : null
        Map loginLocationsMap = locationService.getLoginLocationsMap(user, currentLocation, true)
        // The user's default location, if it's one of the locations they may log into
        boolean savedLocationAvailable = user.warehouse && loginLocationsMap.values().any {
            it.any { Map location -> location.id == user.warehouse.id }
        }
        List savedLocations = savedLocationAvailable ? [toLocationJson(user.warehouse)] : []

        render([
                data: [
                        loginLocations: loginLocationsMap,
                        savedLocations: savedLocations,
                        user          : [
                                id           : user.id,
                                name         : user.name,
                                username     : user.username,
                                lastLoginDate: user.lastLoginDate,
                        ],
                ],
        ] as JSON)
    }

    private static Map toLocationJson(Location location) {
        return [
                id              : location?.id,
                name            : location?.name,
                foregroundColor : location?.fgColor,
                backgroundColor : location?.bgColor,
                organizationName: location?.organization?.name,
                locationType    : location?.locationType?.name,
                locationGroup   : location?.locationGroup?.name,
        ]
    }
}
