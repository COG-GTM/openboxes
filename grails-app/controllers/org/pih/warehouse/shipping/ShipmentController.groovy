/**
 * Copyright (c) 2012 Partners In Health.  All rights reserved.
 * The use and distribution terms for this software are covered by the
 * Eclipse Public License 1.0 (http://opensource.org/licenses/eclipse-1.0.php)
 * which can be found in the file epl-v10.html at the root of this distribution.
 * By using this software in any fashion, you are agreeing to be bound by
 * the terms of this license.
 * You must not remove this notice, or any other, from this software.
 **/
package org.pih.warehouse.shipping

import au.com.bytecode.opencsv.CSVWriter
import com.google.zxing.BarcodeFormat
import grails.gorm.transactions.Transactional
import grails.validation.ValidationException
import groovy.sql.Sql
import org.apache.commons.lang.text.StrSubstitutor

import org.pih.warehouse.core.Comment
import org.pih.warehouse.core.Document
import org.pih.warehouse.core.DocumentService
import org.pih.warehouse.core.DocumentType
import org.pih.warehouse.core.Event
import org.pih.warehouse.core.EventType
import org.pih.warehouse.core.Location
import org.pih.warehouse.core.MailService
import org.pih.warehouse.core.Person
import org.pih.warehouse.core.RoleType
import org.pih.warehouse.core.User
import org.pih.warehouse.inventory.Transaction
import org.pih.warehouse.inventory.TransactionException
import org.pih.warehouse.product.Product
import org.pih.warehouse.receiving.Receipt
import org.pih.warehouse.receiving.ReceiptItem

@Transactional
class ShipmentController {

    static scaffold = Shipment
    def shipmentService
    def userService
    def inventoryService
    MailService mailService
    def barcodeService
    def sessionFactory
    DocumentService documentService
    ShipmentEventManager shipmentEventManager

    def redirect() {
        redirect(controller: "shipment", action: "showDetails", id: params.id)
    }

    def show() {
        redirect(action: "showDetails", params: ['id': params.id])
    }

    // React screen that replaced the legacy list GSP (Phase 2, Batch 22).
    // Data comes from GET /api/shipments (ShipmentApiController.list).
    def list() {
        render(view: "/common/react")
    }

    def showDetails() {
        def shipmentInstance = Shipment.get(params.id)
        if (!shipmentInstance) {
            flash.message = "${warehouse.message(code: 'default.not.found.message', args: [warehouse.message(code: 'shipment.label', default: 'Shipment'), params.id])}"
            redirect(action: "list", params: [type: params.type])
        } else {

            // Redirect to stock movement details page
            if (shipmentInstance?.requisition && !params?.override) {
                redirect(controller: "stockMovement", action: "show", id: shipmentInstance?.requisition?.id)
                return
            }

            // React screen that replaced the legacy showDetails GSP
            // (Phase 2, Batch 22). Data comes from
            // GET /api/shipments/$id/showDetails.
            render(view: "/common/react")
        }
    }

    def showTracking() {
        def shipmentInstance = Shipment.get(params.id)
        def trackingUrl
        def trackingUrlTemplate = shipmentInstance?.shipmentMethod?.shipper?.trackingUrl
        def trackingNumber = shipmentInstance?.shipmentMethod?.trackingNumber
        if (trackingNumber && trackingUrlTemplate?.contains("%s")) {
            trackingUrl = String.format(trackingUrlTemplate, trackingNumber)
        }
        else {
            trackingUrl = StrSubstitutor.replace(trackingUrlTemplate, [trackingNumber:trackingNumber])
        }

        render(template: "showTracking", model: [shipmentInstance: shipmentInstance, trackingUrl: trackingUrl])
    }

    def showTransactions() {
        def shipmentInstance = Shipment.get(params.id)
        render(template: "showTransactions", model: [shipmentInstance: shipmentInstance])
    }

    def syncTransactions() {
        def shipmentInstance = Shipment.get(params.id)
        shipmentService.synchronizeTransactions(shipmentInstance)
        redirect(action: "showDetails", id: params.id)
    }

