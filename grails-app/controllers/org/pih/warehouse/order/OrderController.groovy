/**
 * Copyright (c) 2012 Partners In Health.  All rights reserved.
 * The use and distribution terms for this software are covered by the
 * Eclipse Public License 1.0 (http://opensource.org/licenses/eclipse-1.0.php)
 * which can be found in the file epl-v10.html at the root of this distribution.
 * By using this software in any fashion, you are agreeing to be bound by
 * the terms of this license.
 * You must not remove this notice, or any other, from this software.
 **/
package org.pih.warehouse.order

import fr.opensagres.xdocreport.converter.ConverterTypeTo
import grails.converters.JSON
import grails.validation.ValidationException
import grails.gorm.transactions.Transactional
import org.pih.warehouse.LocalizationUtil
import org.pih.warehouse.api.StockMovement
import org.pih.warehouse.core.ActivityCode
import org.pih.warehouse.core.BudgetCode
import org.pih.warehouse.core.Constants
import org.pih.warehouse.core.DocumentService
import org.pih.warehouse.core.DocumentTemplateService
import org.pih.warehouse.core.DocumentType
import org.pih.warehouse.core.Organization
import org.pih.warehouse.core.ValidationCode
import org.pih.warehouse.data.ProductSupplierService
import org.pih.warehouse.importer.CSVUtils
import org.pih.warehouse.inventory.StockMovementService
import org.pih.warehouse.product.Product
import org.pih.warehouse.product.ProductSupplier
import org.pih.warehouse.shipping.Shipment
import org.pih.warehouse.shipping.ShipmentItem
import org.pih.warehouse.core.Comment
import org.pih.warehouse.core.Document
import org.pih.warehouse.core.Location
import org.pih.warehouse.core.User
import org.springframework.web.multipart.MultipartFile
import java.math.RoundingMode

class OrderController {
    OrderService orderService
    StockMovementService stockMovementService
    ProductSupplierService productSupplierService
    DocumentTemplateService documentTemplateService
    DocumentService documentService

    static allowedMethods = [save: "POST", update: "POST"]

    def index() {
        redirect(action: "list", params: params)
    }

    def list() {
        render(view: "/common/react", params: params)
    }

    def listOrderItems() {
        render(view: "/common/react", params: params)
    }

    def create() {
        redirect(controller: 'purchaseOrder', action: 'index')
    }

    def show() {
        render(view: "/common/react", params: params)
    }

    def edit() {
        def orderInstance = Order.get(params.id)
        if (!orderInstance) {
            flash.message = "${warehouse.message(code: 'default.not.found.message', args: [warehouse.message(code: 'order.label', default: 'Order'), params.id])}"
            redirect(action: "list")
        } else {
            return [orderInstance: orderInstance]
        }
    }

    def placeOrder() {
        log.info "Issue order " + params
        def orderInstance = orderService.placeOrder(params.id, session.user.id)
        if (orderInstance) {
            if (orderInstance.hasErrors()) {
                render(view: 'show', model: [orderInstance: orderInstance])
            } else {
                flash.message = "${warehouse.message(code: 'order.orderHasBeenPlacedWithVendor.message', args: [orderInstance?.orderNumber, orderInstance?.origin?.name])}"
                redirect(action: 'show', id: orderInstance.id)
            }
        } else {
            flash.message = "${warehouse.message(code: 'order.notFound.message', args: [params.id], default: 'Order {0} was not found.')}"
            redirect(action: "list")
        }
    }

    def remove() {
        def orderInstance = Order.get(params.id)
        if (orderInstance) {
            if (orderInstance.hasPrepaymentInvoice) {
                flash.message = "${warehouse.message(code: 'order.errors.deletePrepaid.message')}"
                redirect(action: "show", id: orderInstance?.id)
                return
            }

            if (orderInstance.status == OrderStatus.PENDING) {
                try {
                    orderService.deleteOrder(orderInstance)
                    flash.message = "${warehouse.message(code: 'default.deleted.message', args: [warehouse.message(code: 'order.label', default: 'Order'), orderInstance.orderNumber])}"
                } catch (org.springframework.dao.DataIntegrityViolationException e) {
                    flash.message = "${warehouse.message(code: 'default.not.deleted.message', args: [warehouse.message(code: 'order.label', default: 'Order'), orderInstance.orderNumber])}"
                }
            } else {
                flash.message = "${warehouse.message(code: 'default.not.deleted.message', args: [warehouse.message(code: 'order.label', default: 'Order'), orderInstance.orderNumber])}"
            }
        } else {
            flash.message = "${warehouse.message(code: 'default.not.found.message', args: [warehouse.message(code: 'order.label', default: 'Order'), params.id])}"
        }

        if (orderInstance.orderType?.code == OrderTypeCode.PURCHASE_ORDER.name()) {
            redirect(controller: "purchaseOrder", action: "list")
        } else if (orderInstance.orderType.code == Constants.PUTAWAY_ORDER) {
            redirect(controller: "order", action: "list", params: [orderType: Constants.PUTAWAY_ORDER, status: OrderStatus.PENDING])
        } else {
            redirect(controller: "order", action: "list")
        }
    }

