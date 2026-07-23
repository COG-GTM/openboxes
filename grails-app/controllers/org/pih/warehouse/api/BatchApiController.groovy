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

import java.time.LocalDate
import java.time.ZoneId

import grails.converters.JSON
import org.apache.poi.poifs.filesystem.OfficeXmlFileException
import org.pih.warehouse.core.Location
import org.pih.warehouse.core.UploadService
import org.pih.warehouse.importer.DataImporter
import org.pih.warehouse.importer.ExcelImporterFactory
import org.pih.warehouse.importer.ImportDataCommand
import org.springframework.context.i18n.LocaleContextHolder
import org.springframework.web.multipart.support.StandardMultipartHttpServletRequest

/**
 * JSON endpoint backing the React batch/importData screen.
 * Mirrors BatchController.importData (upload, validate, then import).
 */
class BatchApiController {

    UploadService uploadService
    def messageSource

    def importData(ImportDataCommand command) {
        if (!session.warehouse) {
            response.status = 400
            render([errorCode: 400, errorMessage: warehouse.message(code: 'dashboard.chooseLocation.label', default: 'Please choose a location')] as JSON)
            return
        }
        if (!command.date && params.date) {
            try {
                command.date = Date.from(LocalDate.parse(params.date as String).atStartOfDay(ZoneId.systemDefault()).toInstant())
            } catch (Exception ignored) {
                log.warn("Unable to parse date '${params.date}'")
            }
        }
        def localFile = session.localFile
        if (request instanceof StandardMultipartHttpServletRequest) {
            def uploadFile = command.importFile
            if (!uploadFile?.empty) {
                try {
                    localFile = uploadService.createLocalFile(uploadFile.originalFilename)
                    uploadFile.transferTo(localFile)
                    session.localFile = localFile
                } catch (Exception e) {
                    log.error("Error uploading file " + e.message, e)
                    response.status = 400
                    render([errorCode: 400, errorMessage: "Unable to upload file due to exception: " + e.message] as JSON)
                    return
                }
            } else if (!localFile) {
                response.status = 400
                render([errorCode: 400, errorMessage: warehouse.message(code: 'inventoryItem.emptyFile.message')] as JSON)
                return
            }
        }

        Boolean importedSuccessfully = false
        String message = null
        DataImporter dataImporter = null
        if (localFile) {
            command.filename = localFile.getAbsolutePath()
            command.location = Location.get(session.warehouse.id)
            try {
                dataImporter = ExcelImporterFactory.createImporter(command.importType, command.filename as String)
                if (!dataImporter) {
                    command.errors.reject("importType", "${warehouse.message(code: 'import.invalidType.message', default: 'Please choose a valid import type')}")
                }
            }
            catch (OfficeXmlFileException e) {
                log.error("Error with import file " + e.message, e)
                command.errors.reject("importFile", e.message)
            }

            if (dataImporter) {
                command.data = dataImporter.data
                dataImporter.validateData(command)
                command.columnMap = dataImporter.columnMap
            }

            if (command?.data?.isEmpty()) {
                command.errors.reject("importFile", "${warehouse.message(code: 'inventoryItem.pleaseEnsureDate.message', args: [dataImporter?.columnMap?.sheet ?: 'Sheet1', localFile.getAbsolutePath()])}")
            }

            if (command.importType == 'inventory' && !command.date) {
                command.errors.reject("date", "${warehouse.message(code: 'import.inventoryImportMustHaveDate.message', default: 'Inventory import must specify the date of the stock count')}")
            }

            if (command.importNow && !command.hasErrors()) {
                try {
                    dataImporter.importData(command)
                } catch (Exception e) {
                    log.error("Unable to import data: " + e.message, e)
                    command.errors.reject(e.message)
                }
                if (!command.hasErrors()) {
                    importedSuccessfully = true
                    message = warehouse.message(code: 'inventoryItem.importSuccess.message', args: [localFile.getAbsolutePath()])
                    session.removeAttribute("localFile")
                }
            } else if (!command.hasErrors()) {
                message = warehouse.message(code: 'inventoryItem.dataReadyToBeImported.message')
            }
        } else {
            response.status = 400
            render([errorCode: 400, errorMessage: warehouse.message(code: 'inventoryItem.notValidXLSFile.message')] as JSON)
            return
        }

        Locale currentLocale = LocaleContextHolder.locale
        List errorMessages = command.errors.allErrors.collect { messageSource.getMessage(it, currentLocale) }
        render([data: [
                filename            : localFile.getName(),
                importType          : command.importType,
                date                : command.date?.format("yyyy-MM-dd HH:mm"),
                location            : command.location ? [id: command.location.id, name: command.location.name] : null,
                columnMap           : command.columnMap,
                rows                : command.data,
                importedSuccessfully: importedSuccessfully,
                message             : message,
        ], errorMessages: errorMessages] as JSON)
    }
}
