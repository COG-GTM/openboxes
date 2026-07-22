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
import grails.core.GrailsApplication
import grails.util.Holders
import grails.validation.ValidationException
import org.grails.plugins.web.taglib.ApplicationTagLib
import org.pih.warehouse.core.Constants
import org.pih.warehouse.core.Document
import org.pih.warehouse.core.DocumentCode
import org.pih.warehouse.core.DocumentType
import org.pih.warehouse.core.GlAccount
import org.pih.warehouse.core.Location
import org.pih.warehouse.core.Tag
import org.pih.warehouse.importer.CSVUtils
import org.pih.warehouse.inventory.InventoryItem
import org.pih.warehouse.product.Attribute
import org.pih.warehouse.product.Category
import org.pih.warehouse.product.Product
import org.pih.warehouse.product.ProductAssociation
import org.pih.warehouse.product.ProductAssociationTypeCode
import org.pih.warehouse.product.ProductAttribute
import org.pih.warehouse.product.ProductAvailability
import org.pih.warehouse.product.ProductCatalog
import org.pih.warehouse.product.ProductField
import org.pih.warehouse.product.ProductGroup
import org.pih.warehouse.product.ProductListItem
import org.pih.warehouse.product.ProductType
import org.springframework.beans.factory.annotation.Value
import org.springframework.web.multipart.MultipartFile
import org.springframework.web.multipart.MultipartHttpServletRequest
import util.FileUtil

import java.sql.Timestamp

@Transactional
class ProductApiController extends BaseDomainApiController {

    def productService
    def inventoryService
    def forecastingService
    GrailsApplication grailsApplication
    def productAvailabilityService
    def productMergeService
    def documentService

    @Value('${openboxes.import.product.createMissingCategories}')
    boolean createMissingCategories

    def list() {
        boolean includeInactive = params.boolean('includeInactive') ?: false
        def categories = params.categoryId ? Category.findAllByIdInList(params.list("categoryId")) : null
        def tags = params.tagId ? Tag.getAll(params.list("tagId")) : []
        def catalogs = params.catalogId ? ProductCatalog.getAll(params.list("catalogId")) : []
        def glAccounts = params.glAccountsId ? GlAccount.getAll(params.list('glAccountsId')) : []
        def productFamilies = params.productFamilyId ? ProductGroup.getAll(params.list('productFamilyId')) : []

        // Following this approach of assigning q into other params for productService.getProducts
        params.name = params.q
        params.description = params.q
        params.brandName = params.q
        params.manufacturer = params.q
        params.manufacturerCode = params.q
        params.vendor = params.q
        params.vendorCode = params.q
        params.productCode = params.q
        params.unitOfMeasure = params.q

        // If we specify a format=csv we want to download everything
        if (params.format == 'csv') {
            params.max = -1
        }

        def products = productService.getProducts(categories, catalogs, tags, glAccounts, productFamilies, includeInactive, params)

        if (params.format == 'csv') {
            boolean includeAttributes = params.boolean("includeAttributes") ?: false
            def csv = productService.exportProducts(products, includeAttributes)
            def fileName = params.fileName ? "${params.fileName.replaceAll(" ", "-")}-" : ""
            response.setHeader("Content-disposition",
                    "attachment; filename=\"${fileName}Products-${new Date().format("yyyyMMdd-hhmmss")}.csv\"")
            render(contentType: "text/csv", text: csv)
            return
        }

        if (params.format == 'list') {
            List<ProductListItem> productListItems = products.collect { Product product -> new ProductListItem(product) }
            render([data: productListItems, totalCount: products?.totalCount] as JSON)
            return
        }

        render([data: products, totalCount: products?.totalCount] as JSON)
    }

    def demand() {
        def product = Product.get(params.id)
        def location = Location.get(session.warehouse.id)
        def data = [:]
        data.location = location
        data.product = product
        data.demand = forecastingService.getDemand(location, null, product)

        render([data: data] as JSON)
    }

    def demandSummary() {
        def product = Product.get(params.id)
        def location = Location.get(session.warehouse.id)
        def data = forecastingService.getDemandSummary(location, product)
        render([data: data] as JSON)
    }