    def addAdjustment() {
        render(view: "/common/react", params: params)
    }

    def editAdjustment() {
        render(view: "/common/react", params: params)
    }

    @Transactional
    def saveAdjustment() {
        def orderInstance = Order.get(params?.order?.id)
        def currentLocation = Location.get(session?.warehouse.id)
        if (orderInstance) {
            if (currentLocation.isAccountingRequired()) {
                OrderAdjustmentType orderAdjustmentType = OrderAdjustmentType.get(params.orderAdjustmentType.id)
                if (!orderAdjustmentType.glAccount) {
                    render(status: 500, text: "${warehouse.message(code: 'orderAdjustment.missingGlAccount.label')}")
                    return
                }
            }
            def orderAdjustment = OrderAdjustment.get(params?.id)
            if (params.budgetCode) {
                params.budgetCode = BudgetCode.get(params.budgetCode)
            }
            if (orderAdjustment) {
                if (orderAdjustment.hasRegularInvoice) {
                    throw new UnsupportedOperationException("${warehouse.message(code: 'errors.noPermissions.label')}")
                }
                if (orderAdjustment.orderItem && !params.orderItem.id) {
                    orderAdjustment.orderItem.removeFromOrderAdjustments(orderAdjustment)
                }
                orderAdjustment.properties = params
                if (orderAdjustment.save(flush: true)) {
                    flash.message = "${warehouse.message(code: 'default.updated.message', args: [warehouse.message(code: 'orderAdjustment.label', default: 'Order Adjustment'), orderAdjustment.id])}"
                    redirect(controller:"purchaseOrder", action: "addItems", id: orderInstance.id, params:['skipTo': 'adjustments'])
                } else {
                    render(view: "editAdjustment", model: [orderInstance: orderInstance, orderAdjustment: orderAdjustment])
                }
            } else {
                orderAdjustment = new OrderAdjustment(params)
                orderInstance.addToOrderAdjustments(orderAdjustment)
                if (orderInstance.save(flush: true)) {
                    flash.message = "${warehouse.message(code: 'default.updated.message', args: [warehouse.message(code: 'order.label', default: 'Order'), orderInstance.id])}"
                    redirect(controller:"purchaseOrder", action: "addItems", id: orderInstance.id, params:['skipTo': 'adjustments'])
                } else {
                    render(view: "editAdjustment", model: [orderInstance: orderInstance, orderAdjustment: orderAdjustment])
                }
            }
        } else {
            flash.message = "${warehouse.message(code: 'default.not.found.message', args: [warehouse.message(code: 'order.label', default: 'Order'), params.id])}"
            redirect(action: "list")
        }

    }

    def deleteAdjustment() {
        User user = User.get(session?.user?.id)

        OrderAdjustment orderAdjustment = OrderAdjustment.get(params?.id)
        if (!orderAdjustment) {
            flash.message = "${warehouse.message(code: 'default.not.found.message', args: [warehouse.message(code: 'orderAdjustment.label', default: 'Order Adjustment'), params.id])}"
            redirect(action: "show", id: params.order.id)
        }

        orderService.deleteAdjustment(orderAdjustment, user)

        flash.message = "${warehouse.message(code: 'default.updated.message', args: [warehouse.message(code: 'order.label', default: 'Order'), params.order.id])}"
        redirect(controller:"purchaseOrder", action: "addItems", id: params.order.id, params:['skipTo': 'adjustments'])

    }



    def addComment() {
        render(view: "/common/react", params: params)
    }

    def editComment() {
        def orderInstance = Order.get(params?.order?.id)
        if (!orderInstance) {
            flash.message = "${warehouse.message(code: 'default.not.found.message', args: [warehouse.message(code: 'order.label', default: 'Order'), params.id])}"
            redirect(action: "list")
        } else {
            def commentInstance = Comment.get(params?.id)
            if (!commentInstance) {
                flash.message = "${warehouse.message(code: 'default.not.found.message', args: [warehouse.message(code: 'comment.label', default: 'Comment'), commentInstance.id])}"
                redirect(action: "show", id: orderInstance?.id)
            }
            render(view: "addComment", model: [orderInstance: orderInstance, commentInstance: commentInstance])
        }
    }