    def editDetails() {

        def shipmentInstance = Shipment.get(params.id)
        if (!shipmentInstance) {
            flash.message = "${warehouse.message(code: 'default.not.found.message', args: [warehouse.message(code: 'shipment.label', default: 'Shipment'), params.id])}"
            redirect(action: "list", params: [type: params.type])
        } else {
            [shipmentInstance: shipmentInstance]
        }
    }

    // React screen that replaced the legacy sendShipment GSP (Phase 2,
    // Batch 22). Sending goes through POST /api/shipments/$id/send.
    def sendShipment() {
        def shipmentInstance = Shipment.get(params.id)
        if (!shipmentInstance) {
            flash.message = "${warehouse.message(code: 'default.not.found.message', args: [warehouse.message(code: 'shipment.label', default: 'Shipment'), params.id])}"
            redirect(action: "list", params: [type: params.type])
            return
        }
        render(view: "/common/react")
    }

    def refreshCurrentStatus() {
        shipmentService.refreshCurrentStatus(params.id)
        redirect(action: "showDetails", id: params?.id)
    }


    def rollbackLastEvent() {
        def shipmentInstance = Shipment.get(params.id)
        shipmentService.rollbackLastEvent(shipmentInstance)
        redirect(action: "showDetails", id: shipmentInstance?.id)
    }

    def deleteShipment() {
        def shipmentInstance = Shipment.get(params.id)
        if (!shipmentInstance) {
            flash.message = "${warehouse.message(code: 'default.not.found.message', args: [warehouse.message(code: 'shipment.label', default: 'Shipment'), params.id])}"
            redirect(controller: "dashboard", action: "index")
            return
        } else {
            if ("POST".equalsIgnoreCase(request.getMethod())) {
                shipmentService.deleteShipment(shipmentInstance)

                flash.message = "${warehouse.message(code: 'default.deleted.message', args: [warehouse.message(code: 'shipment.label', default: 'Shipment'), shipmentInstance.id])}"
                redirect(controller: "dashboard", action: "index")
                return
            }
        }
        // Confirmation screen migrated to React (Phase 2, Batch 21)
        render(view: "/common/react")
    }

    def markAsReceived() {
        def shipmentInstance = Shipment.get(params.id)

        // actually process the receipt
        shipmentService.markAsReceived(shipmentInstance, session.warehouse)
        if (!shipmentInstance.hasErrors()) {
            flash.message = "${warehouse.message(code: 'default.updated.message', args: [warehouse.message(code: 'shipment.label', default: 'Shipment'), shipmentInstance.id])}"
        }
        redirect(controller: "shipment", action: "showDetails", id: shipmentInstance.id)
    }


    def bulkDeleteShipments() {
        def shipmentIds = params.list("shipment.id")

        log.info "Shipment ids: " + shipmentIds
        try {
            shipmentIds.each { shipmentId ->
                Shipment shipment = Shipment.get(shipmentId)
                shipmentService.deleteShipment(shipment)
            }
            flash.message = "Successfully deleted ${shipmentIds?.size()} shipments"

        } catch (Exception e) {
            flash.message = "Error occurred while bulk deleting shipments: " + e.message
        }
        redirect(action: "list", params: [type: params.type, status: params.status])
    }

    def bulkReceiveShipments() {
        def shipmentIds = params.list("shipment.id")
        try {
            shipmentService.receiveShipments(shipmentIds, null, session.user.id, session.warehouse.id, true)
            flash.message = "Successfully received shipments"

        } catch (Exception e) {
            flash.message = "Error occurred while bulk receiving shipments: " + e.message
        }
        redirect(action: "list", params: [type: params.type, status: params.status])
    }


    def bulkMarkAsReceived() {
        def shipmentIds = params.list("shipment.id")
        Location location = Location.load(session.warehouse.id)
        try {
            shipmentIds.each { shipmentId ->
                Shipment shipment = Shipment.load(shipmentId)
                shipmentService.markAsReceived(shipment, location)
            }
            flash.message = "Successfully received shipments"

        } catch (Exception e) {
            flash.message = "Error occurred while bulk receiving shipments: " + e.message
        }
        redirect(action: "list", params: [type: params.type, status: params.status])
    }


    def bulkRollbackShipments() {
        def shipmentIds = params.list("shipment.id")
        try {
            shipmentService.rollbackShipments(shipmentIds)
            flash.message = "Successfully rolled back last event for selected shipments"

        } catch (Exception e) {
            flash.message = "Error occurred while bulk receiving shipments: " + e.message
        }
        redirect(action: "list", params: [type: params.type, status: params.status])
    }

