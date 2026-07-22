package org.pih.warehouse

import grails.validation.ValidationException
import org.apache.http.auth.AuthenticationException
import org.hibernate.ObjectNotFoundException
import org.pih.warehouse.requisition.RequisitionSourceType

import java.sql.SQLIntegrityConstraintViolationException

/**
 * Copyright (c) 2012 Partners In Health.  All rights reserved.
 * The use and distribution terms for this software are covered by the
 * Eclipse Public License 1.0 (http://opensource.org/licenses/eclipse-1.0.php)
 * which can be found in the file epl-v10.html at the root of this distribution.
 * By using this software in any fashion, you are agreeing to be bound by
 * the terms of this license.
 * You must not remove this notice, or any other, from this software.
 **/
class UrlMappings {
    static mappings = {

        "/snapshot/$action?"(controller: "inventorySnapshot")

        "/inventoryItem/delete/$id**?" {
            controller = "inventoryItem"
            action = "delete"
        }

        "/stockMovement/$action/$id**?" {
            controller = "stockMovement"
        }

        "/stockRequest/$action/$id**?" {
            controller = "stockMovement"
        }

        "/$controller/$action?/$id?" {
            constraints {
                // apply constraints here
            }
        }

        // REST APIs with complex resource names or subresources

        "/api/categories"(parseRequest: true) {
            controller = { "categoryApi" }
            action = [GET: "list", POST: "save"]
        }
        "/api/categories/tree"(parseRequest: true) {
            controller = { "categoryApi" }
            action = [GET: "tree"]
        }
        "/api/categories/assigningParentToProduct"(parseRequest: true) {
            controller = { "categoryApi" }
            action = [PUT: "updateAssigningParentToProduct"]
        }
        "/api/categories/$id/details"(parseRequest: true) {
            controller = { "categoryApi" }
            action = [GET: "details"]
        }
        "/api/categories/$id"(parseRequest: true) {
            controller = { "categoryApi" }
            action = [GET: "read", POST: "save", PUT: "save", DELETE: "delete"]
        }

        // Category options for filters on  product list page
        "/api/categoryOptions"(parseRequest: true) {
            controller = { "selectOptionsApi" }
            action = [GET: "categoryOptions"]
        }

        // Catalog options for filters on  product list page
        "/api/catalogOptions"(parseRequest: true) {
            controller = { "selectOptionsApi" }
            action = [GET: "catalogOptions"]
        }

        "/api/locationGroups"(parseRequest: true) {
            controller = { "locationGroupApi" }
            action = [GET: "list", POST: "create"]
        }

        "/api/locationGroups/search"(parseRequest: true) {
            controller = { "locationGroupApi" }
            action = [GET: "search"]
        }

        "/api/locationGroups/$id/details"(parseRequest: true) {
            controller = { "locationGroupApi" }
            action = [GET: "details"]
        }

        "/api/locationGroups/$id"(parseRequest: true) {
            controller = { "locationGroupApi" }
            action = [GET: "read", PUT: "update", DELETE: "delete"]
        }

        // Product Group options for filters on  product list page
        "/api/productGroupOptions"(parseRequest: true) {
            controller = { "selectOptionsApi" }
            action = [GET: "productGroupOptions"]
        }

        // Tag options for filters on  product list page
        "/api/tagOptions"(parseRequest: true) {
            controller = { "selectOptionsApi" }
            action = [GET: "tagOptions"]
        }

        // Gl account options for filters on product list page
        "/api/glAccountOptions"(parseRequest: true) {
            controller = { "selectOptionsApi" }
            action = [GET: "glAccountOptions"]
        }

        // Gl account type options for the GL account form
        "/api/glAccountTypeOptions"(parseRequest: true) {
            controller = { "selectOptionsApi" }
            action = [GET: "glAccountTypeOptions"]
        }

        // Gl account type code (enum) options for the GL account type form
        "/api/glAccountTypeCodeOptions"(parseRequest: true) {
            controller = { "selectOptionsApi" }
            action = [GET: "glAccountTypeCodeOptions"]
        }

        // Location type code options for the location type form
        "/api/locationTypeCodeOptions"(parseRequest: true) {
            controller = { "selectOptionsApi" }
            action = [GET: "locationTypeCodeOptions"]
        }

        // Party type options for the organization form
        "/api/partyTypeOptions"(parseRequest: true) {
            controller = { "selectOptionsApi" }
            action = [GET: "partyTypeOptions"]
        }

        // Organization role type options for the organization list filters
        "/api/organizationRoleTypeOptions"(parseRequest: true) {
            controller = { "selectOptionsApi" }
            action = [GET: "organizationRoleTypeOptions"]
        }

        // Party type code (enum) options for the party type form
        "/api/partyTypeCodeOptions"(parseRequest: true) {
            controller = { "selectOptionsApi" }
            action = [GET: "partyTypeCodeOptions"]
        }

        // Role type options for the party role form
        "/api/roleTypeOptions"(parseRequest: true) {
            controller = { "selectOptionsApi" }
            action = [GET: "roleTypeOptions"]
        }

        // Party options for the party role form
        "/api/partyOptions"(parseRequest: true) {
            controller = { "selectOptionsApi" }
            action = [GET: "partyOptions"]
        }

        // Party endpoints for the React party screens; explicit mappings
        // because the generic "/api/${resource}s" pattern cannot derive
        // "partyApi" from the irregular plural "parties".
        "/api/parties"(parseRequest: true) {
            controller = { "partyApi" }
            action = [POST: "create"]
        }

        "/api/parties/search"(parseRequest: true) {
            controller = { "partyApi" }
            action = [GET: "search"]
        }

        "/api/parties/$id/details"(parseRequest: true) {
            controller = { "partyApi" }
            action = [GET: "details"]
        }

        "/api/parties/$id"(parseRequest: true) {
            controller = { "partyApi" }
            action = [POST: "update", PUT: "update", DELETE: "delete"]
        }

        "/api/partyRoles/$id/details"(parseRequest: true) {
            controller = { "partyRoleApi" }
            action = [GET: "details"]
        }

        "/api/organizations/search"(parseRequest: true) {
            controller = { "organizationApi" }
            action = [GET: "search"]
        }

        "/api/organizations/$id/details"(parseRequest: true) {
            controller = { "organizationApi" }
            action = [GET: "details"]
        }

        "/api/productGroups"(parseRequest: true) {
            controller = { "productGroupApi" }
            action = [GET: "list", POST: "create"]
        }

        "/api/productGroups/$id"(parseRequest: true) {
            controller = { "productGroupApi" }
            action = [GET: "read", PUT: "update", DELETE: "delete"]
        }

        "/api/productGroups/$id/products"(parseRequest: true) {
            controller = { "productGroupApi" }
            action = [POST: "addProduct"]
        }

        "/api/productGroups/$id/products/$productId"(parseRequest: true) {
            controller = { "productGroupApi" }
            action = [DELETE: "removeProduct"]
        }

        "/api/productTypes"(parseRequest: true) {
            controller = { "productTypeApi" }
            action = [POST: "create"]
        }

        "/api/productTypes/$id"(parseRequest: true) {
            controller = { "productTypeApi" }
            action = [DELETE: "delete"]
        }

        // Product activity / field options for the productType create screen
        "/api/productActivityCodeOptions"(parseRequest: true) {
            controller = { "selectOptionsApi" }
            action = [GET: "productActivityCodeOptions"]
        }

        "/api/productFieldOptions"(parseRequest: true) {
            controller = { "selectOptionsApi" }
            action = [GET: "productFieldOptions"]
        }

        "/api/locationTypes"(parseRequest: true) {
            controller = { "locationTypeApi" }
            action = [GET: "list", POST: "create"]
        }

        "/api/locationTypes/$id"(parseRequest: true) {
            controller = { "locationTypeApi" }
            action = [GET: "read", PUT: "update", DELETE: "delete"]
        }

        "/api/paymentTermOptions"(parseRequest: true) {
            controller = { "selectOptionsApi" }
            action = [GET: "paymentTermOptions"]
        }

        "/api/users" {
            controller = { "selectOptionsApi" }
            action = [GET: "usersOptions"]
        }

        "/api/preferenceTypeOptions" {
            controller = { "selectOptionsApi" }
            action = [GET: "preferenceTypeOptions"]
        }

        "/api/ratingTypeCodeOptions" {
            controller = { "selectOptionsApi" }
            action = [GET: "ratingTypeCodeOptions"]
        }

        "/api/handlingRequirementsOptions" {
            controller = { "selectOptionsApi" }
            action = [GET: "handlingRequirementsOptions"]
        }

        "/api/productTypeOptions" {
            controller = { "selectOptionsApi" }
            action = [GET: "productTypeOptions"]
        }

        "/api/documentTypeOptions" {
            controller = { "selectOptionsApi" }
            action = [GET: "documentTypeOptions"]
        }

        "/api/productAssociationTypeCodeOptions" {
            controller = { "selectOptionsApi" }
            action = [GET: "productAssociationTypeCodeOptions"]
        }

        "/api/productAssociations"(parseRequest: true) {
            controller = { "productAssociationApi" }
            action = [GET: "list", POST: "create"]
        }

        "/api/productAssociations/$id"(parseRequest: true) {
            controller = { "productAssociationApi" }
            action = [GET: "read", PUT: "update", DELETE: "delete"]
        }

        "/api/productCatalogs"(parseRequest: true) {
            controller = { "productCatalogApi" }
            action = [GET: "list", POST: "create"]
        }

        "/api/productCatalogs/$id"(parseRequest: true) {
            controller = { "productCatalogApi" }
            action = [GET: "read", PUT: "update", DELETE: "delete"]
        }

        "/api/productCatalogs/$id/items"(parseRequest: true) {
            controller = { "productCatalogApi" }
            action = [POST: "addItem"]
        }

        "/api/productCatalogs/$id/items/$itemId"(parseRequest: true) {
            controller = { "productCatalogApi" }
            action = [DELETE: "removeItem"]
        }

        "/api/productCatalogs/$id/importItems" {
            controller = { "productCatalogApi" }
            action = [POST: "importItems"]
        }

        "/api/stockMovements/shipmentStatusCodes" {
            controller = { "selectOptionsApi" }
            action = [GET: "shipmentStatusCodesOptions"]
        }

        "/api/products"(parseRequest: true) {
            controller = { "productApi" }
            action = [GET: "list", POST: "save"]
        }

        "/api/products/search"(parseRequest: true) {
            controller = { "productApi" }
            action = [GET: "search"]
        }

        "/api/products/mergeLogs"(parseRequest: true) {
            controller = { "productApi" }
            action = [GET: "mergeLogs"]
        }

        "/api/products/productSearch" {
            controller = { "productApi" }
            action = [GET: "productSearch"]
        }

        "/api/products/upnDatabase" {
            controller = { "productApi" }
            action = [GET: "upnDatabase"]
        }

        "/api/products/batchEdit"(parseRequest: true) {
            controller = { "productApi" }
            action = [GET: "batchEdit", POST: "batchSave"]
        }

        "/api/products/validateImport" {
            controller = { "productApi" }
            action = [POST: "validateImport"]
        }

        "/api/products/$id/details"(parseRequest: true) {
            controller = { "productApi" }
            action = [GET: "details", PUT: "updateDetails"]
        }

        "/api/products/$id/documents" {
            controller = { "productApi" }
            action = [POST: "uploadDocument"]
        }

        "/api/products/$id/documents/$documentId" {
            controller = { "productApi" }
            action = [DELETE: "deleteDocument"]
        }

        "/api/products/$id/$action" {
            controller = { "productApi" }
        }

        "/api/products/$productId/inventoryItems/$lotNumber"(parseRequest: true) {
            controller = { "productApi" }
            action = [GET: "getInventoryItem"]
        }

        "/api/products/getLatestInventoryCountDate" {
            controller = { "productApi" }
            action = [GET: "getLatestInventoryCountDate"]
        }

        "/api/products/import" {
            controller = { "productApi" }
            action = [POST: "importCsv"]
        }

        "/api/products/availableItems" {
            controller = { "productApi" }
            action = [GET: "availableItems"]
        }

        "/api/products/inventoryItems/lotNumbersWithExpirationDate" {
            controller = { "productApi" }
            action = [GET: "getLotNumbersWithExpirationDate"]
        }

        "/api/facilities/$facilityId/products/classifications" {
            controller = "productClassificationApi"
            action = [GET: "list"]
        }

        "/api/facilities/$facilityId/inventory-levels(.$format)?" {
            controller = "inventoryLevelApi"
            action = [GET: "list"]
        }

        "/api/locations/locationTypes" {
            controller = { "locationApi" }
            action = [GET: "locationTypes"]
        }

        "/api/locations/supportedActivities" {
            controller = { "locationApi" }
            action = [GET: "supportedActivities"]
        }

        "/api/locations/binLocations/template" {
            controller = { "locationApi" }
            action = [GET: "downloadBinLocationTemplate"]
        }

        "/api/locations/$id/binLocations/import"(parseRequest: true) {
            controller = { "locationApi" }
            action = [POST: "importBinLocations"]
        }

        "/api/locations/template" {
            controller = { "locationApi" }
            action = [GET: "downloadTemplate"]
        }

        "/api/locations/importCsv" {
            controller = { "locationApi" }
            action = [POST: "importCsv"]
        }

        "/api/locations/search" {
            controller = { "locationApi" }
            action = [GET: "search"]
        }

        "/api/locations/$id/details" {
            controller = { "locationApi" }
            action = [GET: "details"]
        }

        "/api/locations/$id/binLocations" {
            controller = { "locationApi" }
            action = [GET: "binLocations"]
        }

        "/api/locations/$id/zoneLocations" {
            controller = { "locationApi" }
            action = [GET: "zoneLocations"]
        }

        "/api/locations/$id/contents" {
            controller = { "locationApi" }
            action = [GET: "contents"]
        }

        "/api/locations/$id/logo" {
            controller = { "locationApi" }
            action = [DELETE: "deleteLogo"]
        }

        "/api/locations/$id/$action" {
            controller = { "locationApi" }
        }

        "/api/config/data/demo"(parseRequest: true) {
            controller = "loadDataApi"
            action = [GET: "load"]
        }

        "/api/helpscout/configuration" {
            controller = { "helpScoutApi" }
            action = [GET: "configuration"]
        }

        // Stock Movement Item API

        "/api/stockMovementItems"(parseRequest: true) {
            controller = "stockMovementItemApi"
            action = [GET: "list"]
        }

        "/api/stockMovementItems/$id"(parseRequest: true) {
            controller = "stockMovementItemApi"
            action = [GET: "read"]
        }

        "/api/stockMovementItems/$id/details"(parseRequest: true) {
            controller = "stockMovementItemApi"
            action = [GET: "details"]
        }

        "/api/stockMovementItems/$id/updatePicklist"(parseRequest: true) {
            controller = "stockMovementItemApi"
            action = [POST: "updatePicklist"]
        }

        "/api/stockMovementItems/$id/picklistItems" {
            controller = "stockMovementItemApi"
            action = [DELETE: "revertPick"]
        }

        "/api/stockMovementItems/$id/createPicklist"(parseRequest: true) {
            controller = "stockMovementItemApi"
            action = [POST: "createPicklist"]
        }

        "/api/stockMovementItems/$id/clearPicklist"(parseRequest: true) {
            controller = "stockMovementItemApi"
            action = [POST: "clearPicklist"]
        }

        "/api/stockMovementItems/$id/substituteItem"(parseRequest: true) {
            controller = "stockMovementItemApi"
            action = [POST: "substituteItem"]
        }

        "/api/stockMovementItems/$id/revertItem"(parseRequest: true) {
            controller = "stockMovementItemApi"
            action = [POST: "revertItem"]
        }

        "/api/stockMovementItems/$id/cancelItem"(parseRequest: true) {
            controller = "stockMovementItemApi"
            action = [POST: "cancelItem"]
        }

        "/api/stockMovementItems/$id/removeItem"(parseRequest: true) {
            controller = "stockMovementItemApi"
            action = [DELETE: "eraseItem"]
        }

        "/api/stockMovements/$id/stockMovementItems"(parseRequest: true) {
            controller = "stockMovementItemApi"
            action = [GET: "getStockMovementItems"]
        }

        "/api/stockMovements/$id/substitutionItems"(parseRequest: true) {
            controller = "stockMovementItemApi"
            action = [GET: "getSubstitutionItems"]
        }

        // Stock Movement API

        "/api/stockMovements/$id/removeAllItems"(parseRequest: true) {
            controller = "stockMovementApi"
            action = [DELETE: "removeAllItems"]
        }

        "/api/stockMovements/$id/reviseItems"(parseRequest: true) {
            controller = "stockMovementApi"
            action = [POST: "reviseItems"]
        }

        "/api/stockMovements/$id/updateItems"(parseRequest: true) {
            controller = "stockMovementApi"
            action = [POST: "updateItems"]
        }

        "/api/stockMovements/$id/updateInventoryItems"(parseRequest: true) {
            controller = "stockMovementApi"
            action = [POST: "updateInventoryItems"]
        }

        "/api/stockMovements/$id/updateShipmentItems"(parseRequest: true) {
            controller = "stockMovementApi"
            action = [POST: "updateShipmentItems"]
        }

        "/api/stockMovements/$id/updateRequisition"(parseRequest: true) {
            controller = "stockMovementApi"
            action = [POST: "updateRequisition"]
        }

        "/api/stockMovements/$id/updateShipment"(parseRequest: true) {
            controller = "stockMovementApi"
            action = [POST: "updateShipment"]
        }

        "/api/stockMovements/$id/validatePicklist"(parseRequest: true) {
            controller = "stockMovementApi"
            action = [GET: "validatePicklist"]
        }

        "/api/stockMovements/importPickListItems/$id"(parseRequest: true) {
            controller = "picklist"
            action = [POST: "importPickListItems"]
        }

        "/api/stockMovements/importPackListItems/$id"(parseRequest: true) {
            controller = "packListApi"
            action = [POST: "importPackListItems"]
        }

        "/api/stockMovements/exportPickListItems/$id"(parseRequest: true) {
            controller = "picklist"
            action = [GET: "exportPicklistItems"]
        }

        "/api/stockMovements/picklistTemplate/$id"(parseRequest: true) {
            controller = "picklist"
            action = [GET: "exportPicklistTemplate"]
        }

        "/api/stockMovements/packlistTemplate/$id"(parseRequest: true) {
            controller = "packListApi"
            action = [GET: "exportPackTemplate"]
        }

        "/api/stockMovements/createPickList/$id"(parseRequest: true) {
            controller = "stockMovementApi"
            action = [GET: "createPickList"]
        }

        "/api/stockMovements/pendingRequisitionDetails"(parseRequest: true) {
            controller = "stockMovementApi"
            action = [GET: "getPendingRequisitionDetails"]
        }

        "/api/stockMovements"(parseRequest: true) {
            controller = "stockMovementApi"
            action = [GET: "list", POST: "create"]
        }

        "/api/stockMovements/shippedItems"(parseRequest: true) {
            controller = "stockMovementApi"
            action = [GET: "shippedItems"]
        }

        "/api/stockMovements/pendingRequisitionItems"(parseRequest: true) {
            controller = "stockMovementApi"
            action = [GET: "pendingRequisitionItems"]
        }

        "/api/stockMovements/$id/updateAdjustedItems"(parseRequest: true) {
            controller = "stockMovementApi"
            action = [POST: "updateAdjustedItems"]
        }

        // TODO Remove it later once all inbound types are shipment
        "/api/stockMovements/createCombinedShipments"(parseRequest: true) {
            controller = "stockMovementApi"
            action = [POST: "createCombinedShipments"]
        }

        "/api/stockMovements/requisitionsStatusCodes" {
            controller = "stockMovementApi"
            action = [GET: "requisitionStatusCodes"]
        }

        "/api/stockMovements/$id/rollbackApproval" {
            controller = "stockMovementApi"
            action = [PUT: "rollbackApproval"]
        }

        "/api/stockMovements/packingList/template" {
            controller = "stockMovementApi"
            action = [GET: "downloadPackingListTemplate"]
        }

        "/api/stockMovements/$id/documents" {
            controller = "stockMovementApi"
            action = [GET: "getDocuments"]
        }

        "/api/picklists/$id/items" {
            controller = "picklistApi"
            action = [DELETE: "clearPicklist"]
        }

        "/api/picklists/print/$id" {
            controller = "picklistApi"
            action = [GET: "print"]
        }

        "/api/picklists/returnPrint/$id" {
            controller = "picklistApi"
            action = [GET: "returnPrint"]
        }

        "/api/picklists"(parseRequest: true) {
            controller = "picklistApi"
            action = [POST: "save"]
        }

        // Requisition API (classic requisition flow screens migrated to React)

        "/api/requisitions"(parseRequest: true) {
            controller = "requisitionApi"
            action = [GET: "list", POST: "create"]
        }

        "/api/requisitions/$id/edit"(parseRequest: true) {
            controller = "requisitionApi"
            action = [POST: "edit"]
        }

        "/api/requisitions/$id/header"(parseRequest: true) {
            controller = "requisitionApi"
            action = [POST: "updateHeader"]
        }

        "/api/requisitions/$id/items"(parseRequest: true) {
            controller = "requisitionApi"
            action = [POST: "saveItems"]
        }

        "/api/requisitions/$id/pick"(parseRequest: true) {
            controller = "requisitionApi"
            action = [POST: "pick"]
        }

        "/api/requisitions/$id/picklist"(parseRequest: true) {
            controller = "requisitionApi"
            action = [POST: "updatePicklist"]
        }

        "/api/requisitions/$id/picklistItems"(parseRequest: true) {
            controller = "requisitionApi"
            action = [POST: "updatePicklistItems"]
        }

        "/api/requisitions/templates" {
            controller = "requisitionApi"
            action = [GET: "templates"]
        }

        "/api/requisitions/$id" {
            controller = "requisitionApi"
            action = [GET: "read"]
        }

        "/api/requisitions/$id/confirm"(parseRequest: true) {
            controller = "requisitionApi"
            action = [POST: "confirm"]
        }

        "/api/requisitions/$id/details"(parseRequest: true) {
            controller = "requisitionApi"
            action = [POST: "saveDetails"]
        }

        "/api/requisitions/$id/documents" {
            controller = "requisitionApi"
            action = [POST: "uploadDocument"]
        }

        "/api/requisitions/documentTypes" {
            controller = "requisitionApi"
            action = [GET: "documentTypes"]
        }

        "/api/requisitions/$id/review"(parseRequest: true) {
            controller = "requisitionApi"
            action = [POST: "review"]
        }

        "/api/requisitions/$id/process" {
            controller = "requisitionApi"
            action = [GET: "process"]
        }

        "/api/requisitions/$id/issue"(parseRequest: true) {
            controller = "requisitionApi"
            action = [POST: "issue"]
        }

        "/api/requisitions/$id/printDraft" {
            controller = "requisitionApi"
            action = [GET: "printDraft"]
        }

        // Requisition Template API (requisitionTemplate screens migrated to React)

        "/api/requisitionTemplates"(parseRequest: true) {
            controller = "requisitionTemplateApi"
            action = [POST: "create"]
        }

        "/api/requisitionTemplates/$id" {
            controller = "requisitionTemplateApi"
            action = [GET: "read"]
        }

        "/api/requisitionTemplates/$id/header"(parseRequest: true) {
            controller = "requisitionTemplateApi"
            action = [POST: "updateHeader"]
        }

        "/api/requisitionTemplates/$id/items"(parseRequest: true) {
            controller = "requisitionTemplateApi"
            action = [POST: "addItem"]
        }

        "/api/requisitionTemplates/$id/items/$itemId" {
            controller = "requisitionTemplateApi"
            action = [DELETE: "removeItem"]
        }

        "/api/requisitionTemplates/$id/updateItems"(parseRequest: true) {
            controller = "requisitionTemplateApi"
            action = [POST: "updateItems"]
        }

        "/api/requisitionTemplates/$id/importData"(parseRequest: true) {
            controller = "requisitionTemplateApi"
            action = [POST: "importData"]
        }

        "/api/requisitionTemplates/$id/import"(parseRequest: true) {
            controller = "requisitionTemplateApi"
            action = [POST: "doImport"]
        }

        "/api/requisitionTemplates/$id/addProductCodes"(parseRequest: true) {
            controller = "requisitionTemplateApi"
            action = [POST: "addProductCodes"]
        }

        // Requisition Item API (requisitionItem/change screen migrated to React)

        "/api/requisitionItems" {
            controller = "requisitionItemApi"
            action = [GET: "list"]
        }

        "/api/requisitionItems/$id" {
            controller = "requisitionItemApi"
            action = [GET: "read"]
        }

        "/api/requisitionItems/$id/changeQuantity"(parseRequest: true) {
            controller = "requisitionItemApi"
            action = [POST: "changeQuantity"]
        }

        "/api/requisitionItems/$id/substitute"(parseRequest: true) {
            controller = "requisitionItemApi"
            action = [POST: "substitute"]
        }

        "/api/requisitionItems/$id/cancel"(parseRequest: true) {
            controller = "requisitionItemApi"
            action = [POST: "cancel"]
        }

        "/api/requisitionItems/$id/undoChanges"(parseRequest: true) {
            controller = "requisitionItemApi"
            action = [POST: "undoChanges"]
        }

        // Partial Receiving API

        "/api/partialReceiving"(parseRequest: true) {
            controller = "partialReceivingApi"
            action = [GET: "list", POST: "create"]
        }

        "/api/partialReceiving/$id"(parseRequest: true) {
            controller = "partialReceivingApi"
            action = [GET: "read", POST: "update"]
        }

        "/api/partialReceiving/importCsv/$id"(parseRequest: true) {
            controller = "partialReceivingApi"
            action = [POST: "importCsv"]
        }

        "/api/partialReceiving/exportCsv/$id"(parseRequest: true) {
            controller = "partialReceivingApi"
            action = [POST: "exportCsv"]
        }

        // Internal Locations API

        "/api/internalLocations/receiving"(parseRequest: true) {
            controller = "internalLocationApi"
            action = [GET: "listReceiving"]
        }

        "/api/internalLocations/search"(parseRequest: true) {
            controller = "internalLocationApi"
            action = [GET: "search"]
        }

        // Stocklist Item API

        "/api/stocklistItems/availableStocklists"(parseRequest: true) {
            controller = "stocklistItemApi"
            action = [GET: "availableStocklists"]
        }

        "/api/stocklistItems/$id"(parseRequest: true) {
            controller = "stocklistItemApi"
            action = [GET:"read", PUT:"update", DELETE:"remove", POST:"save"]
        }

        // Stocklist API

        "/api/stocklists/sendMail/$id"(parseRequest: true) {
            controller = "stocklistApi"
            action = [POST: "sendMail"]
        }

        "/api/stocklists/$id/export"(parseRequest: true) {
            controller = "stocklistApi"
            action = [GET: "export"]
        }

        "/api/stocklists/$id/clone"(parseRequest: true) {
            controller = "stocklistApi"
            action = [POST: "clone"]
        }

        "/api/stocklists/$id/publish"(parseRequest: true) {
            controller = "stocklistApi"
            action = [POST: "publish"]
        }

        "/api/stocklists/$id/unpublish"(parseRequest: true) {
            controller = "stocklistApi"
            action = [POST: "unpublish"]
        }

        "/api/stocklists/$id/clear"(parseRequest: true) {
            controller = "stocklistApi"
            action = [POST: "clear"]
        }

        // Putaway Item API

        "/api/putawayItems/$id"(parseRequest: true) {
            controller = "putawayItemApi"
            action = [DELETE: "removingItem"]
        }

        // Combined shipments

        "/api/orderNumberOptions"(parseRequest: true) {
            controller = "combinedShipmentItemApi"
            action = [GET: "getOrderOptions"]
        }

        "/api/combinedShipmentItems/findOrderItems"(parseRequest: true) {
            controller = "combinedShipmentItemApi"
            action = [POST:"findOrderItems"]
        }

        "/api/combinedShipmentItems/addToShipment/$id"(parseRequest: true) {
            controller = "combinedShipmentItemApi"
            action = [POST:"addItemsToShipment"]
        }

        "/api/combinedShipmentItems/importTemplate/$id"(parseRequest: true) {
            controller = "combinedShipmentItemApi"
            action = [POST:"importTemplate"]
        }

        "/api/combinedShipmentItems/getProductsInOrders"(parseRequest: true) {
            controller = "combinedShipmentItemApi"
            action = [GET:"getProductsInOrders"]
        }

        "/api/combinedShipmentItems/exportTemplate"(parseRequest: true) {
            controller = "combinedShipmentItemApi"
            action = [GET:"exportTemplate"]
        }

        "/api/unitOfMeasure/currencies"(parseRequest: true) {
            controller = "unitOfMeasureApi"
            action = [GET:"currencies"]
        }

        "/api/unitOfMeasures/options" {
            controller = "unitOfMeasureApi"
            action = [GET: "uomOptions"]
        }

        // Invoice API
        "/api/invoices/$id/details"(parseRequest: true) {
            controller = "invoiceApi"
            action = [GET: "details"]
        }

        "/api/invoices/documentTypes"(parseRequest: true) {
            controller = "invoiceApi"
            action = [GET: "documentTypes"]
        }

        "/api/invoices/$id/documents"(parseRequest: false) {
            controller = "invoiceApi"
            action = [POST: "uploadDocument"]
        }

        "/api/invoices/$id/documents/$documentId"(parseRequest: true) {
            controller = "invoiceApi"
            action = [DELETE: "deleteDocument"]
        }

        // Order API (comments for the migrated add comment screen)
        "/api/orders/$id/comments"(parseRequest: true) {
            controller = "orderApi"
            action = [GET: "listComments", POST: "createComment"]
        }

        // Order API (migrated order list / documents / adjustments screens)
        "/api/orders/pendingItems"(parseRequest: true) {
            controller = "orderApi"
            action = [GET: "pendingItems"]
        }

        "/api/orders/documentTypes"(parseRequest: true) {
            controller = "orderApi"
            action = [GET: "documentTypes"]
        }

        "/api/orders/$id/documents"(parseRequest: false) {
            controller = "orderApi"
            action = [GET: "listDocuments", POST: "uploadDocument"]
        }

        "/api/orders/$id/orderItemOptions"(parseRequest: true) {
            controller = "orderApi"
            action = [GET: "orderItemOptions"]
        }

        "/api/orders/$id/adjustments"(parseRequest: true) {
            controller = "orderApi"
            action = [GET: "listAdjustments", POST: "createAdjustment"]
        }

        "/api/orders/$id/adjustments/$adjustmentId"(parseRequest: true) {
            controller = "orderApi"
            action = [GET: "readAdjustment", PUT: "updateAdjustment"]
        }

        // Order API (migrated order show / print screens)
        "/api/orders/$id/details"(parseRequest: true) {
            controller = "orderApi"
            action = [GET: "details"]
        }

        "/api/orders/$id/items"(parseRequest: true) {
            controller = "orderApi"
            action = [GET: "items"]
        }

        "/api/orders/$id/shipments"(parseRequest: true) {
            controller = "orderApi"
            action = [GET: "shipments"]
        }

        "/api/orders/$id/invoices"(parseRequest: true) {
            controller = "orderApi"
            action = [GET: "invoices"]
        }

        "/api/orders/$id/print"(parseRequest: true) {
            controller = "orderApi"
            action = [GET: "printData"]
        }

        // Order adjustment type API (migrated orderAdjustmentType screens)
        "/api/orderAdjustmentTypes"(parseRequest: true) {
            controller = "orderAdjustmentTypeApi"
            action = [GET: "list", POST: "create"]
        }

        "/api/orderAdjustmentTypes/$id"(parseRequest: true) {
            controller = "orderAdjustmentTypeApi"
            action = [GET: "read", PUT: "update"]
        }

        "/api/orderAdjustmentTypeCodeOptions"(parseRequest: true) {
            controller = { "selectOptionsApi" }
            action = [GET: "orderAdjustmentTypeCodeOptions"]
        }

        // Payment term API (migrated paymentTerm screens)
        "/api/paymentTerms"(parseRequest: true) {
            controller = "paymentTermApi"
            action = [GET: "list", POST: "create"]
        }

        "/api/paymentTerms/$id"(parseRequest: true) {
            controller = "paymentTermApi"
            action = [GET: "read", PUT: "update"]
        }

        // Preference type API (migrated preferenceType screens)
        "/api/preferenceTypes"(parseRequest: true) {
            controller = "preferenceTypeApi"
            action = [GET: "list", POST: "create"]
        }

        "/api/preferenceTypes/$id"(parseRequest: true) {
            controller = "preferenceTypeApi"
            action = [GET: "read", PUT: "update"]
        }

        "/api/validationCodeOptions"(parseRequest: true) {
            controller = { "selectOptionsApi" }
            action = [GET: "validationCodeOptions"]
        }

        "/api/orderSummaries"(parseRequest: true) {
            controller = "orderApi"
            action = [GET: "orderSummaryList"]
        }

        "/api/orderItemSummaries"(parseRequest: true) {
            controller = "orderApi"
            action = [GET: "orderItemSummaryList"]
        }

        "/api/orderAdjustmentTypeOptions"(parseRequest: true) {
            controller = { "selectOptionsApi" }
            action = [GET: "orderAdjustmentTypeOptions"]
        }

        "/api/budgetCodeOptions"(parseRequest: true) {
            controller = { "selectOptionsApi" }
            action = [GET: "budgetCodeOptions"]
        }

        "/api/orderStatusOptions"(parseRequest: true) {
            controller = { "selectOptionsApi" }
            action = [GET: "orderStatusOptions"]
        }

        "/api/orderSummaryStatusOptions"(parseRequest: true) {
            controller = { "selectOptionsApi" }
            action = [GET: "orderSummaryStatusOptions"]
        }

        "/api/invoices/$id/items"(parseRequest: true) {
            controller = "invoiceApi"
            action = [POST: "updateItems", GET: "getInvoiceItems"]
        }

        "/api/invoices/$id/invoiceItemCandidates"(parseRequest: true) {
            controller = "invoiceApi"
            action = [POST: "getInvoiceItemCandidates"]
        }

        "/api/invoices/$id/orders"(parseRequest: true) {
            controller = "invoiceApi"
            action = [GET: "getOrderNumbers"]
        }

        "/api/invoices/$id/shipments"(parseRequest: true) {
            controller = "invoiceApi"
            action = [GET: "getShipmentNumbers"]
        }

        "/api/invoices/$id/removeItem"(parseRequest: true) {
            controller = "invoiceApi"
            action = [DELETE: "removeItem"]
        }

        "/api/invoices/$id/submit"(parseRequest: true) {
            controller = "invoiceApi"
            action = [POST: "submitInvoice"]
        }

        "/api/invoices/$id/post"(parseRequest: true) {
            controller = "invoiceApi"
            action = [POST: "postInvoice"]
        }

        "/api/invoices/$id/prepaymentItems"(parseRequest: true) {
            controller = "invoiceApi"
            action = [GET: "getPrepaymentItems"]
        }

        "/api/invoiceStatuses"(parseRequest: true) {
            controller = { "invoiceApi" }
            action = [GET: "statusOptions"]
        }

        "/api/invoiceTypeCodes"(parseRequest: true) {
            controller = { "invoiceApi" }
            action = [GET: "invoiceTypeCodes"]
        }

        // TODO: Investigate the proper way to handle validation as a REST resource
        "/api/invoiceItems/$id/validation" {
            controller = "invoiceApi"
            action = [POST: "validateInvoiceItem"]
        }

        "/api/prepaymentInvoices/$id/invoiceItems" {
            controller = "prepaymentInvoiceApi"
            action = [POST: "updateItems"]
        }

        "/api/prepaymentInvoiceItems/$id" {
            controller = "prepaymentInvoiceItemApi"
            action = [POST: "update", DELETE: "delete"]
        }

        // Stock Transfer API

        "/api/stockTransfers/statusOptions"(parseRequest: true) {
            controller = { "stockTransferApi" }
            action = [GET: "statusOptions"]
        }

        "/api/stockTransfers/candidates"(parseRequest: true) {
            controller = { "stockTransferApi" }
            action = [GET: "stockTransferCandidates", POST: "returnCandidates"]
        }

        "/api/stockTransferItems/$id/"(parseRequest: true) {
            controller = { "stockTransferApi" }
            action = [DELETE: "removeItem"]
        }

        "/api/stockTransfers/$id/sendShipment"(parseRequest: true) {
            controller = { "stockTransferApi" }
            action = [POST: "sendShipment"]
        }

        "/api/stockTransfers/$id/rollback" {
            controller = { "stockTransferApi" }
            action = [POST: "rollback"]
        }

        "/api/stockTransfers/$id/removeAllItems"(parseRequest: true) {
            controller = { "stockTransferApi" }
            action = [DELETE: "removeAllItems"]
        }

        // Requirement API

        "/api/requirements"(parseRequest: true) {
            controller = { "replenishmentApi" }
            action = [GET: "requirements", POST: "create"]
        }

        // Replenishment API

        "/api/replenishments/statusOptions"(parseRequest: true) {
            controller = "replenishmentApi"
            action = [GET: "statusOptions"]
        }

        "/api/replenishments/$id/"(parseRequest: true) {
            controller = { "replenishmentApi" }
            action = [GET: "read", POST: "update", PUT: "update"]
        }

        "/api/replenishments/$id/removeItem"(parseRequest: true) {
            controller = { "replenishmentApi" }
            action = [DELETE: "removeItem"]
        }

        "/api/replenishments/$id/picklists"(parseRequest: true) {
            controller = { "replenishmentApi" }
            action = [GET: "getPicklist", POST: "createPicklist", PUT: "updatePicklist", DELETE: "deletePicklist"]
        }

        "/api/replenishments/$id/picklistItem"(parseRequest: true) {
            controller = { "replenishmentApi" }
            action = [POST: "createPicklistItem"]
        }

        "/api/replenishments/$id/print" {
            controller = { "replenishmentApi" }
            action = [GET: "print"]
        }

        // Dashboard API

        "/api/dashboard/config"(parseRequest: true) {
            controller = { "dashboardApi" }
            action = [POST: "updateConfig"]
        }

        "/api/dashboard/$id/config"(parseRequest: true) {
            controller = { "dashboardApi" }
            action = [GET: "config"]
        }

        "/api/dashboard/$id/subdashboardKeys"(parseRequest: true) {
            controller = { "dashboardApi" }
            action = [GET: "getSubdashboardKeys"]
        }

        "/api/dashboard/inventoryByLotAndBin"(parseRequest: true) {
            controller = { "dashboardApi" }
            action = [GET: "getInventoryByLotAndBin"]
        }

        "/api/dashboard/inProgressShipments"(parseRequest: true) {
            controller = { "dashboardApi" }
            action = [GET: "getInProgressShipments"]
        }

        "/api/dashboard/inProgressPutaways"(parseRequest: true) {
            controller = { "dashboardApi" }
            action = [GET: "getInProgressPutaways"]
        }

        "/api/dashboard/receivingBin"(parseRequest: true) {
            controller = { "dashboardApi" }
            action = [GET: "getReceivingBin"]
        }

        "/api/dashboard/itemsInventoried"(parseRequest: true) {
            controller = { "dashboardApi" }
            action = [GET: "getItemsInventoried"]
        }

        "/api/dashboard/defaultBin"(parseRequest: true) {
            controller = { "dashboardApi" }
            action = [GET: "getDefaultBin"]
        }

        "/api/dashboard/expiredProductsInStock"(parseRequest: true) {
            controller = { "dashboardApi" }
            action = [GET: "getExpiredProductsInStock"]
        }

        "/api/dashboard/expirationSummary"(parseRequest: true) {
            controller = { "dashboardApi" }
            action = [GET: "getExpirationSummary"]
        }

        "/api/dashboard/fillRate"(parseRequest: true) {
            controller = { "dashboardApi" }
            action = [GET: "getFillRate"]
        }

        "/api/dashboard/fillRateSnapshot"(parseRequest: true) {
            controller = { "dashboardApi" }
            action = [GET: "getFillRateSnapshot"]
        }

        "/api/dashboard/fillRateDestinations"(parseRequest: true) {
            controller = { "dashboardApi" }
            action = [GET: "getFillRateDestinations"]
        }

        "/api/dashboard/inventorySummary"(parseRequest: true) {
            controller = { "dashboardApi" }
            action = [GET: "getInventorySummary"]
        }

        "/api/dashboard/requisitionsByYear"(parseRequest: true) {
            controller = { "dashboardApi" }
            action = [GET: "getRequisitionsByYear"]
        }

        "/api/dashboard/sentStockMovements"(parseRequest: true) {
            controller = { "dashboardApi" }
            action = [GET: "getSentStockMovements"]
        }

        "/api/dashboard/receivedStockMovements"(parseRequest: true) {
            controller = { "dashboardApi" }
            action = [GET: "getReceivedStockMovements"]
        }

        "/api/dashboard/outgoingStock"(parseRequest: true) {
            controller = { "dashboardApi" }
            action = [GET: "getOutgoingStock"]
        }

        "/api/dashboard/incomingStock"(parseRequest: true) {
            controller = { "dashboardApi" }
            action = [GET: "getIncomingStock"]
        }

        "/api/dashboard/discrepancy"(parseRequest: true) {
            controller = { "dashboardApi" }
            action = [GET: "getDiscrepancy"]
        }

        "/api/dashboard/delayedShipments"(parseRequest: true) {
            controller = { "dashboardApi" }
            action = [GET: "getDelayedShipments"]
        }

        "/api/dashboard/productWithNegativeInventory"(parseRequest: true) {
            controller = { "dashboardApi" }
            action = [GET: "getProductWithNegativeInventory"]
        }

        "/api/dashboard/lossCausedByExpiry"(parseRequest: true) {
            controller = { "dashboardApi" }
            action = [GET: "getLossCausedByExpiry"]
        }

        "/api/dashboard/productsInventoried"(parseRequest: true) {
            controller = { "dashboardApi" }
            action = [GET: "getProductsInventoried"]
        }

        "/api/dashboard/percentageAdHoc"(parseRequest: true) {
            controller = { "dashboardApi" }
            action = [GET: "getPercentageAdHoc"]
        }

        "/api/dashboard/stockOutLastMonth"(parseRequest: true) {
            controller = { "dashboardApi" }
            action = [GET: "getStockOutLastMonth"]
        }

        "/api/dashboard/openStockRequests"(parseRequest: true) {
            controller = { "dashboardApi" }
            action = [GET: "getOpenStockRequests"]
        }

        "/api/dashboard/requestsPendingApproval"(parseRequest: true) {
            controller = { "dashboardApi" }
            action = [GET: "getRequestsPendingApproval"]
        }

        "/api/dashboard/inventoryValue"(parseRequest: true) {
            controller = { "dashboardApi" }
            action = [GET: "getInventoryValue"]
        }

        "/api/dashboard/openPurchaseOrdersCount"(parseRequest: true) {
            controller = { "dashboardApi" }
            action = [GET: "getOpenPurchaseOrdersCount"]
        }

        "/api/dashboard/backdatedOutboundShipments" {
            controller = { "dashboardApi" }
            action = [GET: "getBackdatedOutboundShipments"]
        }

        "/api/dashboard/backdatedInboundShipments" {
            controller = { "dashboardApi" }
            action = [GET: "getBackdatedInboundShipments"]
        }

        "/api/dashboard/itemsWithBackdatedShipments" {
            controller = { "dashboardApi" }
            action = [GET: "getItemsWithBackdatedShipments"]
        }

        /**
         * Inventory API endpoints
         */

        "/api/facilities/$facilityId/inventories/import" {
            controller = { "inventoryApi" }
            action = "importCsv"
        }

        "/api/facilities/$facilityId/inventories/reorderReport" {
            controller = { "inventoryApi" }
            action = [GET: "getReorderReport"]
        }

        "/api/facilities/$facilityId/inventories/summary" {
            controller = { "inventoryApi" }
            action = [GET: "getInventorySummary"]
        }

        "/api/facilities/$facilityId/inventories/expiredStock" {
            controller = { "inventoryApi" }
            action = [GET: "getExpiredStock"]
        }

        "/api/facilities/$facilityId/inventories/expiringStock" {
            controller = { "inventoryApi" }
            action = [GET: "getExpiringStock"]
        }

        "/api/facilities/$facilityId/inventories/binLocations" {
            controller = { "inventoryApi" }
            action = [GET: "getBinLocations"]
        }

        "/api/facilities/$facilityId/inventories/upload"(parseRequest: false) {
            controller = { "inventoryApi" }
            action = [POST: "uploadInventory"]
        }

        "/api/inventories/productsWithoutDefaultInventoryItem" {
            controller = { "inventoryApi" }
            action = [GET: "getProductsWithoutDefaultInventoryItem"]
        }

        "/api/inventories/createDefaultInventoryItems" {
            controller = { "inventoryApi" }
            action = [POST: "createDefaultInventoryItems"]
        }

        /**
         * Transaction API endpoints
         */

        "/api/inventorySnapshots" {
            controller = { "inventorySnapshotApi" }
            action = [GET: "list"]
        }

        "/api/transactions"(parseRequest: true) {
            controller = { "transactionApi" }
            action = [GET: "list", POST: "create"]
        }

        "/api/transactions/daily" {
            controller = { "transactionApi" }
            action = [GET: "listDaily"]
        }

        "/api/transactions/types" {
            controller = { "transactionApi" }
            action = [GET: "transactionTypes"]
        }

        "/api/transactions/locationOptions" {
            controller = { "transactionApi" }
            action = [GET: "locationOptions"]
        }

        "/api/transactions/$id"(parseRequest: false) {
            controller = { "transactionApi" }
            action = [GET: "read", PUT: "update", DELETE: "delete"]
        }

        "/api/transactionEntries/$id"(parseRequest: false) {
            controller = { "transactionApi" }
            action = [GET: "readEntry", PUT: "updateEntry"]
        }

        "/api/transactions/$id/entries/$entryId"(parseRequest: false) {
            controller = { "transactionApi" }
            action = [DELETE: "deleteEntry"]
        }

        /**
        * Purchase Orders API endpoints
        */

        "/api/orderSummaryStatus"(parseRequest: true) {
            controller = { "purchaseOrderApi" }
            action = [GET: "statusOptions"]
        }

        "/api/purchaseOrders/$id/rollback"(parseRequest: true) {
            controller = { "purchaseOrderApi" }
            action = [POST: "rollback"]
        }

        "/api/purchaseOrders"(parseRequest: true) {
            controller = { "purchaseOrderApi" }
            action = [GET: "list"]
        }

        "/api/purchaseOrders/$id"(parseRequest: true) {
            controller = { "purchaseOrderApi" }
            action = [GET: "read", DELETE: "delete"]
        }

        /**
         * Products Configuration API endpoints
         */

        "/api/productsConfiguration/importCategories"(parseRequest: true) {
            controller = { "productsConfigurationApi" }
            action = [POST: "importCategories"]
        }

        "/api/productsConfiguration/importCategoryCsv"(parseRequest: true) {
            controller = { "productsConfigurationApi" }
            action = [POST: "importCategoryCsv"]
        }

        "/api/productsConfiguration/downloadCategoryTemplate"(parseRequest: true) {
            controller = { "productsConfigurationApi" }
            action = [GET: "downloadCategoryTemplate"]
        }

        "/api/productsConfiguration/categoryOptions"(parseRequest: true) {
            controller = { "productsConfigurationApi" }
            action = [GET: "categoryOptions"]
        }

        "/api/productsConfiguration/productOptions"(parseRequest: true) {
            controller = { "productsConfigurationApi" }
            action = [GET: "productOptions"]
        }

        "/api/productsConfiguration/importProducts"(parseRequest: true) {
            controller = { "productsConfigurationApi" }
            action = [POST: "importProducts"]
        }

        "/api/productsConfiguration/categoriesCount"(parseRequest: true) {
            controller = { "productsConfigurationApi" }
            action = [GET: "getCategoriesCount"]
        }

        "/api/productsConfiguration/downloadCategories"(parseRequest: true) {
            controller = { "productsConfigurationApi" }
            action = [GET: "downloadCategories"]
        }

        "/api/productSupplierPreferences/batch" {
            controller = { "productSupplierPreferenceApi" }
            action = [POST: "createOrUpdateBatch"]
        }

        "/api/productSupplierAttributes/batch" {
            controller = { "productSupplierAttributeApi" }
            action = [POST: "updateAttributes"]
        }

        "/api/productSuppliers/export" {
            controller = { "productSupplierApi" }
            action = [GET: "export"]
        }

        "/api/productSuppliers/$id/details" {
            controller = { "productSupplierApi" }
            action = [GET: "details"]
        }

        // Load Data

        "/api/loadData/listOfDemoData"(parseRequest: true) {
            controller = { "loadDataApi" }
            action = [GET: "listOfDemoData"]
        }

        "/api/fulfillments" {
            controller = { "fulfillmentApi" }
            action = [POST: "save"]
        }

        "/api/fulfillments/validate" {
            controller = { "fulfillmentApi" }
            action = [POST: "validate"]
        }

        // Standard REST APIs

        "/api/${resource}s"(parseRequest: true) {
            controller = { "${params.resource}Api" }
            action = [GET: "list", POST: "create"]
        }

        "/api/${resource}s/$id/status"(parseRequest: true) {
            controller = { "${params.resource}Api" }
            action = [GET: "status", DELETE: "deleteStatus", POST: "updateStatus"]
        }

        "/api/${resource}s/$id"(parseRequest: true) {
            controller = { "${params.resource}Api" }
            action = [GET: "read", POST: "update", PUT: "update", DELETE: "delete"]
        }


        // Anonymous REST APIs like Status, Login, Logout

        "/api/$action/$id?"(controller: "api", parseRequest: false) {
            //action = [GET:"show", PUT:"update", DELETE:"delete", POST:"save"]
        }

        "/api/supportLinks"(parseRequest: true) {
            controller = { "api" }
            action = [GET: "getSupportLinks"]
        }

        "/api/resettingInstance/command"(parseRequest: true) {
            controller = { "api" }
            action = [GET: "getResettingInstanceCommand"]
        }

        // Generic API for all other resources

        "/api/generic/${resource}/"(parseRequest: false) {
            controller = "genericApi"
            action = [GET: "list", POST: "create"]
        }

        "/api/generic/${resource}/search"(parseRequest: false) {
            controller = "genericApi"
            action = [GET: "search", POST: "search"]
        }

        "/api/generic/${resource}/$id"(parseRequest: false) {
            controller = "genericApi"
            action = [GET: "read", POST: "update", PUT: "update", DELETE: "delete"]
        }

        "/api/facilities/$facilityId/cycle-counts/candidates" {
            controller = "cycleCountApi"
            action = [GET: "getCandidates"]
        }

        "/api/facilities/$facilityId/cycle-counts/requests/pending" {
            controller = "cycleCountApi"
            action = [GET: "getPendingCycleCountRequests"]
        }

        "/api/facilities/$facilityId/cycle-counts/requests/batch" {
            controller = "cycleCountApi"
            action = [POST: "createRequests", PATCH: "updateRequests", DELETE: "deleteRequests"]
        }

        "/api/facilities/$facility/cycle-counts/start/batch" {
            controller = "cycleCountApi"
            action = [POST: "startCycleCount"]
        }

        "/api/facilities/$facility/cycle-counts/recount/start/batch" {
            controller = "cycleCountApi"
            action = [POST: "startRecount"]
        }

        "/api/facilities/$facility/cycle-counts" {
            controller = "cycleCountApi"
            action = [GET: "list"]
        }

        "/api/facilities/$facility/cycle-counts/$cycleCountId/count" {
            controller = "cycleCountApi"
            action = [POST: "submitCount"]
        }

        "/api/facilities/$facility/cycle-counts/$cycleCountId/recount" {
            controller = "cycleCountApi"
            action = [POST: "submitRecount"]
        }

        "/api/facilities/$facility/cycle-counts/items/$cycleCountItemId" {
            controller = "cycleCountApi"
            action = [PATCH: "updateCycleCountItem", DELETE: "deleteCycleCountItem"]
        }

        "/api/facilities/$facility/cycle-counts/items/upload/count" {
            controller = "cycleCountApi"
            action = [POST: "uploadCycleCountItems"]
        }

        "/api/facilities/$facility/cycle-counts/items/upload/recount" {
            controller = "cycleCountApi"
            action = [POST: "uploadCycleCountRecountItems"]
        }

        "/api/facilities/$facility/cycle-counts/$cycleCountId/items" {
            controller = "cycleCountApi"
            action = [POST: "createCycleCountItem"]
        }

        "/api/facilities/$facility/cycle-counts/$cycleCountId/items/batch" {
            controller = "cycleCountApi"
            action = [POST: "createCycleCountItemBatch", PATCH: "updateCycleCountItemBatch"]
        }

        "/api/facilities/$facility/cycle-counts/items/batch" {
            controller = "cycleCountApi"
            action = [POST: "createCycleCountItemBatch", PATCH: "updateCycleCountItemBatch"]
        }

        "/api/facilities/$facility/cycle-counts/$cycleCountId/refresh" {
            controller = "cycleCountApi"
            action = [POST: "refreshCycleCount"]
        }

        "/api/reports/cycle-count-details" {
            controller = "cycleCountApi"
            action = [POST: "getCycleCountDetails", GET: "getCycleCountDetails"]
        }

        "/api/reports/cycle-count-summary" {
            controller = "cycleCountApi"
            action = [POST: "getCycleCountSummary", GET: "getCycleCountSummary"]
        }

        "/api/reports/inventory-audit-details" {
            controller = "inventoryAuditReport"
            action = [POST: "getInventoryAuditDetails", GET: "getInventoryAuditDetails"]

        }

        "/api/reports/inventory-audit-summary(.$format)?" {
            controller = "inventoryAuditReport"
            action = [POST: "getInventoryAuditSummary", GET: "getInventoryAuditSummary"]
        }

        "/api/reports/inventory-transactions-summary(.$format)?" {
            controller = "inventoryTransactionSummaryApi"
            action = [GET: "getInventoryTransactionsSummary"]
        }

        "/api/reports/indicators/productsInventoried" {
            controller = "indicatorApi"
            action = [GET: "getProductsInventoried"]
        }

        "/api/reports/indicators/inventoryAccuracy" {
            controller = "indicatorApi"
            action = [GET: "getInventoryAccuracy"]
        }

        "/api/reports/indicators/inventoryShrinkage" {
            controller = "indicatorApi"
            action = [GET: "getInventoryShrinkage"]
        }

        "/api/facilities/$facility/inventory/record-stock/save" {
            controller = "recordStockApi"
            action = [POST: "saveRecordStock"]
        }

        "/api/facilities/$facility/inventory/record-stock" {
            controller = "recordStockApi"
            action = [GET: "getRecordStock"]
        }

        /**
         * Stock card API endpoints (React stock card screen)
         */

        "/api/stockCard/$id/summary" {
            controller = "stockCardApi"
            action = [GET: "getSummary"]
        }

        "/api/stockCard/$id/stockHistory" {
            controller = "stockCardApi"
            action = [GET: "getStockHistory"]
        }

        "/api/stockCard/$id/allLocations" {
            controller = "stockCardApi"
            action = [GET: "getAllLocations"]
        }

        "/api/stockCard/$id/pendingInbound" {
            controller = "stockCardApi"
            action = [GET: "getPendingInbound"]
        }

        "/api/stockCard/$id/pendingOutbound" {
            controller = "stockCardApi"
            action = [GET: "getPendingOutbound"]
        }

        "/api/stockCard/$id/demand" {
            controller = "stockCardApi"
            action = [GET: "getDemand"]
        }

        "/api/stockCard/$id/snapshots" {
            controller = "stockCardApi"
            action = [GET: "getSnapshots"]
        }

        "/api/stockCard/$id/suppliers" {
            controller = "stockCardApi"
            action = [GET: "getSuppliers"]
        }

        "/api/stockCard/$id/documents" {
            controller = "stockCardApi"
            action = [GET: "getDocuments"]
        }

        "/api/stockCard/$id/associations" {
            controller = "stockCardApi"
            action = [GET: "getAssociations"]
        }

        "/api/stockCard/$id/transactionLog" {
            controller = "stockCardApi"
            action = [GET: "getTransactionLog"]
        }

        /**
         * Inventory item (lot number) API endpoints
         */

        "/api/products/$productId/allInventoryItems" {
            controller = "inventoryItemApi"
            action = [GET: "list"]
        }

        "/api/inventoryItems"(parseRequest: true) {
            controller = "inventoryItemApi"
            action = [POST: "create"]
        }

        "/api/inventoryItems/$id"(parseRequest: true) {
            controller = "inventoryItemApi"
            action = [PUT: "update", DELETE: "delete"]
        }

        "/api/inventoryItems/$id/recall" {
            controller = "inventoryItemApi"
            action = [POST: "recall"]
        }

        "/api/inventoryItems/$id/revertRecall" {
            controller = "inventoryItemApi"
            action = [POST: "revertRecall"]
        }

        "/api/facilities/$facilityId/products/$productId/inventoryLevel"(parseRequest: true) {
            controller = "inventoryLevelApi"
            action = [GET: "read", PUT: "update"]
        }

        "/api/inventoryLevels"(parseRequest: true) {
            controller = "inventoryLevelApi"
            action = [GET: "search", POST: "create"]
        }

        "/api/inventoryLevels/$id"(parseRequest: true) {
            controller = "inventoryLevelApi"
            action = [GET: "getById", PUT: "updateById", DELETE: "deleteById"]
        }

        "/api/facilities/$facilityId/inventories/productGroupSummary" {
            controller = "inventoryApi"
            action = [GET: "getProductGroupSummary"]
        }

        /**
         * Inventory API endpoints
         */

        "/api/inventories/expirationHistoryReport" {
            controller = { "inventoryApi" }
            action = [GET: "getExpirationHistoryReport"]
        }

        "/api/inventories/browse" {
            controller = { "inventoryApi" }
            action = [GET: "browse"]
        }

        "/api/inventories/transactionCandidates" {
            controller = { "inventoryApi" }
            action = [GET: "getTransactionCandidates"]
        }

        "/api/inventories/binLocationDetails" {
            controller = { "inventoryApi" }
            action = [GET: "getBinLocationDetails"]
        }

        "/api/inventories/adjustStock"(parseRequest: true) {
            controller = { "inventoryApi" }
            action = [POST: "adjustStock"]
        }

        /**
         * Consumption API endpoints
         */

        "/api/consumption/aggregate" {
            controller = { "consumptionApi" }
            action = [GET: "aggregate"]
        }

        "/api/consumption/summary" {
            controller = { "consumptionApi" }
            action = [GET: "summary"]
        }


        // Error handling

        "401"(controller: "errors", action: "handleUnauthorized")
        "404"(controller: "errors", action: "handleNotFound")
        "405"(controller: "errors", action: "handleMethodNotAllowed")
        "500"(controller: "errors", action: "handleException")
        "500"(controller: "errors", action: "handleNotFound", exception: ObjectNotFoundException)
        "500"(controller: "errors", action: "handleValidationErrors", exception: ValidationException)
        "500"(controller: "errors", action: "handleUnauthorized", exception: AuthenticationException)
        "500"(controller: "errors", action: "handleConstraintViolation", exception: SQLIntegrityConstraintViolationException)
        "/"(controller: "dashboard", action: "index")
    }


}