    @Transactional
    def deleteComment() {
        def orderInstance = Order.get(params.order.id)
        if (!orderInstance) {
            flash.message = "${warehouse.message(code: 'default.not.found.message', args: [warehouse.message(code: 'order.label', default: 'Order'), params.order.id])}"
            redirect(action: "list")
        } else {
            def commentInstance = Comment.get(params?.id)
            if (!commentInstance) {
                flash.message = "${warehouse.message(code: 'default.not.found.message', args: [warehouse.message(code: 'comment.label', default: 'Comment'), params.id])}"
                redirect(action: "show", id: orderInstance?.id)
            } else {
                orderInstance.removeFromComments(commentInstance)
                if (!orderInstance.hasErrors() && orderInstance.save(flush: true)) {
                    flash.message = "${warehouse.message(code: 'default.updated.message', args: [warehouse.message(code: 'order.label', default: 'Order'), orderInstance.id])}"
                    redirect(action: "show", id: orderInstance.id)
                } else {
                    render(view: "show", model: [orderInstance: orderInstance])
                }
            }
        }
    }

    def addDocument() {
        render(view: "/common/react", params: params)
    }

    def editDocument() {
        Order orderInstance = Order.get(params?.order?.id)
        List<DocumentType> documentTypes = documentService.getNonTemplateDocumentTypes()

        if (!orderInstance) {
            flash.message = "${warehouse.message(code: 'default.not.found.message', args: [warehouse.message(code: 'order.label', default: 'Order'), params.id])}"
            redirect(action: "list")
        } else {
            Document documentInstance = Document.get(params?.id)
            if (!documentInstance) {
                flash.message = "${warehouse.message(code: 'default.not.found.message', args: [warehouse.message(code: 'document.label', default: 'Document'), documentInstance.id])}"
                redirect(action: "show", id: orderInstance?.id)
            }
            render(view: "addDocument", model: [
                    orderInstance: orderInstance,
                    documentInstance: documentInstance,
                    documentTypes: documentTypes
            ])
        }
    }

    @Transactional
    def deleteDocument() {
        def orderInstance = Order.get(params.order.id)
        if (!orderInstance) {
            flash.message = "${warehouse.message(code: 'default.not.found.message', args: [warehouse.message(code: 'order.label', default: 'Order'), params.order.id])}"
            redirect(action: "list")
        } else {
            def documentInstance = Document.get(params?.id)
            if (!documentInstance) {
                flash.message = "${warehouse.message(code: 'default.not.found.message', args: [warehouse.message(code: 'comment.label', default: 'Comment'), params.id])}"
                redirect(action: "show", id: orderInstance?.id)
            } else {
                orderInstance.removeFromDocuments(documentInstance)
                if (!orderInstance.hasErrors() && orderInstance.save(flush: true)) {
                    flash.message = "${warehouse.message(code: 'default.updated.message', args: [warehouse.message(code: 'order.label', default: 'Order'), orderInstance.id])}"
                    redirect(action: "show", id: orderInstance.id)
                } else {
                    render(view: "show", model: [orderInstance: orderInstance])
                }
            }
        }
    }

    def receive() {
        def orderCommand = orderService.getOrder(params.id, session.user.id)
        if (!orderCommand.order) {
            flash.message = "${warehouse.message(code: 'default.not.found.message', args: [warehouse.message(code: 'order.label', default: 'Order'), params.id])}"
            redirect(action: "list")
        } else {
            return [orderCommand: orderCommand]
        }
    }

    def fulfill() {
        def orderInstance = Order.get(params.id)
        if (!orderInstance) {
            flash.message = "${warehouse.message(code: 'default.not.found.message', args: [warehouse.message(code: 'order.label', default: 'Order'), params.id])}"
            redirect(action: "list")
        } else {
            return [orderInstance: orderInstance]
        }
    }

