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
import org.apache.commons.csv.CSVPrinter
import org.grails.web.json.JSONObject
import org.pih.warehouse.core.Constants
import org.pih.warehouse.core.Document
import org.pih.warehouse.core.DocumentCode
import org.pih.warehouse.core.DocumentType
import org.pih.warehouse.core.Location
import org.pih.warehouse.core.Organization
import org.pih.warehouse.invoice.Invoice
import org.pih.warehouse.invoice.InvoiceIdentifierService
import org.pih.warehouse.invoice.InvoiceItemCandidate
import org.pih.warehouse.invoice.InvoiceItem
import org.pih.warehouse.invoice.InvoiceList
import org.pih.warehouse.invoice.InvoiceType
import org.pih.warehouse.invoice.InvoiceTypeCode
import org.pih.warehouse.invoice.InvoiceStatus
import org.pih.warehouse.order.Order
import org.springframework.web.multipart.MultipartFile
import org.springframework.web.multipart.MultipartHttpServletRequest
import util.FileUtil

class InvoiceApiController {

    InvoiceIdentifierService invoiceIdentifierService
    def invoiceDataService
    def invoiceService
    def documentService

    def list() {
        Location location = Location.get(session.warehouse.id)
        params.partyFromId = location?.organization?.id
        Boolean includeInvoiceItems = params.boolean("invoiceItems", false)

        List<InvoiceList> invoices = invoiceService.getInvoices(params, includeInvoiceItems)

        if (params.format == "csv") {
            CSVPrinter csv = includeInvoiceItems
                    ? invoiceService.getInvoiceItemsCsv(invoices.invoice.invoiceItems.flatten())
                    : invoiceService.getInvoicesCsv(invoices)

            String name = includeInvoiceItems ? "Invoice Items" : "Invoices"
            response.setHeader("Content-disposition", "attachment; filename=\"${name}-${new Date().format("MM/dd/yyyy")}.csv\"")
            render(contentType: "text/csv", text: csv.out.toString())
            return
        }
        render([data: invoices, totalCount: invoices?.totalCount] as JSON)
    }

    def read() {
        Invoice invoice = Invoice.get(params.id)
        if (!invoice) {
            throw new IllegalArgumentException("No Invoice found for invoice ID ${params.id}")
        }

        render([data: invoice?.toJson()] as JSON)
    }