    def productSummary() {
        def product = Product.load(params.id)
        def location = Location.load(session.warehouse.id)
        def quantityOnHand = ProductAvailability.findAllByProductAndLocation(product, location).sum { it.quantityOnHand }
        render([data: [product:[id: product.id], location: [id: location.id], quantityOnHand: quantityOnHand]] as JSON)
    }

    def productAvailability() {
        def product = Product.load(params.id)
        def location = Location.load(session.warehouse.id)
        def data = ProductAvailability.findAllByProductAndLocation(product, location)
        render([data: data] as JSON)
    }

    def search() {
        def minLength = grailsApplication.config.openboxes.typeahead.minLength

        if (params?.name?.size() < minLength) {
            render([data: []])
            return
        }

        String[] terms = params?.name?.replaceAll("'", "\\\\'")?.split(",| ")?.findAll { it }
        def products, availableItems = []
        if(params.availableItems) {
            Location location = Location.get(session.warehouse.id)
            products = productService.searchProducts(terms, [], true)
            if (products) {
                availableItems = productAvailabilityService.getAvailableBinLocations(location, products).groupBy { it.inventoryItem?.product?.productCode }
            }
            products = []
            availableItems.each { k, v ->
                products.add([
                    productCode: k,
                    name: v[0].inventoryItem.product.name,
                    id: v[0].inventoryItem.product.id,
                    product: v[0].inventoryItem.product,
                    quantityAvailable: v.sum { it.quantityAvailable },
                    minExpirationDate: v.findAll { it.inventoryItem.expirationDate != null }.collect {
                        it.inventoryItem?.expirationDate
                    }.min()?.format("MM/dd/yyyy"),
                    color: v[0].inventoryItem.product.color,
                    active: v[0].inventoryItem.product?.active
                ])
            }

            products = products.unique()
        } else {
            products = productService.searchProductDtos(terms)
        }
        render([data: products] as JSON)
    }

    def availableItems() {
        def productIds = params.list("product.id") + params.list("id")
        String locationId = params?.location?.id ?: session?.warehouse?.id
        Location location = Location.get(locationId)
        if (!location || productIds.empty) {
            throw new IllegalArgumentException("Must specify a location and at least one product")
        }

        def products = Product.findAllByIdInListAndActive(productIds, true)
        def availableItems = inventoryService.getAvailableBinLocations(location, products)
        render([data: availableItems] as JSON)
    }


    def availableBins() {
        def productIds = params.list("product.id") + params.list("id")
        String locationId = params?.location?.id ?: session?.warehouse?.id
        Location location = Location.get(locationId)

        if (!location || productIds.empty) {
            throw new IllegalArgumentException("Must specify a location and at least one product")
        }

        def products = Product.findAllByIdInListAndActive(productIds, true)
        def availableBins = inventoryService.getAvailableBinLocations(location, products)
        render([data: availableBins] as JSON)
    }


    def substitutions() {
        params.type = ProductAssociationTypeCode.SUBSTITUTE
        params.resource = "substitutions"
        forward(action: "associatedProducts")
    }

    def associatedProducts() {
        Product product = Product.get(params.id)
        ProductAssociationTypeCode[] types = params.list("type")
        log.debug "Types: " + types
        def productAssociations = ProductAssociation.createCriteria().list {
            eq("product", product)
            'in'("code", types)
        }
        def availableItems = []
        boolean hasEarlierExpiringItems = false
        String locationId = params?.location?.id ?: session?.warehouse?.id
        def location = (locationId) ? Location.get(locationId) : null
        if (location) {
            def products = productAssociations.collect { it.associatedProduct }
            log.debug("Location " + location + " products = " + products)

            availableItems = inventoryService.getAvailableItems(location, product)

            productAssociations = productAssociations.collect { productAssociation ->
                def availableProducts = inventoryService.getAvailableProducts(location, productAssociation.associatedProduct)
                def expirationDate = availableProducts.findAll {
                    it.expirationDate != null
                }.collect {
                    it.expirationDate
                }.min()
                def availableQuantity = availableProducts.collect { it.quantity }.sum()
                return [
                        id               : productAssociation.id,
                        type             : productAssociation?.code?.name(),
                        product          : productAssociation.associatedProduct,
                        conversionFactor : productAssociation.quantity,
                        comments         : productAssociation.comments,
                        minExpirationDate: expirationDate,
                        availableQuantity: availableQuantity
                ]
            }
            Date productExpirationDate = availableItems?.collect {
                it.inventoryItem.expirationDate
            }?.min()
            Date otherExpirationDate = productAssociations?.collect { it.minExpirationDate }?.min()
            hasEarlierExpiringItems = productExpirationDate ? productExpirationDate.after(otherExpirationDate) : false
        }

        // This just renames the collection in the JSON so we can match the API called
        // (i.e. resource name is substitutions for /api/products/:id/substitutions)
        params.resource = params.resource ?: "productAssociations"

        render([
                data:
                        [
                                product                : product,
                                availableItems         : availableItems,
                                hasAssociations        : !productAssociations?.empty,
                                hasEarlierExpiringItems: hasEarlierExpiringItems,
                                "${params.resource}"   : productAssociations
                        ]
        ] as JSON)
    }

