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
import grails.util.Holders
import grails.validation.ValidationException
import org.hibernate.Hibernate
import org.hibernate.ObjectNotFoundException
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.http.HttpStatus
import util.StringUtil

import org.pih.warehouse.core.Person

class PersonApiController extends BaseDomainApiController {

    def userService

    def list() {
        String[] terms = params?.name?.split(",| ")?.findAll { it }
        def people = userService.findPersons(terms, params)
        render([data: people] as JSON)
    }

    def search() {
        Integer max = Math.min(params.max ? params.int('max') : 10, 100)
        Integer offset = params.offset ? params.int('offset') : 0
        String sort = params.sort in ['firstName', 'lastName', 'email', 'phoneNumber', 'active', 'dateCreated'] ? params.sort : 'lastName'
        String sortOrder = params.order == 'desc' ? 'desc' : 'asc'
        List<String> terms = params.q ? params.q.split(",| ").findAll { it } : []
        def results = Person.createCriteria().list(max: max, offset: offset) {
            terms.each { String term ->
                or {
                    ilike("firstName", "%${term}%")
                    ilike("lastName", "%${term}%")
                    ilike("email", "%${term}%")
                }
            }
            order(sort, sortOrder)
        }
        Boolean anonymize = Holders.config.getProperty("openboxes.anonymize.enabled", Boolean.class, Boolean.FALSE)
        List data = results.collect { Person person ->
            [
                    id         : person.id,
                    name       : person.name,
                    firstName  : person.firstName,
                    lastName   : anonymize ? person.lastInitial : person.lastName,
                    email      : anonymize ? StringUtil.mask(person.email) : person.email,
                    phoneNumber: person.phoneNumber,
                    active     : person.active,
                    type       : Hibernate.getClass(person).simpleName,
            ]
        }
        render([data: data, totalCount: results.totalCount] as JSON)
    }

    def details() {
        Person person = Person.get(params.id)
        if (!person) {
            throw new ObjectNotFoundException(params.id, Person.class.toString())
        }
        render([data: [
                id         : person.id,
                name       : person.name,
                firstName  : person.firstName,
                lastName   : person.lastName,
                email      : person.email,
                phoneNumber: person.phoneNumber,
                active     : person.active,
                type       : Hibernate.getClass(person).simpleName,
                version    : person.version,
                dateCreated: person.dateCreated,
                lastUpdated: person.lastUpdated,
        ]] as JSON)
    }

    @Transactional
    def create() {
        def jsonObject = request.JSON
        Person person = new Person()
        bindPerson(person, jsonObject)
        if (!person.validate() || !person.save(flush: true)) {
            throw new ValidationException("Invalid person", person.errors)
        }
        render([data: [id: person.id]] as JSON)
    }

    @Transactional
    def update() {
        Person person = Person.get(params.id)
        if (!person) {
            throw new ObjectNotFoundException(params.id, Person.class.toString())
        }
        def jsonObject = request.JSON
        if (jsonObject.containsKey("version") && person.version > (jsonObject.version as Long)) {
            String message = "${warehouse.message(code: 'default.optimistic.locking.failure', default: 'Another user has updated this Person while you were editing')}"
            response.status = HttpStatus.CONFLICT.value()
            render([errorCode: HttpStatus.CONFLICT.value(), errorMessage: message] as JSON)
            return
        }
        bindPerson(person, jsonObject)
        if (!person.validate() || !person.save(flush: true)) {
            throw new ValidationException("Invalid person", person.errors)
        }
        render([data: [id: person.id]] as JSON)
    }

    @Transactional
    def delete() {
        Person person = Person.get(params.id)
        if (!person) {
            throw new ObjectNotFoundException(params.id, Person.class.toString())
        }
        try {
            person.delete(flush: true)
        } catch (DataIntegrityViolationException ignored) {
            transactionStatus.setRollbackOnly()
            String message = "${warehouse.message(code: 'default.not.deleted.message', args: [warehouse.message(code: 'person.label', default: 'Person'), params.id])}"
            response.status = HttpStatus.BAD_REQUEST.value()
            render([errorCode: HttpStatus.BAD_REQUEST.value(), errorMessage: message] as JSON)
            return
        }
        render status: HttpStatus.NO_CONTENT.value()
    }

    private static void bindPerson(Person person, jsonObject) {
        if (jsonObject.containsKey("firstName")) {
            person.firstName = jsonObject.firstName ?: null
        }
        if (jsonObject.containsKey("lastName")) {
            person.lastName = jsonObject.lastName ?: null
        }
        if (jsonObject.containsKey("email")) {
            person.email = jsonObject.email ?: null
        }
        if (jsonObject.containsKey("phoneNumber")) {
            person.phoneNumber = jsonObject.phoneNumber ?: null
        }
        if (jsonObject.containsKey("active")) {
            person.active = jsonObject.active as Boolean
        }
    }
}
