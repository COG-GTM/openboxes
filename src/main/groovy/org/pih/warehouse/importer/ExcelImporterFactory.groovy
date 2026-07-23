/**
 * Copyright (c) 2012 Partners In Health.  All rights reserved.
 * The use and distribution terms for this software are covered by the
 * Eclipse Public License 1.0 (http://opensource.org/licenses/eclipse-1.0.php)
 * which can be found in the file epl-v10.html at the root of this distribution.
 * By using this software in any fashion, you are agreeing to be bound by
 * the terms of this license.
 * You must not remove this notice, or any other, from this software.
 **/
package org.pih.warehouse.importer

/**
 * Maps an importType chosen on the Data Import screen to its Excel importer.
 * Returns null for an unknown import type.
 */
class ExcelImporterFactory {

    static DataImporter createImporter(String importType, String filename) {
        switch (importType) {
            case "category":
                return new CategoryExcelImporter(filename)
            case "inventory":
                return new InventoryExcelImporter(filename)
            case "inventoryLevel":
                return new InventoryLevelExcelImporter(filename)
            case "location":
                return new LocationExcelImporter(filename)
            case "person":
                return new PersonExcelImporter(filename)
            case "product":
                return new ProductExcelImporter(filename)
            case "productAttribute":
                return new ProductAttributeExcelImporter(filename)
            case "productCatalog":
                return new ProductCatalogExcelImporter(filename)
            case "productCatalogItem":
                return new ProductCatalogItemExcelImporter(filename)
            case "productSupplier":
                return new ProductSupplierExcelImporter(filename)
            case "productSupplierPreference":
                return new ProductSupplierPreferenceExcelImporter(filename)
            case "productSupplierAttribute":
                return new ProductSupplierAttributeExcelImporter(filename)
            case "productPackage":
                return new ProductPackageExcelImporter(filename)
            case "outboundStockMovement":
                return new OutboundStockMovementExcelImporter(filename)
            case "tag":
                return new TagExcelImporter(filename)
            case "user":
                return new UserExcelImporter(filename)
            case "userLocation":
                return new UserLocationExcelImporter(filename)
            case "productAssociation":
                return new ProductAssociationExcelImporter(filename)
            case "productSynonym":
                return new ProductSynonymExcelImporter(filename)
            case "purchaseOrderActualReadyDate":
                return new PurchaseOrderActualReadyDateExcelImporter(filename)
            default:
                return null
        }
    }
}