    def downloadLabels() {

        Shipment shipmentInstance = Shipment.get(params.id)
        response.contentType = 'application/pdf'
        response.setHeader('Content-disposition', 'attachment; filename="barcodes.pdf";')

        def shipmentItems = []

        final shipmentNumberBarcode = new ByteArrayOutputStream()
        barcodeService.renderImage(shipmentNumberBarcode, shipmentInstance?.shipmentNumber, 180, 50, BarcodeFormat.CODE_128)

        shipmentInstance?.shipmentItems?.each { shipmentItem ->
            final lotNumberBarcode = new ByteArrayOutputStream()
            barcodeService.renderImage(lotNumberBarcode, shipmentItem?.inventoryItem?.lotNumber, 180, 50, BarcodeFormat.CODE_128)
            final productCodeBarcode = new ByteArrayOutputStream()
            barcodeService.renderImage(productCodeBarcode, shipmentItem?.inventoryItem?.product?.productCode, 180, 50, BarcodeFormat.CODE_128)
            shipmentItems << [
                    productCode     : shipmentItem?.inventoryItem?.product?.productCode,
                    productName     : shipmentItem?.inventoryItem?.product?.displayName ?: shipmentItem?.inventoryItem?.product?.name,
                    lotNumber       : shipmentItem?.inventoryItem?.lotNumber,
                    lotNumberBytes  : lotNumberBarcode.toByteArray(),
                    productCodeBytes: productCodeBarcode.toByteArray()]
        }
        renderPdf(template: 'barcodeLabel', model: [shipmentInstance: shipmentInstance, shipmentItems: shipmentItems, shipmentNumberBytes: shipmentNumberBarcode.toByteArray()])
    }

    def showPutawayLocations() {
        def location = Location.get(session.warehouse.id)
        ReceiptItem receiptItem = ReceiptItem.load(params.id)

        Product productInstance = receiptItem.inventoryItem?.product // Product.load(params.id)
        def binLocations = inventoryService.getProductQuantityByBinLocation(location, productInstance)

        render template: "showPutawayLocations", model: [product: productInstance, binLocations: binLocations]
    }


    def splitReceiptItem() {
        ReceiptItem receiptItem1 = ReceiptItem.load(params.id)
        ReceiptItem receiptItem2 = new ReceiptItem(receiptItem1.properties)
        receiptItem2.quantityReceived = 0
        receiptItem1.receipt.addToReceiptItems(receiptItem2)

        Shipment shipment = receiptItem1?.receipt?.shipment
        flash.message = "${warehouse.message(code: 'default.updated.message', args: [warehouse.message(code: 'shipment.label', default: 'Shipment'), shipment.id])}"
        redirect(controller: "shipment", action: "receiveShipment", id: shipment?.id)
    }

    def deleteReceipt() {
        Receipt receiptInstance = Receipt.get(params.id)
        Shipment shipmentInstance = receiptInstance?.shipment
        if (shipmentInstance) {
            shipmentInstance.receipt = null // FIXME This seems absurd
        }
        receiptInstance.delete()
        redirect(controller: "shipment", action: "showDetails", id: shipmentInstance?.id)
    }

    def validateReceipt() {
        Receipt receiptInstance = Receipt.get(params.id)
        Shipment shipmentInstance = receiptInstance?.shipment
        if (shipmentService.validateReceipt(receiptInstance)) {
            flash.message = "Receipt is valid"
        }

        redirect(controller: "shipment", action: "receiveShipment", id: shipmentInstance?.id)
    }


    // React screen that replaced the legacy receiveShipment GSP (Phase 2,
    // Batch 22). Receiving goes through /api/shipments/$id/receipt.
    def receiveShipment(ReceiveShipmentCommand command) {
        def shipmentInstance = Shipment.get(params.id)
        if (!shipmentInstance) {
            flash.message = "${warehouse.message(code: 'default.not.found.message', args: [warehouse.message(code: 'shipment.label', default: 'Shipment'), params.id])}"
            redirect(action: "list", params: [type: 'incoming'])
            return
        }
        render(view: "/common/react")
    }


