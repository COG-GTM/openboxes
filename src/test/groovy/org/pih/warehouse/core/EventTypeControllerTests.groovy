/**
* Copyright (c) 2012 Partners In Health.  All rights reserved.
* The use and distribution terms for this software are covered by the
* Eclipse Public License 1.0 (http://opensource.org/licenses/eclipse-1.0.php)
* which can be found in the file epl-v10.html at the root of this distribution.
* By using this software in any fashion, you are agreeing to be bound by
* the terms of this license.
* You must not remove this notice, or any other, from this software.
**/ 
package org.pih.warehouse.core

import grails.testing.gorm.DataTest
import grails.testing.web.controllers.ControllerUnitTest
import org.grails.web.json.JSONObject
import spock.lang.Specification

import org.pih.warehouse.api.EventTypeApiController

class EventTypeControllerTests extends Specification implements ControllerUnitTest<EventTypeApiController>, DataTest {

    Class[] getDomainClassesToMock() {
        [EventType]
    }

    void "test saving valid EventType"() {
        when:
        request.contentType = "application/json"
        request.method = "POST"
        request.content = '{ "name": "testEvent", "eventCode": "SCHEDULED" }'
        controller.create()

        then:
        response.status == 201
        JSONObject json = new JSONObject(response.contentAsString)
        json.data.name == "testEvent"
        json.data.eventCode == "SCHEDULED"
        EventType.count() == 1
    }
}
