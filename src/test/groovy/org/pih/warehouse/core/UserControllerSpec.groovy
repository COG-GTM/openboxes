package org.pih.warehouse.core

import grails.testing.gorm.DataTest
import grails.testing.web.controllers.ControllerUnitTest
import org.pih.warehouse.PasswordCodec
import org.pih.warehouse.user.UserController
import spock.lang.Specification

class UserControllerSpec extends Specification implements ControllerUnitTest<UserController>, DataTest {
    def stubMessager = new Expando()

    Class[] getDomainClassesToMock() {
        [User]
    }

    void setup() {
        mockCodec(PasswordCodec)
        controller.userService = Spy(UserService)

        // several controller actions read session.user.id
        session.user = new User(username: "asd",
            firstName: "Asd",
            lastName: "Qwe",
            password: "test123",
            passwordConfirm: "test123").save(flush: true)
    }

    void "test redirecting from index action"() {
        when:
        controller.index()

        then:
        response.redirectedUrl == '/user/list'
    }
    void "test redirect action"() {
        when:
        controller.redirect()

        then:
        response.redirectedUrl == '/user/edit'
    }

    void "test create user"() {
        when:
        controller.params.username = "Test"
        controller.params.password = "Password123"
        controller.create()

        then:
        view == '/common/react'
    }

    void "test saving an invalid user"() {
        when:
        request.method = "POST"
        controller.save()

        then:
        response.redirectedUrl == '/user/create'
        flash.message != null
    }

    void "test saving a valid user"() {
        when:
        stubMessager.message = { args -> return "success" }
        controller.metaClass.warehouse = stubMessager
        controller.params.username = "Test"
        controller.params.firstName = "John"
        controller.params.lastName = "Doe"
        controller.params.password = "Password123"
        controller.params.passwordConfirm = "Password123"
        request.method = "POST"
        controller.save()

        then:
        response.redirectedUrl.startsWith('/user/edit/')
        flash.message != null
        User.count() == 2
    }

    void "test list renders the React app shell"() {
        when:
        controller.list()

        then:
        view == '/common/react'
    }
}
