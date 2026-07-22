package org.pih.warehouse.monitoring

import org.springframework.boot.actuate.health.Health
import org.springframework.boot.actuate.health.HealthIndicator

/**
 * Reports the app as DOWN until BootStrap (database migrations, Quartz
 * startup, etc.) has finished. Grails 5 runs BootStrap classes after the
 * embedded Tomcat starts accepting requests, so without this gate /health
 * returns UP while Liquibase migrations are still running (Grails 4 and
 * earlier only opened the port once BootStrap had completed).
 */
class ApplicationBootHealthIndicator implements HealthIndicator {

    static volatile boolean bootstrapComplete = false

    @Override
    Health health() {
        return bootstrapComplete ?
            Health.up().build() :
            Health.down().withDetail('bootstrap', 'still initializing').build()
    }
}
