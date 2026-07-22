/**
 * Copyright (c) 2012 Partners In Health.  All rights reserved.
 * The use and distribution terms for this software are covered by the
 * Eclipse Public License 1.0 (http://opensource.org/licenses/eclipse-1.0.php)
 * which can be found in the file epl-v10.html at the root of this distribution.
 * By using this software in any fashion, you are agreeing to be bound by
 * the terms of this license.
 * You must not remove this notice, or any other, from this software.
 **/
package org.pih.warehouse.product

import grails.gorm.transactions.Transactional
import org.pih.warehouse.data.DataService

@Transactional
class ProductCatalogController {

    DataService dataService

    def index() {
        redirect(action: "list", params: params)
    }

    def list() {
        render(view: "/common/react", params: params)
    }

    def create() {
        render(view: "/common/react", params: params)
    }

    def show() {
        render(view: "/common/react", params: params)
    }

    def edit() {
        render(view: "/common/react", params: params)
    }

    def exportProductCatalog() {

        def productCatalog = ProductCatalog.get(params.id)
        if (productCatalog) {
            def date = new Date()
            response.setHeader("Content-disposition",
                    "attachment; filename=\"ProductCatalog-${date.format("yyyyMMdd-hhmmss")}.csv\"")
            response.contentType = "text/csv"

            def data = productCatalog.productCatalogItems.collect {
                return [
                        "Catalog Code": it.productCatalog?.code,
                        "Product Code": it?.product?.productCode,
                        "Product Name": it?.product?.name,
                        "Category": it?.product?.category?.name,
                ]
            }
            render(contentType: "text/csv", text: dataService.generateCsv(data))
        } else {
            response.sendError(404)
        }
    }
}