    def withCatalogs() {
        Product product = Product.get(params.id)

        render([data: [
                id         : product.id,
                name       : product.name,
                productCode: product.productCode,
                catalogs   : product.getProductCatalogs()?.collect {
                    [
                            id  : it.id,
                            name: it.name
                    ]
                }
        ]] as JSON)
    }

    def productAvailabilityAndDemand() {
        Product product = Product.get(params.id)
        Location location = Location.get(params.locationId)
        def quantityOnHand = productAvailabilityService.getQuantityOnHand(product, location)
        def quantityAvailable = inventoryService.getQuantityAvailableToPromise(product, location)
        def demand = forecastingService.getDemand(location, null, product)
        render([monthlyDemand: demand.monthlyDemand, quantityOnHand: quantityOnHand, quantityAvailable: quantityAvailable] as JSON)
    }

    def productDemand() {
        Product product = Product.get(params.id)
        Location origin = Location.get(params.originId)
        Location destination = Location.get(params.destinationId)
        def quantityOnHand = productAvailabilityService.getQuantityOnHand(product, destination)
        def demand = forecastingService.getDemand(origin, destination, product)
        render([monthlyDemand: demand.monthlyDemand, quantityOnHand: quantityOnHand] as JSON)
    }

    def getInventoryItem() {
        InventoryItem inventoryItem = InventoryItem.findByProductAndLotNumber(Product.load(params.productId), params.lotNumber)
        if (inventoryItem) {
            Integer quantityOnHand = productAvailabilityService.getQuantityOnHand(inventoryItem)
            render([inventoryItem: inventoryItem, quantityOnHand: quantityOnHand] as JSON)
            return
        }
        render([inventoryItem: inventoryItem, quantityOnHand: 0] as JSON)
    }

    def getLatestInventoryCountDate() {
        Map<String, Timestamp> latestInventoryDateMap = productService.latestInventoryDateForProducts(params.list("productIds"))

        render([data: latestInventoryDateMap] as JSON)
    }

    // TODO: This was copied almost directly from ProductController. Refactor both methods to shift this logic into
    //       ProductService (and ideally create some helper classes for the service to use to split up the logic).
    def save(Product product) {
        if (product.hasErrors()) {
            throw new ValidationException("Invalid product", product.errors)
        }
        Location location = Location.get(session?.warehouse?.id)

        // TODO: Add this back in once we move this logic to the service
//        updateTags(product, params)

        ProductType defaultProductType = ProductType.defaultProductType.list()?.first()
        // Throw an error for product type with empty code and product identifier that is not a default product type
        if (product.productType?.id != defaultProductType?.id && !product.productType?.code && !product.productType?.productIdentifierFormat) {
            throw new IllegalArgumentException(g.message(code: "product.productType.emptyCodeAndIdentifier.error.message"))
        }

        // Need to validate here FIRST otherwise we'll run into an uncaught transient property exception
        // when the session is closed.
        if (!product?.id || product.validate()) {
            if (!product.productCode) {
                product.productCode = productService.generateProductIdentifier(product)
            }
        }

        product.validateRequiredFieldsInLocation(location)
        if (product.hasErrors() || !productService.saveProduct(product)) {
            throw new ValidationException("Invalid product", product.errors)
        }
        // TODO: Add this back in once we move this logic to the service
        //sendProductCreatedNotification(product)

        render([product: product.toFullJson()] as JSON)
    }

