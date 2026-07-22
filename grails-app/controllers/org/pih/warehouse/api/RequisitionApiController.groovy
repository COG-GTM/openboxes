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
import org.pih.warehouse.core.Constants
import org.pih.warehouse.core.Document
import org.pih.warehouse.core.DocumentCode
import org.pih.warehouse.core.DocumentType
import org.pih.warehouse.core.Location
import org.pih.warehouse.core.Person
import org.pih.warehouse.core.User
import org.pih.warehouse.requisition.CommodityClass
import org.pih.warehouse.requisition.Requisition
import org.pih.warehouse.requisition.RequisitionIdentifierService
import org.pih.warehouse.requisition.RequisitionStatus
import org.pih.warehouse.requisition.RequisitionType
import org.springframework.web.multipart.MultipartFile
import util.FileUtil

@Transactional
class RequisitionApiController extends BaseApiController {

    def requisitionService
    RequisitionIdentifierService requisitionIdentifierService

    def documentTypes() {
        List<DocumentType> documentTypeList = DocumentType.list().sort { it.name }
        render([data: documentTypeList.collect {
            [id: it.id, value: it.id, label: it.name]
        }] as JSON)
    }

    def templates() {
        def requisitionCriteria = new Requisition(isTemplate: true, isPublished: true)
        requisitionCriteria.origin = Location.get(session.warehouse.id)
        params.max = -1
        params.offset = 0
        def requisitionTemplates =
                requisitionService.getAllRequisitionTemplates(requisitionCriteria, params)
        requisitionTemplates = requisitionTemplates.sort { it?.destination?.name }
        render([data: requisitionTemplates.collect { Requisition template ->
            [
                    id            : template.id,
                    name          : template.name,
                    requestNumber : template.requestNumber,
                    origin        : [id: template.origin?.id, name: template.origin?.name],
                    destination   : [id: template.destination?.id, name: template.destination?.name],
                    commodityClass: template.commodityClass?.name(),
            ]
        }] as JSON)
    }

    def create() {
        def jsonObject = request.JSON
        Requisition requisition = new Requisition(status: RequisitionStatus.CREATED)
        requisition.type = jsonObject.type ? jsonObject.type as RequisitionType : RequisitionType.ADHOC
        requisition.origin = jsonObject.originId ? Location.get(jsonObject.originId) : Location.get(session.warehouse.id)
        requisition.destination = jsonObject.destinationId ? Location.get(jsonObject.destinationId) : null
        requisition.requestedBy = jsonObject.requestedById ? Person.get(jsonObject.requestedById) : null
        requisition.createdBy = User.get(session.user.id)
        requisition.description = jsonObject.description ?: null
        if (jsonObject.commodityClass) {
            requisition.commodityClass = jsonObject.commodityClass as CommodityClass
        }
        if (jsonObject.dateRequested) {
            requisition.dateRequested = Date.parse("yyyy-MM-dd", jsonObject.dateRequested as String)
        }
        if (jsonObject.requestedDeliveryDate) {
            requisition.requestedDeliveryDate = Date.parse("yyyy-MM-dd", jsonObject.requestedDeliveryDate as String)
        }
        requisition.name = jsonObject.name ?: generateName(requisition)
        requisition.requestNumber = requisitionIdentifierService.generate(requisition)
        requisition = requisitionService.saveRequisition(requisition)
        if (requisition.hasErrors()) {
            response.status = 400
            render([errorCode: 400, errorMessage: "Validation errors",
                    errors: requisition.errors.allErrors.collect { g.message(error: it) }] as JSON)
            return
        }
        response.status = 201
        render([data: [id: requisition.id, requestNumber: requisition.requestNumber, name: requisition.name,
                       status: requisition.status?.name(), type: requisition.type?.name()]] as JSON)
    }

    def read() {
        Requisition requisition = Requisition.get(params.id)
        if (!requisition) {
            response.status = 404
            render([errorCode: 404, errorMessage: "Requisition ${params.id} not found"] as JSON)
            return
        }
        render([data: getDetails(requisition)] as JSON)
    }