    def download() {
        def orderInstance = Order.get(params.id)
        if (!orderInstance) {
            flash.message = "${warehouse.message(code: 'default.not.found.message', args: [warehouse.message(code: 'order.label', default: 'Order'), params.id])}"
            redirect(action: "list")

        } else {
            def date = new Date()
            response.setHeader("Content-disposition", "attachment; filename=\"${orderInstance?.orderNumber?.encodeAsHTML()}-${date.format("MM-dd-yyyy")}.csv\"")
            response.contentType = "text/csv"

            def csv = CSVUtils.getCSVPrinter()
            csv.printRecord("PO Number", orderInstance?.orderNumber)
            csv.printRecord("Description", orderInstance?.name)
            csv.printRecord("Vendor", orderInstance?.origin.name)
            csv.printRecord("Ship to", orderInstance?.destination?.name)
            csv.printRecord("Ordered by", "${orderInstance?.orderedBy?.name} ${orderInstance?.orderedBy?.email}")
            csv.println()  // print a newline between text (above) and column headers (immediately following)
            csv.printRecord(
                warehouse.message(code: 'product.productCode.label'),
                warehouse.message(code: 'product.name.label'),
                warehouse.message(code: 'product.supplierCode.label'),
                warehouse.message(code: 'product.manufacturerCode.label'),
                warehouse.message(code: 'orderItem.quantity.label'),
                warehouse.message(code: 'product.unitOfMeasure.label'),
                warehouse.message(code: 'orderItem.unitPrice.label'),
                warehouse.message(code: 'orderItem.totalPrice.label'),
                warehouse.message(code: 'orderItem.budgetCode.label')
            )

            def totalPrice = 0.0

            String lastCurrencyCode = null
            orderInstance?.listOrderItems()?.each { orderItem ->
                totalPrice += orderItem.totalPrice() ?: 0
                if (orderItem?.currencyCode != null) {
                    lastCurrencyCode = orderItem?.currencyCode
                }

                csv.printRecord(
                    orderItem?.product?.productCode,
                    orderItem?.product?.name,
                    orderItem?.productSupplier?.supplierCode,
                    orderItem?.productSupplier?.manufacturerCode,
                    CSVUtils.formatInteger(number: orderItem?.quantity),
                    CSVUtils.formatUnitOfMeasure(orderItem?.quantityUom?.code, orderItem?.quantityPerUom),
                    CSVUtils.formatCurrency(number: orderItem?.unitPrice, currencyCode: orderItem?.currencyCode, isUnitPrice: true),
                    CSVUtils.formatCurrency(number: orderItem?.totalPrice(), currencyCode: orderItem?.currencyCode),
                    orderItem?.budgetCode?.code
                )
            }

            csv.printRecord(null, null, null, null, null, null, null, CSVUtils.formatCurrency(number: totalPrice, currencyCode: lastCurrencyCode), null)
            render(contentType: "text/csv", text: csv.out.toString())
            return
        }
    }

    def orderItemFormDialog() {
        OrderItem orderItem = OrderItem.get(params.id)
        def currentLocation = Location.get(session.warehouse.id)
        def isAccountingRequired = currentLocation?.isAccountingRequired()
        boolean canEditOrder = orderService.isOrderEditable(orderItem.order, session.user)
        if (!canEditOrder) {
            throw new UnsupportedOperationException("${warehouse.message(code: 'errors.noPermissions.label')}")
        }
        render(template: "orderItemFormDialog",
                model: [orderItem: orderItem, canEdit: canEditOrder, isAccountingRequired: isAccountingRequired, regularInvoices: orderItem.regularInvoices])
    }

    def productSourceFormDialog() {
        Product product = Product.get(params.productId)
        Organization supplier = Organization.get(params.supplierId)
        render(template: "productSourceFormDialog", model: [product: product, supplier: supplier])
    }

    def createProductSource() {
        Organization supplier = Organization.get(params.supplier.id)
        ProductSupplier productSupplier = ProductSupplier.findByCodeAndSupplier(params.sourceCode, supplier)
        if (params.sourceCode && productSupplier) {
            render(status: 500, text: "Product source with given code for your supplier already exists")
            return
        }

        try {
            productSupplier = productSupplierService.createProductSupplierWithoutPackage(params)
        } catch (Exception e) {
            log.error("Error " + e.message, e)
            render(status: 500, text: "Error creating product source")
        }
        render (status: 200, text: productSupplier.id)
    }

    def removeOrderItem() {
        User user = User.get(session?.user?.id)

        OrderItem orderItem = OrderItem.get(params.id)
        if (!orderItem) {
            render (status: 404, text: "Unable to locate order item")
        }

        orderService.removeOrderItem(orderItem, user)

        render (status: 200, text: "Successfully deleted order item")
    }

