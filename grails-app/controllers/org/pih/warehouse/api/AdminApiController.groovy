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
import grails.core.GrailsApplication
import grails.util.Environment
import grails.util.Holders
import org.pih.warehouse.LocalizationUtil
import org.pih.warehouse.core.MailService
import org.pih.warehouse.jobs.SendStockAlertsJob
import org.springframework.boot.info.GitProperties
import org.springframework.web.multipart.MultipartFile
import org.springframework.web.multipart.MultipartHttpServletRequest
import util.ConfigHelper
import util.StringUtil

import javax.print.PrintService
import java.awt.print.PrinterJob
import java.nio.charset.Charset

/**
 * REST endpoints backing the React admin console screens
 * (admin/index, admin/controllerActions, admin/cache, admin/plugins,
 * admin/sendMail, admin/showSettings), migrated in Phase 2 (Batch 40).
 */
class AdminApiController {

    def sessionFactory
    MailService mailService
    GrailsApplication grailsApplication
    def quartzScheduler
    GitProperties gitProperties
    def config = Holders.getConfig()

    def controllers() {
        List data = grailsApplication.controllerClasses.sort { it.fullName }.collect { controller ->
            [
                    fullName           : controller.fullName,
                    logicalPropertyName: controller.logicalPropertyName,
                    uri                : "/" + controller.logicalPropertyName,
            ]
        }
        render([data: data] as JSON)
    }

    def controllerActions() {
        List actionNames = []
        grailsApplication.controllerClasses.sort { it.logicalPropertyName }.each { controller ->
            controller.clazz.declaredFields.each { field ->
                if (Closure.isAssignableFrom(field.type)
                        && field.name != 'beforeInterceptor' && field.name != 'afterInterceptor') {
                    actionNames << controller.logicalPropertyName + "." + field.name + ".label = " + field.name
                }
            }
        }
        render([data: actionNames] as JSON)
    }

    def cache() {
        def statistics = sessionFactory.getStatistics()

        List secondLevelCache = statistics.secondLevelCacheRegionNames.collect { String regionName ->
            def regionStatistics = null
            try {
                regionStatistics = statistics.getSecondLevelCacheStatistics(regionName)
            } catch (Exception ignored) {
                // regions that are not domain-data regions have no statistics
            }
            [
                    regionName          : regionName,
                    hitCount            : regionStatistics?.hitCount,
                    missCount           : regionStatistics?.missCount,
                    putCount            : regionStatistics?.putCount,
                    elementCountInMemory: regionStatistics?.elementCountInMemory,
                    elementCountOnDisk  : regionStatistics?.elementCountOnDisk,
                    sizeInMemory        : regionStatistics?.sizeInMemory,
            ]
        }

        List queries = statistics.queries.collect { String queryName ->
            def queryStatistics = statistics.getQueryStatistics(queryName)
            [
                    queryName        : queryName,
                    cacheHitCount    : queryStatistics.cacheHitCount,
                    cacheMissCount   : queryStatistics.cacheMissCount,
                    cachePutCount    : queryStatistics.cachePutCount,
                    executionCount   : queryStatistics.executionCount,
                    executionMinTime : queryStatistics.executionMinTime,
                    executionMaxTime : queryStatistics.executionMaxTime,
                    executionAvgTime : queryStatistics.executionAvgTime,
                    executionRowCount: queryStatistics.executionRowCount,
            ]
        }

        List entities = grailsApplication.domainClasses.collect { domainClass ->
            def entityStatistics = statistics.getEntityStatistics(domainClass.fullName)
            [
                    entityName            : domainClass.fullName,
                    loadCount             : entityStatistics?.loadCount,
                    deleteCount           : entityStatistics?.deleteCount,
                    fetchCount            : entityStatistics?.fetchCount,
                    insertCount           : entityStatistics?.insertCount,
                    updateCount           : entityStatistics?.updateCount,
                    optimisticFailureCount: entityStatistics?.optimisticFailureCount,
            ]
        }

        render([data: [
                hibernateConfig : grailsApplication.config.getProperty("hibernate", Object)?.toString(),
                statistics      : statistics.toString(),
                secondLevelCache: secondLevelCache,
                queries         : queries,
                entities        : entities,
        ]] as JSON)
    }

    def evictDomainCache() {
        String message
        def domainClass = grailsApplication.getDomainClass(params.name)
        if (domainClass) {
            sessionFactory.cache.evictEntityData(domainClass.clazz)
            message = "Domain cache '${params.name}' was invalidated"
        } else {
            message = "Domain cache '${params.name}' does not exist"
        }
        render([data: [message: message]] as JSON)
    }

    def evictQueryCache() {
        String message
        if (params.name) {
            sessionFactory.cache.evictQueryRegion(params.name)
            message = "Query cache '${params.name}' was invalidated"
        } else {
            sessionFactory.cache.evictQueryRegions()
            message = "All query caches were invalidated"
        }
        render([data: [message: message]] as JSON)
    }

