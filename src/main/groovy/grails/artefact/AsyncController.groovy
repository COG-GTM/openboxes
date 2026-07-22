package grails.artefact

/**
 * Binary-compatibility stub for the {@code grails.artefact.AsyncController}
 * trait, which was removed in Grails 7 along with the controllers-async
 * plugin. The legacy csv plugin (org.grails.plugins:csv:1.0.1) ships a
 * CsvTestController compiled against this trait; without it the class fails
 * to load and plugin initialization aborts the whole application.
 *
 * The app itself never uses async controller features, and neither does the
 * csv plugin (it only links against the trait's generated {@code $static$init$}
 * helper), so an empty trait restores the Grails 6 behavior.
 */
@SuppressWarnings('EmptyClass')
trait AsyncController {
}