    /**
     *
     * @param shipmentInstance
     * @param userInstance
     * @param recipients
     */
    void triggerReceiveShipmentEmails(Shipment shipmentInstance, User userInstance, Set<Person> recipients) {
        if (!userInstance) userInstance = User.get(session.user.id)
        if (!shipmentInstance.hasErrors()) {
            if (!recipients) recipients = new HashSet<Person>()

            // add all admins to the email
            def adminList = userService.findUsersByRoleType(RoleType.ROLE_SHIPMENT_NOTIFICATION)
            adminList.each { adminUser ->
                recipients.add(adminUser)
            }

            // add the current user to the list of email recipients
            if (userInstance?.email) {
                recipients.add(userInstance)
            }

            // add all shipment recipients
            shipmentInstance?.recipients?.each { recipient ->
                recipients.add(recipient)
            }

            def shipmentName = "${shipmentInstance.name}"
            def shipmentType = "${format.metadata(obj: shipmentInstance.shipmentType)}"
            def shipmentDate = "${formatDate(date: shipmentInstance?.actualDeliveryDate, format: 'MMMMM dd yyyy')}"
            def subject = "${warehouse.message(code: 'shipment.hasBeenReceived.message', args: [shipmentType, shipmentName, shipmentDate])}"
            def body = g.render(template: "/email/shipmentReceived", model: [shipmentInstance: shipmentInstance, userInstance: userInstance])
            def toList = recipients?.collect { it?.email }?.unique()
            log.info("Mailing shipment emails to ${toList} with subject ${subject}")

            try {
                mailService.sendHtmlMail(subject, body.toString(), toList)
            } catch (Exception e) {
                log.error "Error triggering receive shipment emails " + e.message
            }
        }
    }

    def renderReceivedEmail() {
        def shipmentInstance = Shipment.get(params.id)
        def userInstance = User.get(session.user.id)
        render(template: "/email/shipmentReceived", model: [shipmentInstance: shipmentInstance, userInstance: userInstance])
    }

    def renderShippedEmail() {
        def shipmentInstance = Shipment.get(params.id)
        def userInstance = User.get(session.user.id)
        render(template: "/email/shipmentShipped", model: [shipmentInstance: shipmentInstance, userInstance: userInstance])
    }


    // React screen that replaced the legacy showPackingList GSP (Phase 2,
    // Batch 22). Data comes from GET /api/shipments/$id/packingList.
    def showPackingList() {
        def shipmentInstance = Shipment.get(params.id)
        if (!shipmentInstance) {
            flash.message = "${warehouse.message(code: 'default.not.found.message', args: [warehouse.message(code: 'shipment.label', default: 'Shipment'), params.id])}"
            redirect(action: "list", params: [type: params.type])
        } else {
            render(view: "/common/react")
        }
    }

    def downloadPackingList() {
        def shipmentInstance = Shipment.get(params.id)
        if (!shipmentInstance) {
            flash.message = "${warehouse.message(code: 'default.not.found.message', args: [warehouse.message(code: 'shipment.label', default: 'Shipment'), params.id])}"
            redirect(action: "list", params: [type: params.type])
        } else {
            String query = """
				select  
					container.name,  
					container.height, 
					container.width, 
					container.length, 
					container.volume_units, 
					container.weight, 
					container.weight_units,
					shipment_item.quantity,
					product.name,
					shipment_item.serial_number
				from shipment, container, shipment_item, product
				where shipment.id = container.shipment_id
				and shipment_item.container_id = container.id
				and shipment_item.product_id = product.id 
				and shipment.id = ${params.id}"""

            StringWriter sw = new StringWriter()
            CSVWriter writer = new CSVWriter(sw)
            Sql sql = new Sql(sessionFactory.currentSession.connection())

            String[] colArray = new String[6]
            colArray.putAt(0, "unit")
            colArray.putAt(1, "dimensions")
            colArray.putAt(2, "weight")
            colArray.putAt(3, "qty")
            colArray.putAt(4, "item")
            colArray.putAt(5, "serial number")
            writer.writeNext(colArray)
            sql.eachRow(query) { row ->

                def rowArray = new String[6]
                rowArray.putAt(0, row[0])
                rowArray.putAt(1, (row[1]) ? row[1] : "0" + "x" + (row[2]) ? row[2] : "0" + "x" + (row[3]) ? row[3] : "0" + " " + (row[4]) ? row[4] : "")
                rowArray.putAt(2, row[5] + " " + row[6])
                rowArray.putAt(3, row[7])
                rowArray.putAt(4, row[8])
                rowArray.putAt(5, row[9])
                writer.writeNext(rowArray)
            }
            log.info "results: " + sw.toString()
            response.setHeader("Content-disposition", "attachment; filename=\"PackingList.csv\"")
            render(contentType: "text/csv", text: sw.toString())
            sql.close()
        }
    }