    def plugins() {
        def pluginManager = grailsApplication.mainContext.getBean('pluginManager')
        List data = pluginManager.allPlugins.collect { plugin ->
            [name: plugin.name, version: plugin.version?.toString()]
        }
        render([data: data] as JSON)
    }

    def mailInfo() {
        render([data: [
                enabled  : mailService.isMailEnabled,
                from     : config.getProperty("grails.mail.from"),
                defaultTo: session?.user?.email,
        ]] as JSON)
    }

    def sendMail() {
        String message
        try {
            MultipartFile multipartFile = request instanceof MultipartHttpServletRequest
                    ? request.getFile('file')
                    : null
            if (multipartFile && !multipartFile.empty) {
                def success = mailService.sendHtmlMailWithAttachment(
                        session?.user,
                        params.list("to"),
                        null,
                        params["subject"],
                        params["message"],
                        multipartFile?.bytes,
                        multipartFile?.originalFilename,
                        multipartFile?.contentType
                )
                if (success) {
                    message = "Multipart email with subject ${params.subject} and attachment ${multipartFile.originalFilename} has been sent to ${params.to}"
                } else {
                    message = "Could not send email with subject ${params.subject} and attachment ${multipartFile.originalFilename} to ${params.to}"
                }
            } else {
                if (params.includesHtml) {
                    mailService.sendHtmlMail(params.subject, params.message, params.to)
                    message = "HTML email with subject ${params.subject} has been sent to ${params.to}"
                } else {
                    mailService.sendMail(params.subject, params.message, params.to)
                    message = "Text email with subject ${params.subject} has been sent to ${params.to}"
                }
            }
        } catch (Exception e) {
            message = "Unable to send email due to error: " + e.message
        }
        render([data: [message: message]] as JSON)
    }

    def triggerStockAlerts() {
        SendStockAlertsJob.triggerNow([:])
        render([data: [message: "Triggered send stock alerts job in background"]] as JSON)
    }

    def settings() {
        PrintService[] printServices = PrinterJob.lookupPrintServices()

        List printers = printServices.collect { printService ->
            [
                    name               : printService.name,
                    attributes         : printService.attributes.toArray().collect { attribute ->
                        [name: attribute.name, value: attribute.toString()]
                    },
                    docFlavors         : printService.supportedDocFlavors.collect { it.mimeType }.unique(),
                    attributeCategories: printService.supportedAttributeCategories.collect { category ->
                        [
                                name        : category.name,
                                defaultValue: printService.getDefaultAttributeValue(category)?.toString(),
                        ]
                    },
            ]
        }

        def defaultLocale = new Locale(grailsApplication.config.openboxes.locale.defaultLocale)
        List locales = grailsApplication.config.openboxes.locale.supportedLocales.collect { l ->
            Locale locale = LocalizationUtil.getLocale(l)
            [
                    code       : l,
                    displayName: locale?.getDisplayName(locale ?: defaultLocale),
                    current    : session?.user?.locale == locale,
            ]
        }

        Map mailSettings = [:]
        grailsApplication.config.grails.mail.each { property ->
            mailSettings[property.key] = maskedPropertyValue(property.key, property.value)
        }

        Map configProperties = new TreeMap()
        grailsApplication.config.toProperties().each { key, value ->
            configProperties[key] = maskedPropertyValue(key, value)
        }

        Map systemProperties = new TreeMap()
        System.properties.each { key, value ->
            systemProperties[key?.toString()] = value?.toString()
        }

        Map jobsProperties = configProperties.findAll { it.key?.contains("jobs") }

        render([data: [
                environment       : Environment.current.toString(),
                appVersion        : grailsApplication.metadata.getApplicationVersion(),
                buildNumber       : gitProperties.shortCommitId,
                buildDate         : grailsApplication.metadata['build.time'],
                branchName        : ConfigHelper.getBranchName(gitProperties),
                grailsVersion     : grailsApplication.metadata.getGrailsVersion(),
                currentDate       : new Date().toString(),
                defaultCharset    : Charset.defaultCharset().toString(),
                locales           : locales,
                mailEnabled       : Boolean.valueOf(grailsApplication.config.grails.mail.enabled),
                mailFrom          : config.getProperty("grails.mail.from"),
                mailHost          : config.getProperty("grails.mail.host"),
                mailPort          : config.getProperty("grails.mail.port"),
                mailSettings      : mailSettings,
                externalConfigFile: grailsApplication.config.grails.config.locations?.toString(),
                configProperties  : configProperties,
                systemProperties  : systemProperties,
                printers          : printers,
                quartz            : [
                        schedulerName      : quartzScheduler.schedulerName,
                        schedulerInstanceId: quartzScheduler.schedulerInstanceId,
                        metaData           : quartzScheduler.metaData?.toString(),
                        jobsProperties     : jobsProperties,
                ],
        ]] as JSON)
    }

    private static String maskedPropertyValue(def key, def value) {
        if (key?.toString()?.contains("password") && value) {
            return StringUtil.mask(value.toString(), "*")
        }
        return value?.toString()
    }
}