    @Transactional
    def saveOrderItem() {
        Order order = Order.get(params.order.id)
        OrderItem orderItem = OrderItem.get(params.orderItem.id)
        ProductSupplier productSupplier = null
        ValidationCode validationCode = params.validationCode ? params.validationCode as ValidationCode : null
        Location currentLocation = Location.get(session?.warehouse.id)
        if (validationCode == ValidationCode.BLOCK) {
            render(status: 500, text: "${warehouse.message(code: 'orderItem.blockedSupplier.label')}")
            return
        }
        if (params.productSupplier == "Create New") {
            Organization supplier = Organization.get(params.supplier.id)
            productSupplier = ProductSupplier.findByCodeAndSupplier(params.sourceCode, supplier)
            if (params.sourceCode && productSupplier) {
                render(status: 500, text: "Product source with given code for your supplier already exists")
                return
            }
        }
        if (params.productSupplier || params.supplierCode) {
            productSupplier = productSupplierService.getOrCreateNew(params, params.productSupplier == "Create New")
        }
        params.remove("productSupplier")
        if (params.budgetCode) {
            params.budgetCode = BudgetCode.get(params.budgetCode)
        }
        if (currentLocation.isAccountingRequired()) {
            Product product = Product.get(params.product.id)
            if (!product.glAccount) {
                render(status: 500, text: "${warehouse.message(code: 'orderItem.missingGlAccount.label')}")
                return
            }
        }
        if (!orderItem) {
            orderItem = new OrderItem(params)
            if (order.status >= OrderStatus.PLACED && orderItem.estimatedReadyDate) {
                orderItem.actualReadyDate = orderItem.estimatedReadyDate
            }
            order.addToOrderItems(orderItem)
        }
        else {
            if (!orderService.isOrderEditable(orderItem.order, session.user)) {
                throw new UnsupportedOperationException("${warehouse.message(code: 'errors.noPermissions.label')}")
            }
            if (params.quantity && orderItem.quantity != (params.quantity as Integer)) {
                // if existing item's quantity is edited we have to trigger the order summary refresh
                orderItem.disableRefresh = false
            }
            orderItem.properties = params
            orderItem.refreshPendingShipmentItemRecipients()
        }

        if (productSupplier != null) {
            orderItem.productSupplier = productSupplier
        }

        if (!order.save(flush:true)) {
            throw new ValidationException("Order is invalid", order.errors)
        }

        try {
            if (order.status >= OrderStatus.PLACED) {
                orderService.updateProductPackage(orderItem)
                orderService.updateProductUnitPrice(orderItem)
            }
        } catch (Exception e) {
            log.error("Error " + e.message, e)
            render(status: 500, text: "Not saved")
            return
        }

        render (status: 200, text: "Successfully added order item")
    }

    def getOrderItems() {
        def orderInstance = Order.get(params.id)
        boolean canEditOrder = orderService.isOrderEditable(orderInstance, session.user)
        def orderItems = orderInstance.orderItems.collect {
            [
                    id: it.id,
                    product: it.product,
                    quantity: it.quantity,
                    quantityUom: it?.quantityUom?.code,
                    quantityPerUom: it?.quantityPerUom,
                    unitOfMeasure: it?.unitOfMeasure,
                    totalQuantity: (it?.quantity?:1) * (it?.quantityPerUom?:1),
                    productPackage: it?.productPackage,
                    currencyCode: it?.order?.currencyCode,
                    unitPrice: CSVUtils.formatCurrency(number: it.unitPrice, currencyCode: it.currencyCode, isUnitPrice: true),
                    totalPrice: CSVUtils.formatCurrency(number: it.totalPrice(), currencyCode: it.currencyCode),
                    estimatedReadyDate: g.formatDate(date: it.estimatedReadyDate, format: Constants.DEFAULT_DATE_FORMAT),
                    actualReadyDate: g.formatDate(date: it.actualReadyDate, format: Constants.DEFAULT_DATE_FORMAT),
                    productSupplier: it.productSupplier,
                    recipient: it.recipient,
                    isOrderPending: it?.order?.status == OrderStatus.PENDING,
                    dateCreated: it.dateCreated,
                    canEdit: canEditOrder,
                    manufacturerName: it.productSupplier?.manufacturer?.name,
                    text: it.product?.displayNameOrDefaultName,
                    orderItemStatusCode: it.orderItemStatusCode.name(),
                    hasShipmentAssociated: it.hasShipmentAssociated(),
                    budgetCode: it.budgetCode,
                    orderIndex: it.orderIndex
            ]
        }
        orderItems = orderItems.sort { a,b -> a.dateCreated <=> b.dateCreated ?: a.orderIndex <=> b.orderIndex }
        render orderItems as JSON
    }


