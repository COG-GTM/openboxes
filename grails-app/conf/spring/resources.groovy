package spring

import org.springframework.boot.web.servlet.FilterRegistrationBean
import org.springframework.core.Ordered

import org.pih.warehouse.monitoring.ApplicationBootHealthIndicator
import org.pih.warehouse.monitoring.SentryGrailsTracingFilter
import org.pih.warehouse.rendering.SafePdfRenderingService

// This is where we can register spring-specific beans using the Spring Bean DSL.
// Regular beans that conform to Grails conventions don't need to be registered here.
// https://docs.grails.org/latest/guide/spring.html
beans = {

    // Override Sentry's default tracing filters since Grails behaves slightly differently than SpringBoot.
    sentryTracingFilter(SentryGrailsTracingFilter)
    sentryTracingFilterRegistration(FilterRegistrationBean) {
        filter = sentryTracingFilter
        urlPatterns = ['/*']
        order = Ordered.HIGHEST_PRECEDENCE + 1
    }

    // Keep /health DOWN until BootStrap (migrations, Quartz, etc.) completes;
    // Grails 5 starts Tomcat before BootStrap runs.
    applicationBootHealthIndicator(ApplicationBootHealthIndicator)

    // Replace the rendering plugin's PDF service: its Groovy 2-compiled
    // DataUriAwareITextUserAgent recurses to a StackOverflowError on Groovy 4
    // whenever a rendered PDF contains an image.
    // primary, so by-type injection prefers it over the plugin's
    // renderingPdfRenderingService bean
    pdfRenderingService(SafePdfRenderingService) { bean ->
        bean.autowire = 'byName'
        bean.primary = true
    }
}