    def importCsv() {
        String fileData = request.inputStream.text

        if (fileData.isEmpty()) {
            throw new IllegalArgumentException("File cannot be empty")
        }

        if (request.contentType != "text/csv") {
            throw new IllegalArgumentException("File must be in CSV format")
        }

        List<String> tags = CSVUtils.getColumnData(fileData, 'Tags')
        List<String> extraTags = params.list("tags").collect { it.split(",") }.flatten().findAll { it } as List<String>
        if (extraTags) {
            tags = ((tags ?: []) + extraTags).unique()
        }
        List<Map<String, Object>> products = productService.validateProducts(fileData, createMissingCategories)

        List<Product> importedProducts = productService.importProducts(products, tags)

        render([data: importedProducts] as JSON)
    }

    def getLotNumbersWithExpirationDate() {
        List<String> productIds = params.list("productIds")

        Map<String, List<Map<String, Object>>> productLotNumbersWithExpiration = productService.getLotNumbersWithExpirationDate(productIds)

        render([data: productLotNumbersWithExpiration] as JSON)
    }

    /**
     * Product merge log listing backing the React product/productMergeLogs screen.
     * Mirrors ProductController.productMergeLogs / ProductMergeService.getProductMergeLogs.
     */
    def mergeLogs() {
        params.max = params.int("max", 10)
        params.offset = params.int("offset", 0)
        def mergeLogs = productMergeService.getProductMergeLogs(params)
        def data = mergeLogs.collect { log ->
            [
                    id                    : log.id,
                    primaryProduct        : [id: log.primaryProduct?.id, productCode: log.primaryProduct?.productCode],
                    obsoleteProduct       : [id: log.obsoleteProduct?.id, productCode: log.obsoleteProduct?.productCode],
                    relatedObjectId       : log.relatedObjectId,
                    relatedObjectClassName: log.relatedObjectClassName,
                    dateMerged            : log.dateMerged,
                    createdBy             : log.createdBy?.name,
            ]
        }
        render([data: data, totalCount: mergeLogs?.totalCount ?: 0] as JSON)
    }

    /**
     * Filtered product listing backing the React product/batchEdit screen.
     * Mirrors legacy ProductController.batchEdit: results only load once a
     * category or tag filter is chosen.
     */
    def batchEdit() {
        Category category = params.categoryId && params.categoryId != "null" ? Category.get(params.categoryId) : null
        List<Tag> tags = params.tagId ? Tag.getAll(params.list("tagId")) : []

        List<Product> products = []
        Integer totalCount = 0
        if (category || tags) {
            products = productService.getProducts(category, tags, params)
            totalCount = products?.totalCount ?: 0
        }

        def data = products.collect { Product product ->
            [
                    id              : product.id,
                    productCode     : product.productCode,
                    name            : product.name,
                    category        : [id: product.category?.id, name: product.category?.name],
                    manufacturer    : product.manufacturer,
                    manufacturerCode: product.manufacturerCode,
                    brandName       : product.brandName,
                    unitOfMeasure   : product.unitOfMeasure,
                    coldChain       : product.coldChain,
                    createdBy       : product.createdBy?.name,
                    updatedBy       : product.updatedBy?.name,
                    dateCreated     : product.dateCreated,
                    lastUpdated     : product.lastUpdated,
            ]
        }
        render([data: data, totalCount: totalCount] as JSON)
    }