    /**
     * Full read model for the migrated invoice show screen (header, auditing,
     * items and documents in a single response). Mirrors the data rendered by
     * the legacy invoice/show GSP and its _summary/_invoiceItems/_documents
     * templates.
     */
    def details() {
        Invoice invoice = Invoice.get(params.id)
        if (!invoice) {
            response.status = 404
            render([errorCode: 404, errorMessage: "Invoice ${params.id} not found"] as JSON)
            return
        }
        List<Document> orderDocs = []
        invoice.invoiceItems?.each { InvoiceItem invoiceItem ->
            Order order = invoiceItem.order
            order?.documents?.each { Document document ->
                boolean alreadyIncluded = orderDocs.find { it.id == document.id } ||
                        invoice.documents?.find { it.id == document.id }
                if (!alreadyIncluded) {
                    orderDocs.add(document)
                }
            }
        }
        render([data: [
                id                  : invoice.id,
                invoiceNumber       : invoice.invoiceNumber,
                vendorInvoiceNumber : invoice.vendorInvoiceNumber?.identifier,
                name                : invoice.name,
                description         : invoice.description,
                status              : invoice.status?.name(),
                vendor              : invoice.party ? [id: invoice.party.id, name: invoice.party.displayName] : null,
                partyFrom           : invoice.partyFrom ? [id: invoice.partyFrom.id, name: invoice.partyFrom.displayName] : null,
                createdBy           : invoice.createdBy ? [id: invoice.createdBy.id, name: invoice.createdBy.name] : null,
                updatedBy           : invoice.updatedBy ? [id: invoice.updatedBy.id, name: invoice.updatedBy.name] : null,
                currencyUom         : invoice.currencyUom ? [id: invoice.currencyUom.id, code: invoice.currencyUom.code, name: invoice.currencyUom.name] : null,
                invoiceType         : invoice.invoiceType ? [id: invoice.invoiceType.id, code: invoice.invoiceType.code?.name(), name: invoice.invoiceType.name] : null,
                totalValue          : invoice.totalValue,
                totalValueNormalized: invoice.totalValueNormalized,
                defaultCurrencyCode : grailsApplication.config.openboxes.locale.defaultCurrencyCode,
                dateCreated         : invoice.dateCreated,
                lastUpdated         : invoice.lastUpdated,
                dateInvoiced        : invoice.dateInvoiced,
                dateSubmitted       : invoice.dateSubmitted,
                datePosted          : invoice.datePosted,
                orders              : invoice.orders?.findAll { it }?.collect { [id: it.id, orderNumber: it.orderNumber] } ?: [],
                shipments           : invoice.shipments?.findAll { it }?.collect { [id: it.id, shipmentNumber: it.shipmentNumber] } ?: [],
                items               : invoice.sortedInvoiceItems.collect { InvoiceItem invoiceItem ->
                    [
                            id            : invoiceItem.id,
                            productCode   : invoiceItem.product?.productCode,
                            description   : invoiceItem.description,
                            orderNumber   : invoiceItem.order?.orderNumber,
                            glAccountCode : invoiceItem.glAccount?.code,
                            budgetCodeCode: invoiceItem.budgetCode?.code,
                            quantity      : invoiceItem.quantity,
                            quantityPerUom: invoiceItem.quantityPerUom,
                            unitPrice     : invoiceItem.unitPrice,
                            amount        : invoiceItem.amount,
                            inverse       : invoiceItem.inverse,
                            isAdjustment  : invoiceItem.orderAdjustment != null,
                    ]
                },
                documents           : (invoice.documents?.collect { documentToJson(it, true) } ?: []) +
                        orderDocs.collect { documentToJson(it, false) },
        ]] as JSON)
    }

    /**
     * Non-template document types for the migrated invoice add document screen
     * (mirrors documentService.getNonTemplateDocumentTypes used by the legacy
     * InvoiceController.addDocument action).
     */
    def documentTypes() {
        List<DocumentType> documentTypeList = documentService.getNonTemplateDocumentTypes().sort { it.name }
        render([data: documentTypeList.collect {
            [id: it.id, value: it.id, label: it.name]
        }] as JSON)
    }