    def editContents() {
        def shipmentInstance = Shipment.get(params.id)
        def containerInstance = Container.get(params?.container?.id)

        if (!shipmentInstance) {
            flash.message = "${warehouse.message(code: 'default.not.found.message', args: [warehouse.message(code: 'shipment.label', default: 'Shipment'), params.id])}"
            redirect(action: "list", params: [type: params.type])
        } else {

            if (!containerInstance && shipmentInstance?.containers) {
                containerInstance = shipmentInstance.containers.iterator().next()
            }
            [shipmentInstance: shipmentInstance, containerInstance: containerInstance]
        }
    }

    def copyContainer() {
        def container = Container.get(params.id)
        def shipment = Shipment.get(params.shipmentId)

        if (container && shipment) {
            def numCopies = (params.copies) ? Integer.parseInt(params.copies) : 1
            int index = (shipment?.containers) ? (shipment.containers.size()) : 1

            while (numCopies-- > 0) {
                def containerCopy = new Container(container.properties)
                containerCopy.id = null
                containerCopy.name = "" + (++index)
                containerCopy.containerType = container.containerType
                containerCopy.weight = container.weight
                containerCopy.shipmentItems = null
                containerCopy.save(flush: true)

                container.shipmentItems.each {
                    containerCopy.shipment.addToShipmentItems(shipmentItem).save(flush: true)
                }
                shipment.addToContainers(containerCopy).save(flush: true)
            }
            flash.message = "${warehouse.message(code: 'shipping.copiedContainerSuccessfully.message')}"
        } else {
            flash.message = "${warehouse.message(code: 'shipping.unableToCopyPackage.message')}"
        }

        redirect(action: 'showDetails', id: params.shipmentId)
    }


    def addDocument() {
        Shipment shipmentInstance = Shipment.get(params.id)
        if (!shipmentInstance) {
            flash.message = "${warehouse.message(code: 'default.not.found.message', args: [warehouse.message(code: 'shipment.label', default: 'Shipment'), params.id])}"
            redirect(action: "list")
            return
        }
        // Screen migrated to React (Phase 2, Batch 21). The addDocument GSP is
        // still rendered by editDocument for existing documents.
        render(view: "/common/react")
    }

    def addComment() {
        // Screen migrated to React (Phase 2, Batch 21)
        render(view: "/common/react")
    }

    def saveComment() {
        User recipient = User.get(params.recipientId)
        shipmentService.addShipmentComment(params.shipmentId, params.comment, session.user, recipient)
        flash.message = "${warehouse.message(code: 'shipping.addedCommentToShipment.message', args: [params.comment, params.shipmentId])}"
        redirect(action: 'showDetails', id: params.shipmentId)
    }


    def editItem() {
        def item = ShipmentItem.get(params.id)
        def container = item.getContainer()
        def shipmentId = container.getShipment().getId()
        if (item) {
            item.quantity = Integer.parseInt(params.quantity)
            item.save()
            flash.message = "${warehouse.message(code: 'shipping.addedCommentToShipment.message', args: [params.id, container.name])}"
            redirect(action: 'editContents', id: shipmentId)
        } else {
            flash.message = "${warehouse.message(code: 'shipping.couldNotEditItemFromContainer.message', args: [params.id])}"
            redirect(action: 'showDetails', id: shipmentId, params: [container.id, container.id])
        }
    }


    def deleteDocument() {
        def document = Document.get(params.id)
        def shipment = Shipment.get(params.shipmentId)
        if (shipment && document) {
            shipment.removeFromDocuments(document)
            document.delete()
            shipment.merge(flush: true)
            flash.message = "${warehouse.message(code: 'shipping.deletedDocumentFromShipment.message', args: [params.id])}"
        } else {
            flash.message = "${warehouse.message(code: 'shipping.couldNotRemoveDocumentFromShipment.message', args: [params.id])}"
        }
        redirect(controller: "stockMovement", action: "show", id: params.shipmentId)
    }

