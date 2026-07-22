package org.pih.warehouse.api

import grails.converters.JSON
import grails.gorm.transactions.Transactional
import grails.validation.ValidationException
import org.hibernate.ObjectNotFoundException
import org.pih.warehouse.core.EntityTypeCode
import org.pih.warehouse.core.UnitOfMeasureClass
import org.pih.warehouse.product.Attribute
import org.pih.warehouse.product.AttributeService

@Transactional
class AttributeApiController {

    AttributeService attributeService

    def list() {
        // Search mode (used by the React attribute list screen): includes
        // inactive attributes and supports filtering by name, like the legacy
        // AttributeController.list did.
        if (params.q != null || params.boolean("includeInactive")) {
            List<Attribute> attributes = attributeService.searchAttributes(params.q,
                    [sort: params.sort, order: params.order])
            render([data: attributes.collect { toJson(it) }] as JSON)
            return
        }
        EntityTypeCode entityTypeCode = params.get("entityType") as EntityTypeCode
        List<Attribute> attributes = attributeService.list(entityTypeCode)
        render([data: attributes] as JSON)
    }

    def read() {
        Attribute attribute = Attribute.get(params.id)
        if (!attribute) {
            throw new ObjectNotFoundException(params.id, "Attribute")
        }
        render(toJson(attribute) as JSON)
    }

    def create() {
        Attribute attribute = new Attribute()
        bindAttribute(attribute, request.JSON)
        saveAttribute(attribute)
    }

    def update() {
        Attribute attribute = Attribute.get(params.id)
        if (!attribute) {
            throw new ObjectNotFoundException(params.id, "Attribute")
        }
        bindAttribute(attribute, request.JSON)
        saveAttribute(attribute)
    }

    def delete() {
        Attribute attribute = Attribute.get(params.id)
        if (!attribute) {
            throw new ObjectNotFoundException(params.id, "Attribute")
        }
        attribute.delete(flush: true)
        render status: 204
    }

    private void saveAttribute(Attribute attribute) {
        if (!attribute.hasErrors() && attribute.save(flush: true)) {
            render(toJson(attribute) as JSON)
        } else {
            throw new ValidationException("Unable to save attribute due to errors", attribute.errors)
        }
    }

    private static void bindAttribute(Attribute attribute, Map json) {
        if (json.containsKey("code")) attribute.code = json.code
        if (json.containsKey("name")) attribute.name = json.name
        if (json.containsKey("description")) attribute.description = json.description
        if (json.containsKey("defaultValue")) attribute.defaultValue = json.defaultValue
        if (json.containsKey("active")) attribute.active = json.active as Boolean
        if (json.containsKey("required")) attribute.required = json.required as Boolean
        if (json.containsKey("allowOther")) attribute.allowOther = json.allowOther as Boolean
        if (json.containsKey("allowMultiple")) attribute.allowMultiple = json.allowMultiple as Boolean
        if (json.containsKey("unitOfMeasureClass")) {
            def uomClassId = json.unitOfMeasureClass instanceof Map ? json.unitOfMeasureClass.id : json.unitOfMeasureClass
            attribute.unitOfMeasureClass = uomClassId ? UnitOfMeasureClass.get(uomClassId) : null
        }
        if (json.containsKey("options")) {
            attribute.options = new ArrayList()
            json.options.each { option ->
                if (option) {
                    attribute.options.add(option as String)
                }
            }
        }
        if (json.containsKey("entityTypeCode")) {
            EntityTypeCode entityTypeCode = json.entityTypeCode ?
                    json.entityTypeCode as EntityTypeCode : null
            if (entityTypeCode && !attribute?.entityTypeCodes?.contains(entityTypeCode)) {
                attribute?.entityTypeCodes?.clear()
                attribute.addToEntityTypeCodes(entityTypeCode)
            }
        }
    }

    private static Map toJson(Attribute attribute) {
        [
                id                : attribute.id,
                code              : attribute.code,
                name              : attribute.name,
                description       : attribute.description,
                defaultValue      : attribute.defaultValue,
                active            : attribute.active,
                required          : attribute.required,
                allowOther        : attribute.allowOther,
                allowMultiple     : attribute.allowMultiple,
                exportable        : attribute.exportable,
                entityTypeCode    : attribute.entityTypeCode?.name(),
                unitOfMeasureClass: attribute.unitOfMeasureClass ?
                        [id: attribute.unitOfMeasureClass.id, name: attribute.unitOfMeasureClass.name] : null,
                options           : attribute.options ?: [],
                dateCreated       : attribute.dateCreated?.format("dd/MMM/yyyy hh:mm a"),
                lastUpdated       : attribute.lastUpdated?.format("dd/MMM/yyyy hh:mm a"),
        ]
    }
}