    /**
     * Mirrors the invoice branch of DocumentController.uploadDocument for the
     * migrated add document screen. Accepts either an uploaded file or a URL
     * (fileUri), like the legacy form.
     */
    @Transactional
    def uploadDocument() {
        Invoice invoice = Invoice.get(params.id)
        if (!invoice) {
            response.status = 404
            render([errorCode: 404, errorMessage: "Invoice ${params.id} not found"] as JSON)
            return
        }
        MultipartFile file = request instanceof MultipartHttpServletRequest ? request.getFile("fileContents") : null
        String fileUri = params.fileUri
        if (!file?.size && !fileUri) {
            response.status = 400
            render([errorCode: 400, errorMessage: g.message(code: 'document.documentCannotBeEmpty.message')] as JSON)
            return
        }
        String typeId = params.typeId ?: Constants.DEFAULT_DOCUMENT_TYPE_ID
        DocumentType documentType = DocumentType.get(typeId)
        Document documentInstance
        if (file?.size) {
            if (!Document.isAllowedFile(file.originalFilename, file.contentType, file.inputStream)) {
                response.status = 400
                render([errorCode: 400, errorMessage: g.message(code: 'document.uploadNotAllowed.message',
                        args: [Document.allowedExtensions().join(', ')])] as JSON)
                return
            }
            if (file.size >= 10 * 1024 * 1000) {
                response.status = 400
                render([errorCode: 400, errorMessage: g.message(code: 'document.documentTooLarge.message')] as JSON)
                return
            }
            documentInstance = new Document(
                    size: file.size,
                    name: params.name ?: file.originalFilename,
                    filename: file.originalFilename,
                    fileContents: file.bytes,
                    contentType: file.contentType,
                    extension: file.originalFilename ? FileUtil.getExtension(file.originalFilename) : null,
                    documentNumber: params.documentNumber,
                    documentType: documentType)
        } else {
            documentInstance = new Document(
                    size: 0,
                    name: params.name ?: fileUri,
                    filename: params.name ?: fileUri,
                    fileUri: fileUri,
                    contentType: "-",
                    documentNumber: params.documentNumber,
                    documentType: documentType)
        }

        documentInstance.validate()
        List<DocumentCode> forbiddenDocumentCodes = DocumentCode.templateList()
        if (documentType && forbiddenDocumentCodes.contains(documentType.documentCode)) {
            documentInstance.errors.reject("documentType", "Template types are not allowed for this document upload")
        }
        if (documentInstance.hasErrors()) {
            transactionStatus.setRollbackOnly()
            response.status = 400
            render([errorCode: 400, errorMessage: "Validation errors",
                    errors: documentInstance.errors.allErrors.collect { g.message(error: it) }] as JSON)
            return
        }
        invoice.addToDocuments(documentInstance)
        invoice.save(flush: true)
        response.status = 201
        render([data: documentToJson(documentInstance, true)] as JSON)
    }

    /**
     * Mirrors the legacy InvoiceController.deleteDocument action for the
     * migrated invoice show screen.
     */
    @Transactional
    def deleteDocument() {
        Invoice invoice = Invoice.get(params.id)
        if (!invoice) {
            response.status = 404
            render([errorCode: 404, errorMessage: "Invoice ${params.id} not found"] as JSON)
            return
        }
        Document document = invoice.documents?.find { it.id == params.documentId }
        if (!document) {
            response.status = 404
            render([errorCode: 404, errorMessage: "Document ${params.documentId} not found on invoice ${params.id}"] as JSON)
            return
        }
        invoice.removeFromDocuments(document)
        invoice.save(flush: true)
        render status: 204
    }

    private static Map documentToJson(Document document, boolean editable) {
        return [
                id          : document.id,
                name        : document.name,
                filename    : document.filename,
                fileUri     : document.fileUri,
                size        : document.size,
                lastUpdated : document.lastUpdated,
                documentType: document.documentType ? [id: document.documentType.id, name: document.documentType.name] : null,
                editable    : editable,
        ]
    }

    def create() {
        JSONObject jsonObject = request.JSON

        Location currentLocation = Location.get(session.warehouse.id)
        if (!currentLocation) {
            throw new IllegalArgumentException("User must be logged into a location to create invoice")
        }

        Invoice invoice = new Invoice()
        bindInvoiceData(invoice, currentLocation, jsonObject)

        if (invoice.hasErrors() || !invoiceDataService.save(invoice)) {
            throw new ValidationException("Invalid invoice", invoice.errors)
        }

        render([data: invoice?.toJson()] as JSON)
    }

    def update() {
        JSONObject jsonObject = request.JSON

        Invoice existingInvoice = Invoice.get(params.id)
        if (!existingInvoice) {
            throw new IllegalArgumentException("No Invoice found for invoice ID ${params.id}")
        }

        Location currentLocation = Location.get(session.warehouse.id)
        if (!currentLocation) {
            throw new IllegalArgumentException("User must be logged into a location to create invoice")
        }

        bindInvoiceData(existingInvoice, currentLocation, jsonObject)

        if (existingInvoice.hasErrors() || !invoiceDataService.save(existingInvoice)) {
            throw new ValidationException("Invalid invoice", existingInvoice.errors)
        }

        render([data: existingInvoice?.toJson()] as JSON)
    }

