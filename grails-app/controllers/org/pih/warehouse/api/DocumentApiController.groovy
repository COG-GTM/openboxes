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
import org.pih.warehouse.core.Document
import org.pih.warehouse.core.DocumentType
import org.springframework.context.i18n.LocaleContextHolder
import util.FileUtil

/**
 * JSON endpoint backing the React document/create screen.
 * Mirrors DocumentController.save for standalone documents.
 */
class DocumentApiController {

    def messageSource

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
}