    /**
     * Mirrors the legacy RequisitionController.confirm action: transitions the
     * requisition to CHECKING when it has not reached that status yet, then
     * returns the details needed for the confirm screen.
     */
    def confirm() {
        Requisition requisition = Requisition.get(params.id)
        if (!requisition) {
            response.status = 404
            render([errorCode: 404, errorMessage: "Requisition ${params.id} not found"] as JSON)
            return
        }
        if (requisition.status < RequisitionStatus.CHECKING) {
            requisition.status = RequisitionStatus.CHECKING
            requisition.save(flush: true)
        }
        render([data: getDetails(requisition)] as JSON)
    }

    /**
     * Mirrors the legacy RequisitionController.saveDetails action (used by the
     * confirm screen to record who checked the requisition and when).
     */
    def saveDetails() {
        Requisition requisition = Requisition.get(params.id)
        if (!requisition) {
            response.status = 404
            render([errorCode: 404, errorMessage: "Requisition ${params.id} not found"] as JSON)
            return
        }
        def jsonObject = request.JSON
        if (jsonObject.containsKey("checkedById")) {
            requisition.checkedBy = jsonObject.checkedById ? Person.get(jsonObject.checkedById) : null
        }
        if (jsonObject.containsKey("dateChecked")) {
            requisition.dateChecked = jsonObject.dateChecked ?
                    Date.parse("yyyy-MM-dd", jsonObject.dateChecked as String) : null
        }
        requisition.save(flush: true)
        render([data: [
                id         : requisition.id,
                checkedBy  : requisition.checkedBy ? [id: requisition.checkedBy.id, name: requisition.checkedBy.name] : null,
                dateChecked: requisition.dateChecked?.format("yyyy-MM-dd"),
        ]] as JSON)
    }

    /**
     * Mirrors the requisition branch of DocumentController.uploadDocument for
     * the migrated add document screen.
     */
    def uploadDocument() {
        Requisition requisition = Requisition.get(params.id)
        if (!requisition) {
            response.status = 404
            render([errorCode: 404, errorMessage: "Requisition ${params.id} not found"] as JSON)
            return
        }
        MultipartFile file = request.getFile("fileContents")
        if (!file?.size) {
            response.status = 400
            render([errorCode: 400, errorMessage: g.message(code: 'document.documentCannotBeEmpty.message')] as JSON)
            return
        }
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
        String typeId = params.typeId ?: Constants.DEFAULT_DOCUMENT_TYPE_ID
        DocumentType documentType = DocumentType.get(typeId)
        Document documentInstance = new Document(
                size: file.size,
                name: params.name ?: file.originalFilename,
                filename: file.originalFilename,
                fileContents: file.bytes,
                contentType: file.contentType,
                extension: file.originalFilename ? FileUtil.getExtension(file.originalFilename) : null,
                documentNumber: params.documentNumber,
                documentType: documentType)

        documentInstance.validate()
        List<DocumentCode> forbiddenDocumentCodes = DocumentCode.templateList()
        if (documentType && forbiddenDocumentCodes.contains(documentType.documentCode)) {
            documentInstance.errors.reject("documentType", "Template types are not allowed for this document upload")
        }
        if (documentInstance.hasErrors()) {
            response.status = 400
            render([errorCode: 400, errorMessage: "Validation errors",
                    errors: documentInstance.errors.allErrors.collect { g.message(error: it) }] as JSON)
            return
        }
        // Requisition has no documents association (removed from the domain), so
        // attach to the requisition's shipment when one exists, matching how
        // stock movement documents are stored.
        def shipment = requisition.shipment
        if (shipment) {
            shipment.addToDocuments(documentInstance).save(flush: true)
        } else {
            documentInstance.save(flush: true)
        }
        response.status = 201
        render([data: [id: documentInstance.id, name: documentInstance.name,
                       filename: documentInstance.filename,
                       documentNumber: documentInstance.documentNumber,
                       documentType: documentType ? [id: documentType.id, name: documentType.name] : null]] as JSON)
    }