    def downloadOrderItems() {
        def orderInstance = Order.get(params.id)
        if (!orderInstance) {
            flash.message = "${warehouse.message(code: 'default.not.found.message', args: [warehouse.message(code: 'order.label', default: 'Order'), params.id])}"
            redirect(action: "list")
        } else {
            def date = new Date()
            response.setHeader("Content-disposition", "attachment; filename=\"${orderInstance.orderNumber}-${date.format("MM-dd-yyyy")}.csv\"")
            response.contentType = "text/csv"
            Locale currentLocale = LocalizationUtil.currentLocale
            String dateFormat = LocalizationUtil.getLocalizedOrderImportDateFormat(currentLocale)
            def csv = CSVUtils.getCSVPrinter()
            csv.printRecord(
                    warehouse.message(code: 'orderItem.id.label'),
                    warehouse.message(code: 'product.productCode.label'),
                    warehouse.message(code: 'product.name.label'),
                    warehouse.message(code: 'product.sourceCode.label'),
                    warehouse.message(code: 'product.sourceName.label'),
                    warehouse.message(code: 'product.supplierCode.label'),
                    warehouse.message(code: 'product.manufacturer.label'),
                    warehouse.message(code: 'product.manufacturerCode.label'),
                    warehouse.message(code: 'default.quantity.label'),
                    warehouse.message(code: 'default.unitOfMeasure.label'),
                    warehouse.message(code: 'default.cost.label'),
                    warehouse.message(code: 'orderItem.totalCost.label'),
                    warehouse.message(code: 'order.recipient.label'),
                    "${warehouse.message(code: 'orderItem.quotedShipDate.label')} (${dateFormat})",
                    "${warehouse.message(code: 'orderItem.currentExpectedShipDate.label')} (${dateFormat})",
                    warehouse.message(code: 'orderItem.budgetCode.label')
            )

            orderInstance?.listOrderItems()?.each { orderItem ->
                csv.printRecord(
                        orderItem?.id,
                        orderItem?.product?.productCode,
                        orderItem?.product?.displayNameWithLocaleCode,
                        orderItem?.productSupplier?.code,
                        orderItem?.productSupplier?.name,
                        orderItem?.productSupplier?.supplierCode,
                        orderItem?.productSupplier?.manufacturer?.name,
                        orderItem?.productSupplier?.manufacturerCode,
                        CSVUtils.formatInteger(number: orderItem?.quantity),
                        orderItem?.unitOfMeasure,
                        CSVUtils.formatCurrency(number: orderItem?.unitPrice, currencyCode: orderItem?.currencyCode, isUnitPrice: true),
                        CSVUtils.formatCurrency(number: orderItem?.totalPrice(), currencyCode: orderItem?.currencyCode),
                        orderItem?.recipient?.name,
                        orderItem?.estimatedReadyDate?.format(dateFormat),
                        orderItem?.actualReadyDate?.format(dateFormat),
                        orderItem?.budgetCode?.code
                )
            }
            render(contentType: "text/csv", text: csv.out.toString())
        }
    }

    def importOrderItems() {
        def orderInstance = Order.get(params.id)
        Location currentLocation = Location.get(session?.warehouse?.id)
        if (!orderInstance) {
            flash.message = "${warehouse.message(code: 'default.not.found.message', args: [warehouse.message(code: 'order.label', default: 'Order'), params.id])}"
            redirect(action: "list")
        } else {

            try {
                MultipartFile multipartFile = request.getFile('fileContents')
                if (multipartFile.empty) {
                    flash.message = "File cannot be empty. Please select a packing list to import."
                    redirect(action: "show", id: params.id)
                    return
                }
                List lineItems = orderService.parseOrderItems(multipartFile.inputStream.text)
                log.info "Line items: " + lineItems

                if (orderService.importOrderItems(params.id, params.supplierId, lineItems, currentLocation, session.user)) {
                    flash.message = "Successfully imported ${lineItems?.size()} order line items. "
                } else {
                    flash.message = "Failed to import packing list items due to an unknown error."
                }
            } catch (Exception e) {
                log.warn("Failed to import order items list due to the following error: " + e.message, e)
                render (status: 500, text: "Failed to import order items list due to the following error: " + e.message)
                return
            }
        }
        render (status: 200, text: "Successfully added order items")
    }


    def upload() {
        def orderInstance = Order.get(params.id)
        if (!orderInstance) {
            flash.message = "${warehouse.message(code: 'default.not.found.message', args: [warehouse.message(code: 'order.label', default: 'Order'), params.id])}"
            redirect(action: "list")
        } else {
            return [orderInstance: orderInstance]
        }
    }


