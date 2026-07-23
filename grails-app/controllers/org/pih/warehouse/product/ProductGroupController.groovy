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

import grails.validation.ValidationException

// import grails.plugin.springcache.annotations.CacheFlush

class ProductGroupController {

    ProductService productService
    ProductGroupService productGroupService
    ProductGroupDataService productGroupDataService

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

    /**
     * From the inventory browser.
     */
    def addToProductGroup() {
        ProductGroup productGroupInstance = new ProductGroup()
        productGroupInstance.properties = params
        productGroupInstance.products = productService.getProducts(params['product.id'])


        List<Category> categories = productGroupInstance.products.collect {
            it.category
        }

        categories = categories.unique()

        if (categories.size() > 1) {
            productGroupInstance.errors.rejectValue("category", "Product group must contain products from a single category")
            flash.message = "Please return to the <a href='javascript:history.go(-1)'>Inventory Browser</a> to choose products from a single category."
        }
        productGroupInstance.category = categories.get(0)

        List<ProductGroup> productGroups = ProductGroup.findAllByCategory(productGroupInstance.category)

        render(view: "create", model: [productGroupInstance: productGroupInstance, productGroups: productGroups])
    }

}