    private Map getDetails(Requisition requisition) {
        return [
                id                   : requisition.id,
                requestNumber        : requisition.requestNumber,
                name                 : requisition.name,
                description          : requisition.description,
                status               : requisition.status?.name(),
                type                 : requisition.type?.name(),
                commodityClass       : requisition.commodityClass?.name(),
                origin               : requisition.origin ? [id: requisition.origin.id, name: requisition.origin.name] : null,
                destination          : requisition.destination ? [id: requisition.destination.id, name: requisition.destination.name] : null,
                requestedBy          : requisition.requestedBy ? [id: requisition.requestedBy.id, name: requisition.requestedBy.name] : null,
                createdBy            : requisition.createdBy ? [id: requisition.createdBy.id, name: requisition.createdBy.name] : null,
                verifiedBy           : requisition.verifiedBy ? [id: requisition.verifiedBy.id, name: requisition.verifiedBy.name] : null,
                checkedBy            : requisition.checkedBy ? [id: requisition.checkedBy.id, name: requisition.checkedBy.name] : null,
                dateRequested        : requisition.dateRequested?.format("yyyy-MM-dd"),
                requestedDeliveryDate: requisition.requestedDeliveryDate?.format("yyyy-MM-dd"),
                dateCreated          : requisition.dateCreated?.format(Constants.DEFAULT_DATE_TIME_FORMAT),
                dateVerified         : requisition.dateVerified?.format("yyyy-MM-dd"),
                dateChecked          : requisition.dateChecked?.format("yyyy-MM-dd"),
                requisitionItems     : requisition.requisitionItems?.collect { requisitionItem ->
                    [
                            id               : requisitionItem.id,
                            status           : requisitionItem.status?.name(),
                            product          : [
                                    id           : requisitionItem.product?.id,
                                    productCode  : requisitionItem.product?.productCode,
                                    name         : requisitionItem.product?.name,
                                    unitOfMeasure: requisitionItem.product?.unitOfMeasure,
                            ],
                            quantity         : requisitionItem.quantity ?: 0,
                            quantityCanceled : requisitionItem.quantityCanceled ?: 0,
                            quantityPicked   : requisitionItem.calculateQuantityPicked() ?: 0,
                            quantityRemaining: requisitionItem.calculateQuantityRemaining() ?: 0,
                            cancelReasonCode : requisitionItem.cancelReasonCode,
                            cancelComments   : requisitionItem.cancelComments,
                            picklistItems    : requisitionItem.retrievePicklistItems()?.collect { picklistItem ->
                                [
                                        id            : picklistItem.id,
                                        quantity      : picklistItem.quantity ?: 0,
                                        lotNumber     : picklistItem.inventoryItem?.lotNumber,
                                        binLocation   : picklistItem.binLocation ? [id: picklistItem.binLocation.id, name: picklistItem.binLocation.name] : null,
                                        isSubstitution: picklistItem.inventoryItem?.product != picklistItem.requisitionItem?.product,
                                        product       : [
                                                id           : picklistItem.inventoryItem?.product?.id,
                                                productCode  : picklistItem.inventoryItem?.product?.productCode,
                                                name         : picklistItem.inventoryItem?.product?.name,
                                                unitOfMeasure: picklistItem.inventoryItem?.product?.unitOfMeasure,
                                        ],
                                ]
                            } ?: [],
                    ]
                } ?: [],
        ]
    }

    /**
     * Mirrors the private RequisitionController.getName naming convention.
     */
    private String generateName(Requisition requisition) {
        def commodityClass = requisition.commodityClass ?
                g.message(code: 'enum.CommodityClass.' + requisition.commodityClass) : null
        def requisitionType = requisition.type ?
                g.message(code: 'enum.RequisitionType.' + requisition.type) : null
        def requisitionName = [
                requisitionType,
                requisition.destination,
                requisition.recipientProgram,
                commodityClass,
                requisition?.dateRequested?.format("MMM dd yyyy"),
        ]
        return requisitionName.findAll { it }.join(" - ")
    }
}