    def statusOptions() {
        def options = InvoiceStatus.list().collect{
            [ id: it.name(), value: it.name(), label: "${g.message(code: 'enum.InvoiceStatus.' + it.name())}", variant: it.variant?.name() ]
        }
        render([data: options] as JSON)
    }

    def invoiceTypeCodes() {
        def codes = InvoiceTypeCode.list().collect{
            [ id: it.name(), value: it.name(), label: "${g.message(code: 'enum.InvoiceTypeCode.' + it.name())}"]
        }
        render([data: codes] as JSON)
    }

    Invoice bindInvoiceData(Invoice invoice, Location currentLocation, JSONObject jsonObject) {
        bindData(invoice, jsonObject)

        if (!invoice.partyFrom) {
            invoice.partyFrom = currentLocation?.organization
        }

        if (!invoice.invoiceNumber) {
            invoice.invoiceNumber = invoiceIdentifierService.generate(invoice)
        }

        if (!invoice.invoiceType) {
            invoice.invoiceType = InvoiceType.findByCode(InvoiceTypeCode.INVOICE)
        }

        invoice.party = Organization.get(jsonObject?.vendor)

        // TODO: find or create vendor invoice number in reference numbers
        invoiceService.createOrUpdateVendorInvoiceNumber(invoice, jsonObject?.vendorInvoiceNumber)

        return invoice
    }

    def getInvoiceItems() {
        List<InvoiceItem> invoiceItems = invoiceService.getInvoiceItems(params.id, params.max, params.offset)
        render([data: invoiceItems, totalCount: invoiceItems.totalCount?:invoiceItems.size()] as JSON)
    }

    def getInvoiceItemCandidates() {
        JSONObject jsonObject = request.JSON
        List<InvoiceItemCandidate> invoiceItemCandidates = invoiceService.getInvoiceItemCandidates(
            params.id, jsonObject.orderNumbers, jsonObject.shipmentNumbers
        )
        render([data: invoiceItemCandidates] as JSON)
    }

    def getOrderNumbers() {
        List orderNumbers = invoiceService.getDistinctFieldFromInvoiceItemCandidates(params.id, "orderNumber")

        render([data: orderNumbers] as JSON)
    }

    def getShipmentNumbers() {
        List shipmentNumbers = invoiceService.getDistinctFieldFromInvoiceItemCandidates(params.id, "shipmentNumber")

        render([data: shipmentNumbers] as JSON)
    }

    def removeItem() {
        invoiceService.removeInvoiceItem(params.id)
        render status: 204
    }

    def updateItems() {
        JSONObject jsonObject = request.JSON

        Invoice invoice = Invoice.get(params.id)
        List invoiceItems = jsonObject.remove("invoiceItems")
        invoiceService.updateItems(invoice, invoiceItems)
        render status: 204
    }

    def submitInvoice() {
        Invoice invoice = Invoice.get(params.id)
        if (!invoice) {
            throw new IllegalArgumentException("No Invoice found for invoice ID ${params.id}")
        }
        invoiceService.submitInvoice(invoice)
        render([data: invoice?.toJson()] as JSON)
    }

    def postInvoice() {
        Invoice invoice = Invoice.get(params.id)
        if (!invoice) {
            throw new IllegalArgumentException("No Invoice found for invoice ID ${params.id}")
        }
        invoiceService.postInvoice(invoice)
        render([data: invoice?.toJson()] as JSON)
    }

    /**
     * @deprecated Inverse items are now stored in the final invoice, no longer need to pull these
     */
    def getPrepaymentItems() {
        Invoice invoice = Invoice.get(params.id)
        List<InvoiceItem> prepaymentItems = invoice.prepaymentItems
        render([data: prepaymentItems, totalCount: prepaymentItems.size()] as JSON)
    }

    def validateInvoiceItem(InvoiceItem invoiceItem) {
        if (!invoiceItem.validate()) {
            throw new ValidationException("Invalid invoice item", invoiceItem.errors)
        }

        render(status: 200)
    }
}
