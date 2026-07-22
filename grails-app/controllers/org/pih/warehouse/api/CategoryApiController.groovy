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
import grails.gorm.transactions.Transactional
import grails.validation.ValidationException
import org.hibernate.ObjectNotFoundException
import org.pih.warehouse.product.Category
import org.pih.warehouse.product.CategoryService

@Transactional
class CategoryApiController {

    def productService
    CategoryService categoryService

    def list() {
        log.debug "List products " + params
        def categories = productService.getCategoryTree()
        categories = categories.collect { it.toJson() }
        render([data: categories] as JSON)
    }

    def tree() {
        List<Category> categoriesWithoutParent = productService.getCategoriesWithoutParent()
        render([
                data                           : categoriesWithoutParent.collect { it.toJson() },
                assigningParentToProductEnabled: categoryService.isAssigningParentToProductEnabled(),
        ] as JSON)
    }

    def details() {
        Category category = Category.get(params.id)
        if (!category) {
            throw new ObjectNotFoundException(params.id, "Category")
        }
        render([data: category.toJson() + [
                parentCategory: category.parentCategory ?
                        [id: category.parentCategory.id, name: category.parentCategory.name] : null,
                products      : category.products?.collect {
                    [id: it.id, productCode: it.productCode, name: it.name]
                } ?: [],
        ]] as JSON)
    }

    def updateAssigningParentToProduct() {
        boolean enabled = request.JSON?.enabled ?: false
        categoryService.updateAssigningParentToProduct(enabled)
        render([data: [assigningParentToProductEnabled: categoryService.isAssigningParentToProductEnabled()]] as JSON)
    }

    def read() {
        Category category = Category.get(params.id)
        if (!category) {
            throw new ObjectNotFoundException(params.id, "Category")
        }
        render category.toJson() as JSON
    }

    // Fields the category create/edit screens are allowed to bind
    static final List<String> BINDABLE_PROPERTIES =
            ["name", "description", "sortOrder", "isRoot", "parentCategory"]

    def save() {
        log.debug "Save category " + params
        def category = Category.get(params.id)
        if (!category) {
            category = new Category()
        }
        bindData(category, request.JSON ?: params, [include: BINDABLE_PROPERTIES])

        if (!category.hasErrors() && category.save()) {
            render category.toJson() as JSON
        } else {
            throw new ValidationException("Unable to save category due to errors", category.errors)
        }
    }

    def delete() {
        def category = Category.get(params.id)
        if (!category) {
            throw new ObjectNotFoundException(params.id, "Category")
        } else {
            category.delete(flush: true)
            render status: 204
        }
    }
}