    /**
     * Bulk update backing the React product/batchEdit screen. Accepts a JSON
     * body of {products: [{id, productCode, name, category: {id}, ...}]} and
     * mirrors legacy ProductController.batchSave.
     */
    def batchSave() {
        def payload = request.JSON
        List productEntries = payload?.products ?: []
        if (!productEntries) {
            render(status: 400, contentType: "application/json", text: [errorCode: 400, errorMessage: "No products provided"] as JSON)
            return
        }

        List<String> errorMessages = []
        List<Product> loadedProducts = []
        List<Product> productsToSave = []
        productEntries.each { entry ->
            Product product = Product.get(entry.id as String)
            if (!product) {
                errorMessages << "Product with ID ${entry.id} not found".toString()
                return
            }
            loadedProducts << product
            if (entry.containsKey("productCode")) product.productCode = entry.productCode
            if (entry.containsKey("name")) product.name = entry.name
            if (entry.containsKey("manufacturer")) product.manufacturer = entry.manufacturer
            if (entry.containsKey("manufacturerCode")) product.manufacturerCode = entry.manufacturerCode
            if (entry.containsKey("brandName")) product.brandName = entry.brandName
            if (entry.containsKey("unitOfMeasure")) product.unitOfMeasure = entry.unitOfMeasure
            if (entry.containsKey("coldChain")) product.coldChain = entry.coldChain as Boolean
            if (entry.category?.id) {
                product.category = Category.get(entry.category.id as String)
            }
            if (product.validate()) {
                productsToSave << product
            } else {
                product.errors.allErrors.each { error ->
                    errorMessages << g.message(error: error).toString()
                }
            }
        }

        if (errorMessages) {
            loadedProducts.each { it.discard() }
            render(status: 400, contentType: "application/json",
                    text: [errorCode: 400, errorMessage: errorMessages.join("; "), errorMessages: errorMessages, savedCount: 0] as JSON)
            return
        }

        productsToSave.each { it.save() }
        render([savedCount: productsToSave.size()] as JSON)
    }

    /**
     * Full product details backing the React product/edit screen (form fields,
     * attribute values, tags, and read-only collections shown on the legacy
     * edit tabs).
     */
    def details() {
        Product product = Product.get(params.id)
        if (!product) {
            render(status: 404, contentType: "application/json", text: [errorMessage: "Product with ID ${params.id} not found"] as JSON)
            return
        }

        List<String> displayedFields = product.productType?.displayedFields ?
                product.productType.displayedFields.collect { it.name() } :
                ProductField.values().collect { it.name() }

        def data = [
                id                 : product.id,
                version            : product.version,
                productCode        : product.productCode,
                name               : product.name,
                description        : product.description,
                active             : product.active,
                productType        : [id: product.productType?.id, name: product.productType?.name],
                category           : [id: product.category?.id, name: product.category?.name],
                productFamily      : [id: product.productFamily?.id, name: product.productFamily?.name],
                glAccount          : [id: product.glAccount?.id, code: product.glAccount?.code],
                unitOfMeasure      : product.unitOfMeasure,
                pricePerUnit       : product.pricePerUnit,
                abcClass           : product.abcClass,
                coldChain          : product.coldChain,
                controlledSubstance: product.controlledSubstance,
                hazardousMaterial  : product.hazardousMaterial,
                reconditioned      : product.reconditioned,
                lotAndExpiryControl: product.lotAndExpiryControl,
                brandName          : product.brandName,
                manufacturer       : product.manufacturer,
                manufacturerCode   : product.manufacturerCode,
                manufacturerName   : product.manufacturerName,
                modelNumber        : product.modelNumber,
                vendor             : product.vendor,
                vendorCode         : product.vendorCode,
                vendorName         : product.vendorName,
                upc                : product.upc,
                ndc                : product.ndc,
                tags               : product.tagsToString(),
                dateCreated        : product.dateCreated,
                lastUpdated        : product.lastUpdated,
                displayedFields    : displayedFields,
                attributes         : product.attributes?.collect {
                    [attribute: [id: it.attribute?.id, name: it.attribute?.name], value: it.value]
                } ?: [],
                documents          : product.documents?.collect {
                    [id: it.id, name: it.name, filename: it.filename, fileUri: it.fileUri,
                     documentType: it.documentType?.name, contentType: it.contentType]
                } ?: [],
                packages           : product.packages?.collect {
                    [id: it.id, name: it.name, uom: it.uom?.code, quantity: it.quantity, price: it.productPrice?.price]
                } ?: [],
                catalogs           : product.productCatalogs?.collect { [id: it.id, name: it.name] } ?: [],
                productGroups      : product.productGroups?.collect { [id: it.id, name: it.name] } ?: [],
                synonyms           : product.synonyms?.collect {
                    [id: it.id, name: it.name, synonymTypeCode: it.synonymTypeCode?.name(), locale: it.locale?.toString()]
                } ?: [],
                productAssociations: ProductAssociation.findAllByProduct(product).collect {
                    [id: it.id, code: it.code?.name(),
                     associatedProduct: [id: it.associatedProduct?.id, productCode: it.associatedProduct?.productCode, name: it.associatedProduct?.name],
                     quantity: it.quantity, comments: it.comments]
                },
                productSuppliers   : product.productSuppliers?.collect {
                    [id: it.id, code: it.code, name: it.name,
                     supplier: [id: it.supplier?.id, name: it.supplier?.name], supplierCode: it.supplierCode]
                } ?: [],
                inventoryLevels    : product.inventoryLevels?.collect {
                    [id: it.id, facility: it.inventory?.warehouse?.name, binLocation: it.binLocation,
                     minQuantity: it.minQuantity, reorderQuantity: it.reorderQuantity, maxQuantity: it.maxQuantity]
                } ?: [],
        ]
        render([data: data] as JSON)
    }

