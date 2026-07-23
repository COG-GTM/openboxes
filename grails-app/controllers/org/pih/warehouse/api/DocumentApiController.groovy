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
import grails.gorm.PagedResultList
import grails.gorm.transactions.Transactional
import grails.validation.ValidationException
import org.hibernate.ObjectNotFoundException
import org.springframework.context.i18n.LocaleContextHolder
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.http.HttpStatus
import org.springframework.web.multipart.MultipartFile
import org.springframework.web.multipart.MultipartHttpServletRequest

import org.pih.warehouse.core.Document
import org.pih.warehouse.core.DocumentFilterCommand
import org.pih.warehouse.core.DocumentService
import org.pih.warehouse.core.DocumentType
import util.FileUtil

class DocumentApiController {

    DocumentService documentService

    def messageSource

    /**
     * Creates a standalone document from a multipart upload (the React
     * document/create screen). Mirrors the legacy DocumentController.save.
     */
    @Transactional
    def create() {
        Document documentInstance = new Document()
        documentInstance.documentType = params["documentType.id"] ? DocumentType.get(params["documentType.id"]) : null

        def file = request.getFile("fileContents")
        if (!file || file?.isEmpty()) {
            response.status = 400
            render([errorCode: 400, errorMessage: warehouse.message(code: 'document.documentCannotBeEmpty.message')] as JSON)
            return
        } else if (file.size < 10 * 1024 * 1000) {
            documentInstance.name = file.originalFilename
            documentInstance.filename = file.originalFilename
            documentInstance.fileContents = file.bytes
            documentInstance.extension = FileUtil.getExtension(file.originalFilename)
            documentInstance.contentType = file.contentType
        }

        if (documentInstance.save(flush: true)) {
            render([data: [
                    id          : documentInstance.id,
                    name        : documentInstance.name,
                    filename    : documentInstance.filename,
                    extension   : documentInstance.extension,
                    contentType : documentInstance.contentType,
                    documentType: documentInstance.documentType
                            ? [id: documentInstance.documentType.id, name: documentInstance.documentType.name]
                            : null,
                    message     : warehouse.message(code: 'default.created.message',
                            args: [warehouse.message(code: 'document.label', default: 'Document'), documentInstance.id]),
            ]] as JSON)
            return
        }

        transactionStatus.setRollbackOnly()
        response.status = 400
        Locale currentLocale = LocaleContextHolder.locale
        List errorMessages = documentInstance.errors.allErrors.collect { messageSource.getMessage(it, currentLocale) }
        render([errorCode: 400, errorMessage: "Validation error", errorMessages: errorMessages] as JSON)
    }

    def list(DocumentFilterCommand command) {
        PagedResultList<Document> documents = documentService.getDocuments(command)
        render([data: documents.collect { toJson(it) }, totalCount: documents.totalCount] as JSON)
    }

    def read() {
        Document document = Document.get(params.id)
        if (!document) {
            throw new ObjectNotFoundException(params.id, Document.class.toString())
        }
        render([data: toJson(document)] as JSON)
    }

    @Transactional
    def update() {
        Document document = Document.get(params.id)
        if (!document) {
            throw new ObjectNotFoundException(params.id, Document.class.toString())
        }
        bindDocument(document, request.JSON)
        if (document.hasErrors() || !document.save(flush: true)) {
            throw new ValidationException("Invalid document", document.errors)
        }
        render([data: toJson(document)] as JSON)
    }

    @Transactional
    def delete() {
        Document document = Document.get(params.id)
        if (!document) {
            throw new ObjectNotFoundException(params.id, Document.class.toString())
        }
        try {
            document.delete(flush: true)
        } catch (DataIntegrityViolationException ignored) {
            transactionStatus.setRollbackOnly()
            String message = "${warehouse.message(code: 'default.not.deleted.message', args: [warehouse.message(code: 'document.label', default: 'Document'), params.id])}"
            response.status = HttpStatus.BAD_REQUEST.value()
            render([errorCode: HttpStatus.BAD_REQUEST.value(), errorMessage: message] as JSON)
            return
        }
        render status: HttpStatus.NO_CONTENT.value()
    }

    /**
     * Replaces the file contents of an existing document (the legacy
     * document/edit "File" tab upload).
     */
    @Transactional
    def uploadContent() {
        Document document = Document.get(params.id)
        if (!document) {
            throw new ObjectNotFoundException(params.id, Document.class.toString())
        }
        MultipartFile file = request instanceof MultipartHttpServletRequest ? request.getFile("fileContents") : null
        if (!file || file.isEmpty()) {
            response.status = HttpStatus.BAD_REQUEST.value()
            render([errorCode: HttpStatus.BAD_REQUEST.value(), errorMessage: g.message(code: 'document.documentCannotBeEmpty.message')] as JSON)
            return
        }
        if (file.size >= 10 * 1024 * 1000) {
            response.status = HttpStatus.BAD_REQUEST.value()
            render([errorCode: HttpStatus.BAD_REQUEST.value(), errorMessage: g.message(code: 'document.documentTooLarge.message')] as JSON)
            return
        }
        if (!Document.isAllowedFile(file.originalFilename, file.contentType, file.inputStream)) {
            response.status = HttpStatus.BAD_REQUEST.value()
            render([errorCode: HttpStatus.BAD_REQUEST.value(), errorMessage: g.message(code: 'document.uploadNotAllowed.message',
                    args: [Document.allowedExtensions().join(', ')])] as JSON)
            return
        }
        // Only change the name if it was never modified from the original filename
        if (document.filename == document.name) {
            document.name = file.originalFilename
        }
        document.filename = file.originalFilename
        document.fileContents = file.bytes
        document.extension = FileUtil.getExtension(file.originalFilename)
        document.contentType = file.contentType
        if (document.hasErrors() || !document.save(flush: true)) {
            throw new ValidationException("Invalid document", document.errors)
        }
        render([data: toJson(document)] as JSON)
    }

    private void bindDocument(Document document, jsonObject) {
        if (jsonObject.containsKey("name")) {
            document.name = jsonObject.name ?: null
        }
        if (jsonObject.containsKey("documentType")) {
            document.documentType = jsonObject.documentType?.id
                    ? DocumentType.get(jsonObject.documentType.id)
                    : null
        }
        if (jsonObject.containsKey("extension")) {
            document.extension = jsonObject.extension ?: null
        }
        if (jsonObject.containsKey("contentType")) {
            document.contentType = jsonObject.contentType ?: null
        }
        if (jsonObject.containsKey("fileUri")) {
            document.fileUri = jsonObject.fileUri ?: null
        }
        if (jsonObject.containsKey("documentNumber")) {
            document.documentNumber = jsonObject.documentNumber ?: null
        }
        document.validate()
    }

    private static Map toJson(Document document) {
        return [
                id            : document.id,
                name          : document.name,
                filename      : document.filename,
                extension     : document.extension,
                contentType   : document.contentType,
                fileUri       : document.fileUri,
                documentNumber: document.documentNumber,
                documentType  : document.documentType
                        ? [id: document.documentType.id, name: document.documentType.name]
                        : null,
                size          : document.size,
                image         : document.isImage(),
                dateCreated   : document.dateCreated,
                lastUpdated   : document.lastUpdated,
        ]
    }
}
