/**
* Copyright (c) 2012 Partners In Health.  All rights reserved.
* The use and distribution terms for this software are covered by the
* Eclipse Public License 1.0 (http://opensource.org/licenses/eclipse-1.0.php)
* which can be found in the file epl-v10.html at the root of this distribution.
* By using this software in any fashion, you are agreeing to be bound by
* the terms of this license.
* You must not remove this notice, or any other, from this software.
**/
package org.pih.warehouse

import org.pih.warehouse.core.Location
import org.pih.warehouse.core.User

class MobileController {

    def userService
    def productService
    def inventoryService
    def megamenuService
    def stockMovementService

    def index() {
        render(view: "/common/react")
    }

    def login() {
        render(view: "/common/react")
    }

    def chooseLocation() {
        render(view: "/common/react", params: params)
    }

    def error() {
        render(view: "/common/react", params: params)
    }

    def productList() {
        render(view: "/common/react")
    }

    def productDetails() {
        render(view: "/common/react")
    }

    def outboundList() {
        render(view: "/common/react")
    }

}