    def print() {
        def orderInstance = Order.get(params.id)
        if (!orderInstance) {
            flash.message = "${warehouse.message(code: 'default.not.found.message', args: [warehouse.message(code: 'order.label', default: 'Order'), params.id])}"
            redirect(action: "list")
        } else {
            Document documentTemplate = Document.findByName("${controllerName}:${actionName}")
            if (documentTemplate) {
                render documentTemplateService.renderGroovyServerPageDocumentTemplate(documentTemplate, [orderInstance:orderInstance])
                return
            }
            render(view: "/common/react", params: params)
        }
    }

    def render() {
        def orderInstance = Order.get(params.id)
        if (!orderInstance) {
            flash.message = "${warehouse.message(code: 'default.not.found.message', args: [warehouse.message(code: 'order.label', default: 'Order'), params.id])}"
            redirect(action: "list")
        } else {
            if (!params?.documentTemplate?.id) {
                throw new IllegalArgumentException("documentTemplate.id is required")
            }
            Document documentTemplate = Document.get(params?.documentTemplate?.id)
            if (documentTemplate) {

                try {
                    ByteArrayOutputStream outputStream = new ByteArrayOutputStream()
                    ConverterTypeTo targetDocumentType = params.format ? params.format as ConverterTypeTo : null
                    documentTemplateService.renderOrderDocumentTemplate(documentTemplate,
                            orderInstance, targetDocumentType, outputStream)

                    // Set response headers appropriately
                    if (targetDocumentType) {

                        // Use the appropriate content type and extension of the conversion type
                        // (except XHTML, just render as HTML response)
                        if (targetDocumentType != ConverterTypeTo.XHTML) {
                            response.setHeader("Content-disposition",
                                    "attachment; filename=\"${documentTemplate.name}\"-${orderInstance.orderNumber}.${targetDocumentType.extension}");
                            response.setContentType(targetDocumentType.mimeType)
                        }
                    }
                    else {

                        // Otherwise write processed document to response using the original
                        // document template's extension and content type
                        response.setHeader("Content-disposition",
                                "attachment; filename=\"${documentTemplate.name}\"-${orderInstance.orderNumber}.${documentTemplate.extension}");
                        response.setContentType(documentTemplate.contentType)
                    }
                    outputStream.writeTo(response.outputStream)
                    return
                } catch (Exception e) {
                    log.error("Unable to render document template ${documentTemplate.name} for order ${orderInstance?.id}", e)
                    throw e;
                }
            }
        }
        [orderInstance:orderInstance]
    }

    def rollbackOrderStatus() {

        def orderInstance = Order.get(params.id)
        if (!orderInstance) {
            flash.message = "${warehouse.message(code: 'default.not.found.message', args: [warehouse.message(code: 'order.label', default: 'Order'), params.id])}"
            redirect(action: "list")
        } else {
            orderService.rollbackOrderStatus(params.id)

        }
        redirect(action: "show", id: params.id)

    }

    def exportTemplate() {
        Order order = Order.get(params.order.id)
        def orderItems = OrderItem.findAllByOrder(order)
        if (orderItems) {
            String csv = orderService.exportOrderItems(orderItems)
            response.setHeader("Content-disposition",
                    "attachment; filename=\"PO - ${order.id} - shipment import template.csv\"")
            response.contentType = "text/csv"
            render(contentType: "text/csv", text: csv)
        } else {
            render(text: 'No order items found', status: 404)
        }
    }

    @Transactional
    def cancelOrderItem() {
        OrderItem orderItem = OrderItem.get(params.id)
        def canEdit = orderService.isOrderEditable(orderItem.order, session.user)
        if (canEdit) {
            orderItem.orderItemStatusCode = OrderItemStatusCode.CANCELED
            orderItem.disableRefresh = false
            render (status: 200, text: "Item canceled successfully")
        } else {
            throw new UnsupportedOperationException("${warehouse.message(code: 'errors.noPermissions.label')}")
        }
    }

    @Transactional
    def restoreOrderItem() {
        OrderItem orderItem = OrderItem.get(params.id)
        def canEdit = orderService.isOrderEditable(orderItem.order, session.user)
        if (canEdit) {
            orderItem.orderItemStatusCode = OrderItemStatusCode.PENDING
            orderItem.disableRefresh = false
            render(status: 200, text: "Item restored successfully")
        } else {
            throw new UnsupportedOperationException("${warehouse.message(code: 'errors.noPermissions.label')}")
        }
    }

    def getTotalPrice() {
        Order order = Order.get(params.id)
        render order.total
    }