    def deleteEvent() {
        def event = Event.get(params.id)
        def shipment = Shipment.get(params.shipmentId)
        if (shipment && event) {   // not allowed to delete a "created" event
            shipmentEventManager.rollbackEvent(shipment, event)
            shipment.save()
            flash.message = "${warehouse.message(code: 'shipping.deletedEventFromShipment.message', args: [params.id])}"
        } else {
            flash.message = "${warehouse.message(code: 'shipping.couldNotRemoveEventFromShipment.message', args: [params.id])}"
        }
        redirect(action: 'showDetails', id: params.shipmentId)
    }

    def deleteContainer() {
        def container = Container.get(params.id)
        def shipment = Shipment.get(params.shipmentId)

        if (shipment && container) {
            container.delete()
            flash.message = "${warehouse.message(code: 'shipping.deletedContainerFromShipment.message', args: [params.id])}"
        } else {
            flash.message = "${warehouse.message(code: 'shipping.couldNotRemoveContainerFromShipment.message', args: [params.id])}"
        }

        redirect(action: 'showDetails', id: params.shipmentId)
    }

    def deleteItem() {
        def shipmentItem = ShipmentItem.get(params.id)
        def container = shipmentItem.getContainer()
        def shipmentId = container.getShipment().getId()
        if (item) {
            container.removeFromShipmentItems(shipmentItem)
            flash.message = "${warehouse.message(code: 'shipping.deletedShipmentItemFromContainer.message', args: [params.id, container.name])}"
            redirect(action: 'showDetails', id: shipmentId)
        } else {
            flash.message = "${warehouse.message(code: 'shipping.couldNotRemoveItemFromContainer.message', args: [params.id])}"
            redirect(action: 'showDetails', id: shipmentId)
        }
    }

    def deleteComment() {
        def comment = Comment.get(params.id)
        def shipment = Shipment.get(params.shipmentId)
        if (shipment && comment) {
            shipment.removeFromComments(comment).save(flush: true)
            comment.delete()
            flash.message = "${warehouse.message(code: 'shipping.deletedCommentFromShipment.message', args: [comment, params.shipmentId])}"
            redirect(action: 'showDetails', id: params.shipmentId)
        } else {
            flash.message = "${warehouse.message(code: 'shipping.couldNotRemoveCommentFromShipment.message', args: [params.id])}"
            redirect(action: 'showDetails', id: params.shipmentId)
        }
    }


    def editEvent() {
        def eventInstance = Event.get(params.id)

        if (!eventInstance) {
            flash.message = "${warehouse.message(code: 'default.not.found.message', args: [warehouse.message(code: 'shipmentEvent.label', default: 'ShipmentEvent'), params.id])}"
            redirect(action: "showDetails", id: params.shipmentId)
            return
        }

        // Screen migrated to React (Phase 2, Batch 21)
        render(view: "/common/react")
    }


    def addEvent() {
        def shipmentInstance = Shipment.get(params.id)

        if (!shipmentInstance) {
            flash.message = "${warehouse.message(code: 'default.not.found.message', args: [warehouse.message(code: 'shipmentEvent.label', default: 'ShipmentEvent'), params.id])}"
            redirect(action: "list")
            return
        }

        // Screen migrated to React (Phase 2, Batch 21)
        render(view: "/common/react")
    }

    def saveEvent() {
        def shipmentInstance = Shipment.get(params.shipmentId)
        def eventInstance = Event.get(params.eventId) ?: new Event()

        bindData(eventInstance, params)

        // check for errors
        if (eventInstance.hasErrors()) {
            flash.message = "${warehouse.message(code: 'shipping.unableToEditEvent.message', args: [format.metadata(obj: eventInstance?.eventType)])}"
            eventInstance?.errors.allErrors.each {
                log.error "${it}"
            }
            render(view: "editEvent", model: [shipmentInstance: shipmentInstance, eventInstance: eventInstance])
        }

        // save (or add) the event
        if (params.eventId) {
            eventInstance.save(flush: true)
        } else {
            shipmentEventManager.createEvent(shipmentInstance, eventInstance)
            shipmentInstance.save(flush: true)
        }

        // Redirect to the page from where the request came
        redirect(uri: request.getHeader('referer'))
    }