    /**
     * Update backing the React product/edit screen. Accepts a JSON body of
     * form fields plus tags (comma-separated string) and attributes
     * ([{attribute: {id}, value}]), mirroring legacy ProductController.update.
     */
    def updateDetails() {
        Product product = Product.get(params.id)
        if (!product) {
            render(status: 404, contentType: "application/json", text: [errorMessage: "Product with ID ${params.id} not found"] as JSON)
            return
        }
        def payload = request.JSON
        Location location = Location.get(session?.warehouse?.id)

        if (payload.version != null && product.version > (payload.version as Long)) {
            render(status: 400, contentType: "application/json",
                    text: [errorCode: 400, errorMessage: "Another user has updated this product while you were editing"] as JSON)
            return
        }

        ["productCode", "name", "description", "unitOfMeasure", "abcClass", "brandName",
         "manufacturer", "manufacturerCode", "manufacturerName", "modelNumber",
         "vendor", "vendorCode", "vendorName", "upc", "ndc"].each { field ->
            if (payload.containsKey(field)) {
                product[field] = payload[field] ?: null
            }
        }
        ["active", "coldChain", "controlledSubstance", "hazardousMaterial", "reconditioned",
         "lotAndExpiryControl"].each { field ->
            if (payload.containsKey(field)) {
                product[field] = payload[field] as Boolean
            }
        }
        if (payload.containsKey("pricePerUnit")) {
            product.pricePerUnit = payload.pricePerUnit != null && payload.pricePerUnit != "" ?
                    new BigDecimal(payload.pricePerUnit.toString()) : null
        }
        if (payload.containsKey("productType")) {
            product.productType = payload.productType?.id ? ProductType.get(payload.productType.id as String) : null
        }
        if (payload.containsKey("category") && payload.category?.id) {
            product.category = Category.get(payload.category.id as String)
        }
        if (payload.containsKey("productFamily")) {
            product.productFamily = payload.productFamily?.id ? ProductGroup.get(payload.productFamily.id as String) : null
        }
        if (payload.containsKey("glAccount")) {
            product.glAccount = payload.glAccount?.id ? GlAccount.get(payload.glAccount.id as String) : null
        }

        try {
            if (payload.containsKey("tags")) {
                updateProductTags(product, payload.tags?.toString())
            }
            if (payload.containsKey("attributes")) {
                updateProductAttributes(product, payload.attributes ?: [])
            }

            if (product.validate()) {
                if (!product.productCode) {
                    product.productCode = productService.generateProductIdentifier(product)
                }
            }
            product.validateRequiredFieldsInLocation(location)

            if (product.hasErrors() || !product.save(flush: true)) {
                throw new ValidationException("Invalid product", product.errors)
            }
        } catch (ValidationException e) {
            List<String> errorMessages = e.errors.allErrors.collect { g.message(error: it).toString() }
            product.discard()
            render(status: 400, contentType: "application/json",
                    text: [errorCode: 400, errorMessage: errorMessages.join("; "), errorMessages: errorMessages] as JSON)
            return
        }

        render([product: product.toFullJson()] as JSON)
    }

