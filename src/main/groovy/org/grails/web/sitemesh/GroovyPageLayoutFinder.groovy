package org.grails.web.sitemesh

/**
 * Binary-compatibility stub for the Sitemesh-2-era GroovyPageLayoutFinder,
 * relocated in Grails 7 to {@code org.apache.grails.web.layout}. The legacy
 * csv plugin's CsvTestController was compiled with a method signature
 * referencing this FQN, and Spring bean introspection fails to load the class
 * without it. It is never instantiated or invoked; the real layout finder the
 * application uses is the org.apache.grails.web.layout one from grails-layout.
 */
@SuppressWarnings('EmptyClass')
class GroovyPageLayoutFinder {
}