    def addShipmentItem() {
        log.info "parameters: " + params

        [shipmentInstance : Shipment.get(params.id),
         containerInstance: Container.get(params?.containerId),
         itemInstance     : new ShipmentItem()]
    }

    def addReferenceNumber() {
        def referenceNumber = new ReferenceNumber(params)
        def shipment = Shipment.get(params.shipmentId)
        shipment.addToReferenceNumbers(referenceNumber)
        flash.message = "${warehouse.message(code: 'shipping.addedReferenceNumber.message')}"
        redirect(action: 'show', id: params.shipmentId)
    }

    def form() {
        [shipments: Shipment.list()]
    }

    def view() {}

    def generateDocuments() {
        def shipmentInstance = Shipment.get(params.id)
        def shipmentWorkflow = shipmentService.getShipmentWorkflow(shipmentInstance)

        if (shipmentWorkflow.documentTemplate) {
            render(view: "templates/$shipmentWorkflow.documentTemplate", model: [shipmentInstance: shipmentInstance])
        } else {
            // just go back to the show details page if there is no templaet associated with this shipment workflow
            redirect(action: "showDetails", params: ['id': shipmentInstance.id])
        }
    }

    Person convertStringToPerson(String name) {
        def person = new Person()
        if (name) {
            def nameArray = name.split(" ")
            nameArray.each {
                if (it.contains("@")) {
                    person.email = it
                } else if (!person.firstName) {
                    person.firstName = it
                } else if (!person.lastName) {
                    person.lastName = it
                } else {
                    person.lastName += " " + it
                }
            }
        }
        return person
    }


    def addToShipment() {
        // Screen migrated to React (Phase 2, Batch 21). The inventory browser
        // posts the selected product ids here, so forward them to the React
        // route as query parameters.
        if ("POST".equalsIgnoreCase(request.getMethod())) {
            def productIds = params.list('product.id').collect { String.valueOf(it) }
            String query = productIds.collect { "product.id=${it.encodeAsURL()}" }.join("&")
            redirect(uri: "/shipment/addToShipment" + (query ? "?" + query : ""))
            return
        }
        render(view: "/common/react")
    }

    def exportPackingList() {
        log.info "Export packing list for shipment " + params
        Shipment shipment = Shipment.get(params.id)
        if (!shipment) {
            throw new Exception("Could not locate shipment with ID " + params.id)
        }

        OutputStream outputStream = null
        try {
            // Write the file to the response
            ByteArrayOutputStream baos = new ByteArrayOutputStream()
            response.contentType = "application/vnd.ms-excel"
            response.setHeader 'Content-disposition', "attachment; filename=\"Shipment ${shipment?.shipmentNumber} - Packing List.xls\""
            shipmentService.exportPackingList(params.id, baos)
            response.outputStream << baos.toByteArray()
            response.outputStream.flush()
            return

        } catch (IOException e) {
            flash.message = "Failed to export packing list due to the following error: " + e.message
        } catch (Exception e) {
            log.warn("Failed to export packing list due to the following error: " + e.message, e)
            flash.message = "Failed to export packing list due to the following error: " + e.message
        } finally {
            if (outputStream != null) {
                try {
                    outputStream.close()
                } catch (IOException e) {
                    log.error('IOException occurred while closing output stream', e)
                }
            }
        }
        redirect(controller: "shipment", action: "showDetails", id: params.id)
    }
}

class ReceiveShipmentCommand implements Serializable {

    String comments
    Person recipient
    Receipt receipt
    Shipment shipment
    Transaction transaction
    Boolean creditStockOnReceive = true
    Date actualDeliveryDate

    static constraints = {
        receipt(nullable: true)
        shipment(nullable: false, validator: { value, obj -> obj.shipment.hasShipped() && !obj.shipment.wasReceived() })
        transaction(nullable: true)
        recipient(nullable: false)
        comments(nullable: true)
        creditStockOnReceive(nullable: false)
        actualDeliveryDate(nullable: false)
    }

}