    private void updateProductTags(Product product, String tagsToBeAdded) {
        List<Tag> tagList = []
        tagsToBeAdded?.split(",")?.each { tagText ->
            tagText = tagText.trim()
            if (tagText) {
                Tag tag = Tag.findByTag(tagText)
                if (!tag) tag = new Tag(tag: tagText)
                tagList << tag
            }
        }
        product.tags?.clear()
        tagList.each { tag -> product.addToTags(tag) }
    }

    private void updateProductAttributes(Product product, def attributeEntries) {
        Map<String, String> valuesByAttributeId = [:]
        attributeEntries.each { entry ->
            if (entry?.attribute?.id) {
                valuesByAttributeId.put(entry.attribute.id as String, entry.value?.toString())
            }
        }

        Map<String, ProductAttribute> existingAttributes = [:]
        product.attributes?.each { existingAttributes.put(it.attribute.id, it) }

        Attribute.findAllByActive(true).each { Attribute attribute ->
            String value = valuesByAttributeId.get(attribute.id)

            if (attribute.active && attribute.required && !value) {
                product.errors.rejectValue("attributes", "product.attribute.required",
                        [] as Object[], "Product attribute ${attribute.name} is required")
                throw new ValidationException("Attribute required", product.errors)
            }

            ProductAttribute existingAttribute = existingAttributes.get(attribute.id)
            if (value) {
                if (!existingAttribute) {
                    product.addToAttributes(new ProductAttribute(attribute: attribute, value: value))
                } else {
                    existingAttribute.value = value
                }
            } else if (existingAttribute?.attribute?.active) {
                product.removeFromAttributes(existingAttribute)
                existingAttribute.delete()
            }
        }
    }

    /**
     * Document upload backing the React product/addDocument screen. Accepts
     * multipart form data (fileContents) or a fileUri, mirroring legacy
     * DocumentController.uploadDocument for the product case.
     */
    def uploadDocument() {
        Product product = Product.get(params.id)
        if (!product) {
            render(status: 404, contentType: "application/json", text: [errorMessage: "Product with ID ${params.id} not found"] as JSON)
            return
        }

        MultipartFile file = null
        if (request instanceof MultipartHttpServletRequest) {
            file = ((MultipartHttpServletRequest) request).getFile("fileContents")
        }
        String fileUri = params.fileUri

        if (!(file?.size || fileUri)) {
            render(status: 400, contentType: "application/json",
                    text: [errorCode: 400, errorMessage: g.message(code: 'document.documentCannotBeEmpty.message', default: 'Document cannot be empty')] as JSON)
            return
        }
        if (file && file.size && !Document.isAllowedFile(file.originalFilename, file.contentType, file.inputStream)) {
            render(status: 400, contentType: "application/json",
                    text: [errorCode: 400, errorMessage: "File type is not allowed. Allowed extensions: ${Document.allowedExtensions().join(', ')}"] as JSON)
            return
        }
        if (file && file.size >= 10 * 1024 * 1000) {
            render(status: 400, contentType: "application/json", text: [errorCode: 400, errorMessage: "File exceeds the maximum size"] as JSON)
            return
        }

        String typeId = params.typeId ?: Constants.DEFAULT_DOCUMENT_TYPE_ID
        DocumentType documentType = DocumentType.get(typeId)

        Document document = new Document(
                size: file?.size,
                name: params.name ?: file?.originalFilename,
                filename: file?.originalFilename,
                fileContents: file?.bytes,
                fileUri: fileUri,
                contentType: file?.contentType,
                extension: file?.originalFilename ? FileUtil.getExtension(file.originalFilename) : null,
                documentType: documentType)

        document.validate()
        if (documentType && DocumentCode.templateList().contains(documentType.documentCode)) {
            document.errors.reject("documentType", "Template types are not allowed for this document upload")
        }
        if (document.hasErrors()) {
            List<String> errorMessages = document.errors.allErrors.collect { g.message(error: it).toString() }
            render(status: 400, contentType: "application/json",
                    text: [errorCode: 400, errorMessage: errorMessages.join("; "), errorMessages: errorMessages] as JSON)
            return
        }

        product.addToDocuments(document).save(flush: true)
        render([document: [id: document.id, name: document.name, filename: document.filename,
                           fileUri: document.fileUri, documentType: document.documentType?.name]] as JSON)
    }