    @Transactional
    def cancelOrderAdjustment() {
        OrderAdjustment orderAdjustment = OrderAdjustment.get(params.id)
        User user = User.get(session?.user?.id)
        def canEdit = orderService.canManageAdjustments(orderAdjustment.order, user) && !orderAdjustment.hasRegularInvoice
        if(canEdit) {
            orderAdjustment.canceled = true
            orderAdjustment.disableRefresh = false
            render (status: 200, text: "Adjustment canceled successfully")
        } else {
            throw new UnsupportedOperationException("${warehouse.message(code: 'errors.noPermissions.label')}")
        }
    }

    @Transactional
    def restoreOrderAdjustment() {
        OrderAdjustment orderAdjustment = OrderAdjustment.get(params.id)
        User user = User.get(session?.user?.id)
        def canEdit = orderService.canManageAdjustments(orderAdjustment.order, user)
        if(canEdit) {
            orderAdjustment.canceled = false
            orderAdjustment.disableRefresh = false
            render(status: 200, text: "Adjustment restored successfully")
        } else {
            throw new UnsupportedOperationException("${warehouse.message(code: 'errors.noPermissions.label')}")
        }
    }

    def getOrderAdjustments() {
        def orderInstance = Order.get(params.id)
        def orderAdjustments = orderInstance.orderAdjustments.sort { it.dateCreated }.collect {

            [
                    id: it.id,
                    type: it.orderAdjustmentType,
                    description: it.description,
                    orderItem: it.orderItem,
                    percentage: it.percentage,
                    comments: it.comments,
                    budgetCode: it.budgetCode,
                    amount: it.amount ? it.amount : it.percentage ? it.orderItem ? it.orderItem.totalAdjustments : it.totalAdjustments : 0,
                    isCanceled: it.canceled,
                    order: it.order,
            ]
        }
        render orderAdjustments as JSON
    }

    def getTotalAdjustments() {
        Order order = Order.get(params.id)
        render order.totalAdjustments
    }

    def createCombinedShipment() {
        def orderInstance = Order.get(params.orderId)
        Location currentLocation = Location.get(session.warehouse.id)

        if (!(orderInstance.destination.equals(currentLocation) || currentLocation.supports(ActivityCode.ENABLE_CENTRAL_PURCHASING))) {
            flash.message = "${warehouse.message(code:'order.cantShipFromDifferentLocation.label')}"
            redirect(controller: 'order', action: "show", id: orderInstance.id)
            return
        }
        if (!orderInstance.orderItems.find {it.quantityRemainingToShip != 0 && it.orderItemStatusCode != OrderItemStatusCode.CANCELED }) {
            flash.message = "${warehouse.message(code:'purchaseOrder.noItemsToShip.label')}"
            redirect(controller: 'order', action: "show", id: orderInstance.id, params: ['tab': 4])
            return
        }
        StockMovement stockMovement = StockMovement.createFromOrder(orderInstance);
        stockMovement = stockMovementService.createShipmentBasedStockMovement(stockMovement)
        redirect(controller: 'stockMovement', action: "createCombinedShipments", params: [direction: 'INBOUND', id: stockMovement.id])
    }

    def orderSummary() {
        render(template: "orderSummary", model: orderService.getOrderSummary(params.id))
    }

    def itemStatus() {
        render(template: "itemStatus", model: orderService.getOrderItemStatus(params.id))
    }

    def itemDetails() {
        Order order = Order.get(params.id)
        render(template: "itemDetails", model: [orderInstance: order])
    }

    def orderAdjustments() {
        Order order = Order.get(params.id)
        render(template: "orderAdjustments", model: [orderInstance: order])
    }

    def orderShipments() {
        Order order = Order.get(params.id)
        render(template: "orderShipments", model: [orderInstance: order])
    }

    def orderInvoices() {
        Order order = Order.get(params.id)
        render(template: "orderInvoices", model: [orderInstance: order])
    }

    def orderDocuments() {
        Order order = Order.get(params.id)
        render(template: "orderDocuments", model: [orderInstance: order])
    }

    def orderComments() {
        Order order = Order.get(params.id)
        render(template: "orderComments", model: [orderInstance: order])
    }

    // For testing order derived status feature. orderSummaryList action gets the data from extended SQL view
    def orderSummaryList() {
        render(view: "/common/react", params: params)
    }

    // For testing order item derived status feature. orderItemSummary action gets the data from extended SQL view
    def orderItemSummary() {
        render(view: "/common/react", params: params)
    }

    // For testing order item derived status feature. orderItemDetails action gets the data from simplified SQL view
    def orderItemDetails() {
        render(view: "/common/react", params: params)
    }
}
