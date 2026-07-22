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
import grails.plugins.quartz.GrailsJobClassConstants
import grails.plugins.quartz.JobManagerService
import org.quartz.CronScheduleBuilder
import org.quartz.JobDetail
import org.quartz.JobKey
import org.quartz.Scheduler
import org.quartz.Trigger
import org.quartz.TriggerBuilder
import org.quartz.TriggerKey
import org.quartz.impl.triggers.CronTriggerImpl
import org.springframework.http.HttpStatus

/**
 * Read-and-schedule API over the Quartz scheduler backing the React
 * jobs/show screen. Quartz job names are fully-qualified class names
 * (they contain dots), so job/trigger identifiers are passed as query
 * parameters or JSON body values instead of path segments.
 */
class JobsApiController {

    JobManagerService jobManagerService

    Scheduler getQuartzScheduler() {
        return jobManagerService.quartzScheduler
    }

    def read() {
        if (!params.name) {
            response.status = HttpStatus.BAD_REQUEST.value()
            render([errorCode: HttpStatus.BAD_REQUEST.value(),
                    errorMessage: "A job name is required"] as JSON)
            return
        }
        String jobGroup = params.group ?: GrailsJobClassConstants.DEFAULT_GROUP
        JobKey jobKey = new JobKey(params.name, jobGroup)
        JobDetail jobDetail = quartzScheduler.getJobDetail(jobKey)
        if (!jobDetail) {
            response.status = HttpStatus.NOT_FOUND.value()
            render([errorCode: HttpStatus.NOT_FOUND.value(),
                    errorMessage: "No Job Detail for key ${params.name}".toString()] as JSON)
            return
        }
        def triggers = quartzScheduler.getTriggersOfJob(jobKey)
        render([data: toJson(jobDetail, triggers)] as JSON)
    }

    def createTrigger() {
        def jsonObject = request.JSON
        String jobName = jsonObject.jobName
        String jobGroup = jsonObject.jobGroup ?: GrailsJobClassConstants.DEFAULT_GROUP
        String cronExpression = jsonObject.cronExpression
        JobKey jobKey = new JobKey(jobName, jobGroup)
        JobDetail jobDetail = jobName ? quartzScheduler.getJobDetail(jobKey) : null
        if (!jobDetail) {
            response.status = HttpStatus.NOT_FOUND.value()
            render([errorCode: HttpStatus.NOT_FOUND.value(),
                    errorMessage: "No Job Detail for key ${jobName}".toString()] as JSON)
            return
        }
        Trigger trigger
        try {
            trigger = TriggerBuilder.newTrigger()
                    .withIdentity("${jobName}-${System.currentTimeMillis()}".toString(), jobGroup)
                    .forJob(jobKey)
                    .withSchedule(CronScheduleBuilder.cronSchedule(cronExpression))
                    .build()
        } catch (RuntimeException e) {
            response.status = HttpStatus.BAD_REQUEST.value()
            render([errorCode: HttpStatus.BAD_REQUEST.value(),
                    errorMessage: "Unable to schedule job with cron expression ${cronExpression} due to the following error: ${e.message}".toString()] as JSON)
            return
        }
        quartzScheduler.scheduleJob(trigger)
        def triggers = quartzScheduler.getTriggersOfJob(jobKey)
        response.status = HttpStatus.CREATED.value()
        render([data: toJson(jobDetail, triggers)] as JSON)
    }

    def deleteTrigger() {
        String triggerGroup = params.group ?: GrailsJobClassConstants.DEFAULT_GROUP
        TriggerKey triggerKey = new TriggerKey(params.name, triggerGroup)
        Trigger trigger = quartzScheduler.getTrigger(triggerKey)
        if (!trigger) {
            response.status = HttpStatus.NOT_FOUND.value()
            render([errorCode: HttpStatus.NOT_FOUND.value(),
                    errorMessage: "Unable to unschedule trigger with trigger key ${params.name}".toString()] as JSON)
            return
        }
        quartzScheduler.unscheduleJob(triggerKey)
        render status: HttpStatus.NO_CONTENT.value()
    }

    private static Map toJson(JobDetail jobDetail, List<? extends Trigger> triggers) {
        return [
                name                         : jobDetail.key.name,
                group                        : jobDetail.key.group,
                key                          : jobDetail.key.toString(),
                description                  : jobDetail.description,
                jobClass                     : jobDetail.jobClass?.name,
                durable                      : jobDetail.durable,
                // Quartz's interface method is (mis)spelled isConcurrentExectionDisallowed
                concurrentExecutionDisallowed: jobDetail.isConcurrentExectionDisallowed(),
                persistJobDataAfterExecution : jobDetail.persistJobDataAfterExecution,
                requestsRecovery             : jobDetail.requestsRecovery(),
                triggers                     : triggers.collect { toTriggerJson(it) },
        ]
    }

    private static Map toTriggerJson(Trigger trigger) {
        boolean isCron = trigger instanceof CronTriggerImpl
        return [
                name             : trigger.key.name,
                group            : trigger.key.group,
                key              : trigger.key.toString(),
                cronExpression   : isCron ? ((CronTriggerImpl) trigger).cronExpression : null,
                expressionSummary: isCron ? ((CronTriggerImpl) trigger).expressionSummary : null,
                previousFireTime : trigger.previousFireTime,
                nextFireTime     : trigger.nextFireTime,
        ]
    }
}