    /**
     * Removes a document from a product (documents tab of the React
     * product/edit screen). Mirrors legacy ProductController.deleteDocument.
     */
    def deleteDocument() {
        Product product = Product.get(params.id)
        Document document = Document.get(params.documentId)
        if (!product || !document || !product.documents?.contains(document)) {
            render(status: 404, contentType: "application/json", text: [errorMessage: "Product or document not found"] as JSON)
            return
        }
        product.removeFromDocuments(document)
        document.delete()
        product.save(flush: true)
        render(status: 204)
    }

    /**
     * CSV validation backing step 2 of the React product/importAsCsv screen.
     * Accepts a raw text/csv body (same as /api/products/import) and returns
     * the parsed rows plus the current values of any matched existing product
     * so the UI can highlight changes. Does not persist anything.
     */
    def validateImport() {
        String fileData = request.inputStream.text

        if (fileData.isEmpty()) {
            throw new IllegalArgumentException("File cannot be empty")
        }
        if (request.contentType != "text/csv") {
            throw new IllegalArgumentException("File must be in CSV format")
        }

        List<String> columns = productService.getColumns(fileData)?.collect { it?.replace("\"", "") }
        List<Map> products
        try {
            products = productService.validateProducts(fileData, createMissingCategories)
        } catch (RuntimeException e) {
            render(status: 400, contentType: "application/json", text: [errorCode: 400, errorMessage: e.message] as JSON)
            return
        }

        def data = products.collect { Map properties ->
            Product existing = properties.product as Product
            [
                    id                 : properties.id,
                    isNew              : !properties.id,
                    active             : properties.active,
                    productCode        : properties.productCode,
                    productType        : properties.productType?.name,
                    name               : properties.name,
                    productFamily      : properties.productFamily?.name,
                    category           : properties.category?.name,
                    glAccount          : properties.glAccount?.code,
                    description        : properties.description,
                    unitOfMeasure      : properties.unitOfMeasure,
                    tags               : properties.tags ?: [],
                    pricePerUnit       : properties.pricePerUnit,
                    lotAndExpiryControl: properties.lotAndExpiryControl,
                    coldChain          : properties.coldChain,
                    controlledSubstance: properties.controlledSubstance,
                    hazardousMaterial  : properties.hazardousMaterial,
                    reconditioned      : properties.reconditioned,
                    manufacturer       : properties.manufacturer,
                    brandName          : properties.brandName,
                    manufacturerCode   : properties.manufacturerCode,
                    manufacturerName   : properties.manufacturerName,
                    vendor             : properties.vendor,
                    vendorCode         : properties.vendorCode,
                    vendorName         : properties.vendorName,
                    upc                : properties.upc,
                    ndc                : properties.ndc,
                    existingProduct    : existing ? [
                            id                 : existing.id,
                            active             : existing.active,
                            productCode        : existing.productCode,
                            productType        : existing.productType?.name,
                            name               : existing.name,
                            productFamily      : existing.productFamily?.name,
                            category           : existing.category?.name,
                            glAccount          : existing.glAccount?.code,
                            description        : existing.description,
                            unitOfMeasure      : existing.unitOfMeasure,
                            tags               : existing.tags?.collect { it.tag } ?: [],
                            pricePerUnit       : existing.pricePerUnit,
                            lotAndExpiryControl: existing.lotAndExpiryControl,
                            coldChain          : existing.coldChain,
                            controlledSubstance: existing.controlledSubstance,
                            hazardousMaterial  : existing.hazardousMaterial,
                            reconditioned      : existing.reconditioned,
                            manufacturer       : existing.manufacturer,
                            brandName          : existing.brandName,
                            manufacturerCode   : existing.manufacturerCode,
                            manufacturerName   : existing.manufacturerName,
                            vendor             : existing.vendor,
                            vendorCode         : existing.vendorCode,
                            vendorName         : existing.vendorName,
                            upc                : existing.upc,
                            ndc                : existing.ndc,
                            dateCreated        : existing.dateCreated,
                            lastUpdated        : existing.lastUpdated,
                    ] : null,
            ]
        }

        render([data: data, columns: columns, totalCount: data.size()] as JSON)
    }
}
