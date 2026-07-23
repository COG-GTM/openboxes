/**
 * Copyright (c) 2012 Partners In Health.  All rights reserved.
 * The use and distribution terms for this software are covered by the
 * Eclipse Public License 1.0 (http://opensource.org/licenses/eclipse-1.0.php)
 * which can be found in the file epl-v10.html at the root of this distribution.
 * By using this software in any fashion, you are agreeing to be bound by
 * the terms of this license.
 * You must not remove this notice, or any other, from this software.
 **/
package org.pih.warehouse.batch

import grails.core.GrailsApplication
import org.pih.warehouse.api.GenericApiService
import org.pih.warehouse.core.DocumentService
import org.pih.warehouse.core.UploadService
import org.pih.warehouse.data.DataService
import org.pih.warehouse.importer.ImportDataCommand
import org.springframework.web.multipart.support.DefaultMultipartHttpServletRequest

class BatchController {

    DataService dataService
    DocumentService documentService
    GrailsApplication grailsApplication
    GenericApiService genericApiService
    UploadService uploadService

    def index() {}

    def uploadData(ImportDataCommand command) {
        if (request instanceof DefaultMultipartHttpServletRequest) {
            def uploadFile = request.getFile('xlsFile')
            if (!uploadFile.empty) {
                def localFile = uploadService.createLocalFile(uploadFile.originalFilename)
                uploadFile.transferTo(localFile)
            }
        }
    }

    def downloadExcel() {
        println "Download XLS template " + params

        def objects = genericApiService.getList(params.type, [:])
        def domainClass = genericApiService.getDomainClass(params.type)
        def data = dataService.transformObjects(objects, domainClass.PROPERTIES)

        response.contentType = "application/vnd.ms-excel"
        response.setHeader 'Content-disposition', "attachment; filename=\"${params.type}.xls\""
        documentService.generateExcel(response.outputStream, data)
        response.outputStream.flush()
    }

    def downloadTemplate() {
        println "Download XLS template " + params
        def filename = params.template
        try {
            def file = documentService.findFile("templates/" + filename)
            response.contentType = "application/vnd.ms-excel"
            response.setHeader 'Content-disposition', "attachment; filename=\"${filename}\""
            response.outputStream << file.bytes
            response.outputStream.flush()
        }
        catch (FileNotFoundException e) {
            response.status = 404
        }
    }

    def downloadCsvTemplate() {
        println "Download csv template " + params
        def filename = params.template
        try {
            def file = documentService.findFile("templates/" + filename)
            response.contentType = "text/csv"
            response.setHeader 'Content-disposition', "attachment; filename=\"${filename}\""
            response.outputStream << file.bytes
            response.outputStream.flush()
        }
        catch (FileNotFoundException e) {
            response.status = 404
        }
    }

    def importData(ImportDataCommand command) {
        // Screen migrated to React; uploads and imports go through BatchApiController.importData
        render(view: "/common/react", params: params)
    }
}
