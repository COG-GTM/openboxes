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
import grails.core.GrailsApplication
import util.ConfigHelper

class ErrorsApiController {

    GrailsApplication grailsApplication

    /**
     * Details of the last server-side error, stashed in the session by
     * ErrorsController before redirecting to the React error screen, plus
     * the error-report mail configuration needed by the "report as bug" form.
     */
    def details() {
        Map lastError = session.lastErrorDetails as Map ?: [:]
        // Consume the stash so a later visit to an error screen doesn't show
        // a stale, unrelated error
        session.lastErrorDetails = null
        boolean mailEnabled = ConfigHelper.booleanValue(grailsApplication.config.openboxes.mail.errors.enabled)
        List recipients = ConfigHelper.listValue(grailsApplication.config.openboxes.mail.errors.recipients) as List ?: []

        render([
                data: [
                        error      : lastError ?: null,
                        mailEnabled: mailEnabled,
                        recipients : recipients,
                        user       : session.user ? [
                                id      : session.user.id,
                                name    : session.user.name,
                                username: session.user.username,
                                email   : session.user.email,
                        ] : null,
                ],
        ] as JSON)
    }
}
