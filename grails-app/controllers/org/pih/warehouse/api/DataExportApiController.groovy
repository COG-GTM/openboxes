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
import org.pih.warehouse.core.Document
import org.pih.warehouse.core.DocumentCode

class DataExportApiController {

    /**
     * Custom data export documents backing the React dataExport/index screen.
     * Mirrors DataExportController.index (documents with the DATA_EXPORT
     * document code); downloads still go through /dataExport/render.
     */
    def list() {
        List<Document> documents = Document.findAllByDocumentCode(DocumentCode.DATA_EXPORT)
        render([data: documents.collect { [id: it.id, name: it.name] }] as JSON)
    }
}
