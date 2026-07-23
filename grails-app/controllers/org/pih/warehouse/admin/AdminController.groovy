/**
 * Copyright (c) 2012 Partners In Health.  All rights reserved.
 * The use and distribution terms for this software are covered by the
 * Eclipse Public License 1.0 (http://opensource.org/licenses/eclipse-1.0.php)
 * which can be found in the file epl-v10.html at the root of this distribution.
 * By using this software in any fashion, you are agreeing to be bound by
 * the terms of this license.
 * You must not remove this notice, or any other, from this software.
 **/
package org.pih.warehouse.admin

import grails.core.GrailsApplication
import grails.util.Holders
import grails.validation.Validateable
import org.pih.warehouse.jobs.SendStockAlertsJob
import org.springframework.boot.info.GitProperties

import java.util.concurrent.FutureTask

class AdminController {

    def sessionFactory // inject Hibernate sessionFactory
    GrailsApplication grailsApplication
    def config = Holders.getConfig()
    def quartzScheduler
    def dataService
    GitProperties gitProperties

    def index() {
        // /admin (without an action) also maps here; normalize the URL so the
        // React router matches the /admin/index route.
        if (!request.forwardURI?.endsWith("/index")) {
            redirect(action: "index")
            return
        }
        render(view: "/common/react", params: params)
    }

    def controllerActions() {
        render(view: "/common/react", params: params)
    }

    def triggerStockAlerts = {
        SendStockAlertsJob.triggerNow([:])
        flash.message = "Triggered send stock alerts job in background"
        redirect(controller: "admin", action: "showSettings")
    }

    def cache() {
        render(view: "/common/react", params: params)
    }

    def plugins() {
        render(view: "/common/react", params: params)
    }

    def status() {
        render(view: "/common/react", params: params)
    }

    def static LOCAL_TEMP_WEBARCHIVE_PATH = "warehouse.war"

    def showUpgrade(UpgradeCommand command) {
        render(view: "/common/react", params: params)
    }

    def evictDomainCache() {
        def domainClass = grailsApplication.getDomainClass(params.name)
        if (domainClass) {
            sessionFactory.evict(domainClass.clazz)
            flash.message = "Domain cache '${params.name}' was invalidated"
        } else {
            flash.message = "Domain cache '${params.name}' does not exist"
        }
        redirect(action: "showSettings")
    }

    def evictQueryCache() {
        if (params.name) {
            sessionFactory.evictQueries(params.name)
            flash.message = "Query cache '${params.name}' was invalidated"
        } else {
            sessionFactory.evictQueries()
            flash.message = "All query caches were invalidated"
        }
        redirect(action: "showSettings")
    }


    def sendMail() {
        render(view: "/common/react", params: params)
    }


    def download(UpgradeCommand command) {
        log.info "download " + params
        if (command?.remoteWebArchiveUrl) {
            session.command = command
            session.command.future = null
            session.command?.localWebArchive = new File("warehouse.war")
            flash.message = "Attempting to download '" + command?.remoteWebArchiveUrl + "' to '" + command?.localWebArchive?.absolutePath + "'"
        } else {
            flash.message = "Please enter valid web archive url"

        }

        chain(action: "showUpgrade", model: [command: command])
    }


    def deploy(UpgradeCommand command) {
        log.info "deploy " + params

        session.command.localWebArchivePath = command.localWebArchivePath
        command.localWebArchive = session.command.localWebArchive

        def source = session.command.localWebArchive
        def destination = new File(session.command.localWebArchivePath)
        def backup = new File(session.command.localWebArchive.absolutePath + ".backup")
        log.info "Copying wbe archive to backup " + source.absolutePath + " to " + backup.absolutePath
        backup.bytes = source.bytes

        log.info "Copying web archive to web container " + destination.absolutePath
        destination.bytes = source.bytes

        chain(action: "showUpgrade", model: [command: command])
    }

    def showDatabaseStatus() {
        def results = dataService.executeQuery("show engine innodb status")
        render "<pre>${results.Status[0]}</pre>"
    }

    def showDatabaseProcessList() {
        def processlist = dataService.executeQuery("show processlist")

        render "<pre>${processlist.join('<br/>')}</pre>"
    }

    def showSettings() {
        render(view: "/common/react", params: params)
    }


    def downloadWar() {
        log.info("Updating war file " + params)
        redirect(action: "showSettings")
    }

    def cancelUpdateWar() {
        if (session.future) {
            session.future.cancel(true)
            new File(LOCAL_TEMP_WEBARCHIVE_PATH).delete()
        }
        redirect(action: "showSettings")
    }

    def deployWar(UpgradeCommand) {
        def source = session.command.localWebArchive

        def backup = new File(session.command.localWebArchive.absolutePath + ".backup")
        log.info "Backing up " + source.absolutePath + " to " + backup.absolutePath
        backup.bytes = source.bytes

        redirect(action: "showSettings")
    }
}

class UpgradeCommand implements Validateable {

    FutureTask future
    File localWebArchive
    String remoteWebArchiveUrl
    String localWebArchivePath

    static constraints() {
        future(nullable: true)
        localWebArchive(nullable: true)
        remoteWebArchiveUrl(nullable: true)
        localWebArchivePath(nullable: true)
    }


    Integer getRemoteFileSize() {
        if (remoteWebArchiveUrl) {
            HttpURLConnection conn = null
            try {
                conn = (HttpURLConnection) new URL(remoteWebArchiveUrl).openConnection()
                conn.setRequestMethod("HEAD")
                conn.getInputStream()
                return conn.getContentLength()
            } catch (IOException e) {
                return -1
            } finally {
                if (conn) conn.disconnect()
            }
        }
        return -1
    }
}
