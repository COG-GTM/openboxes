# Dependency Audit — Phase 1.1b (pre-Grails 4 cleanup)

Audit of `build.gradle` / `gradle.properties` on Grails 3.3.16 / Java 11
(post Phase 1.1a). Goal: remove unused dependencies, apply safe patch/minor
bumps, and flag everything that must be handled by the Grails 3→4 wave.

**Legend** — Status: `active` (maintained upstream), `EOL` (no longer
maintained), `pinned` (version locked by a documented coupling).
Action: `removed`, `updated`, `kept`, `deferred` (needs code changes or is
coupled to the Grails/GORM upgrade — input to the Grails 4 wave).

## Summary

| Category | Count |
|---|---|
| Removed (unused) | 2 |
| Updated (patch/minor, verified compatible) | 7 |
| Deferred to Grails 4 wave | 14 |

## Removed (unused)

| Dependency | Version | Evidence | Grails 4 risk |
|---|---|---|---|
| `io.micronaut:micronaut-http-client` (testCompile) | 1.2.11 | Its only consumer, `ApiControllerFunctionalSpec.groovy`, no longer exists in the tree (`rg micronaut` matches only build.gradle). It transitively supplied `jackson-datatype-jsr310` to the test classpath, which rest-assured API specs rely on for `java.time` (de)serialization — now declared explicitly as a direct testCompile dependency. | None (removed) |
| `org.jadira.usertype:usertype.jodatime` | 2.0.1 | Provides Hibernate user types for persisting Joda-Time fields in domain classes. No domain class uses `org.joda.time` types (`rg "org.joda" grails-app/domain` → no matches); Joda is only used transiently in services/controllers via `joda-time:joda-time`, which stays. Boot + characterization verified green without it. | None (removed) |

## Updated (patch/minor, Grails 3.3.16 + Java 11 compatible)

| Dependency | Before → After | Rationale |
|---|---|---|
| `ch.qos.logback:*` (`logbackVersion`) | 1.2.12 → 1.2.13 | CVE-2023-6378 fix; last 1.2.x. 1.3+ stays blocked by Grails 3's Spring Boot 1.5 (unblocked in Grails 5+, not 4). |
| `batikVersion` (forced on `org.apache.xmlgraphics:batik-*`) | 1.16 → 1.17 | CVE-2022-44729/44730 fixes; Java 8+ compatible. |
| `commons-codec:commons-codec` | 1.15 → 1.16.1 | Minor bump, no API removals. |
| `org.apache.commons:commons-csv` | 1.10.0 → 1.11.0 | Minor bump, no API removals. |
| `joda-time:joda-time` | 2.12.5 → 2.12.7 | Timezone-data updates only. |
| `com.google.zxing:javase` | 3.5.1 → 3.5.3 | Patch fixes; last Java-8-compatible line. |
| `com.icegreen:greenmail` (testImplementation) | 1.6.14 → 1.6.15 | Patch; final 1.6.x. |

Forced sub-dependency versions bumped alongside (security patch lines):
`commons-io` 2.12.0 → 2.15.1, `org.apache.commons:commons-lang3`
3.12.0 → 3.14.0, `com.google.protobuf:protobuf-java` 3.21.11 → 3.21.12.

## Kept as-is (checked, no action needed)

| Dependency | Version | Status | Notes |
|---|---|---|---|
| `httpComponentsVersion` / `httpCoreVersion` | 4.5.14 / 4.4.16 | active | Latest 4.x; httpclient5 is a code rewrite — defer. |
| `io.sentry:*` | 6.34.0 | active | Final 6.x; 7.x needs code changes (`sentry-spring` module split). |
| `org.slf4j:*` | 1.7.36 | active | Final 1.7.x; 2.x blocked with logback 1.2. |
| `snakeyaml` | 1.33 | active | Final 1.x; 2.x is a breaking API change tied to Spring Boot 2.7+/3. |
| `com.google.code.gson:gson` | 2.10.1 | active | 2.11+ pulls newer error-prone annotations than the forced 2.19.1. |
| `com.google.guava:guava` | 32.0.1-jre | active | Newer versions raise checker-qual/error-prone force conflicts; revisit with the force-block cleanup in the Grails 4 wave. |
| `tomcatVersion` | 8.5.88 | pinned | **Bump attempted and reverted**: 8.5.100 deadlocks Spring Boot 1.5's embedded-Tomcat startup (app hangs in `TomcatEmbeddedServletContainer.removeServiceConnectors`, verified via thread dump). Newer 8.5.x/9.x requires the Boot 2.1 lifecycle that arrives with Grails 4. |
| `htmlUnitVersion` / `seleniumVersion` | 2.70.0 / 3.141.59 | active | Last lines compatible with Geb/Grails 3 functional tests. |
| `org.testcontainers:*` | 1.21.3 | active | Current. |
| `commons-beanutils`, `commons-fileupload`, `commons-validator` | 1.9.4 / 1.5 / 1.7 | active | Latest on their lines. |
| `docx4j` / xDocReport / flying-saucer / openpdf | 8.3.8 / 2.0.4 / 9.1.22 / 1.3.11 | pinned | Documented version-coupled cluster (openpdf pinned to flying-saucer's tested release). |

## Deferred — inputs to the Grails 3→4 wave

These require code rewrites, Grails-plugin replacements, or are pinned by the
GORM/Hibernate/Liquibase cluster. **Do not bump piecemeal**; sequence them
with the framework upgrade.

| # | Dependency | Current | Issue / Grails 4 action |
|---|---|---|---|
| 1 | `org.grails:*` / `groovyVersion` / `springframeworkVersion` | 3.3.16 / 2.4.21 / 4.3.30 | The upgrade itself: Grails 4.1.x brings Groovy 2.5, Spring 5.1, Spring Boot 2.1, GORM 7. All `eachDependency` group-forcings must be re-derived. |
| 2 | GORM/Hibernate cluster: `gormVersion` 6.1.12 / `hibernateVersion` 5.2.18 | pinned | GORM 7 moves to Hibernate 5.4; deletes the "GORM uses internal APIs removed in 5.3" pin. `hibernate-ehcache` → JCache/ehcache3 recommended. |
| 3 | `database-migration` 3.1.0 / `liquibaseVersion` 3.10.1 / `mySqlConnectorVersion` 8.0.22 | pinned | Grails 4 uses database-migration 3.1.x→4.0, Liquibase 3.10+. Unpins the MySQL connector (8.0.23+ API break vs Liquibase ≤3.10.3) and removes the `serverTimezone=UTC` JDBC workaround. |
| 4 | `jacksonVersion` 2.9.10(.8) | EOL | 2.9 is EOL with known CVEs. Spring Boot 2.1 (Grails 4) manages 2.9→2.11; bump with the upgrade, then re-test all JSON views/marshallers. |
| 5 | `org.grails.plugins:code-coverage` 2.0.3-3 (Cobertura) | EOL (2016) | No Grails 4 version; JaCoCo (already configured) fully replaces it. Also lets us drop the deprecated `repo.grails.org/grails/plugins` repository. |
| 6 | `org.grails.plugins:grails-test-mixins` 3.3.0 | EOL | Compat shim only; Grails 4 requires migration to `grails-testing-support` traits (many test files import `grails.test.mixin`). |
| 7 | `org.grails.plugins:quartz-monitor` 1.3 | EOL (declared non-transitive to avoid ancient deps) | No Grails 4 release; drop or replace with actuator/quartz UI. `quartz` plugin itself has a 2.0.13+ Grails 4 line. |
| 8 | `org.grails.plugins:ajax-tags` 1.0.0 | EOL | `<g:formRemote>`/`<g:remoteLink>` still used in ~30 GSPs; plugin has no Grails 4 build. Rewrite GSPs to plain JS/jQuery or vendor the taglib. |
| 9 | `org.grails.plugins:csv` 1.0.1 and `excel-import` 3.0.2 | EOL | Both marked `FIXME use commons-csv instead`; `csv` is used across ~30 controllers/services. Port to commons-csv (already a dependency) before/during the upgrade. |
| 10 | `commons-lang:commons-lang` 2.6 and `commons-collections:commons-collections` 3.2.2 | EOL | Superseded by lang3/collections4 (both already on classpath). Code migration flagged `FIXME` in build.gradle. |
| 11 | `poiVersion` 3.17 | EOL | Pinned by xDocReport 2.0.4 (`poi-ooxml` excluded to avoid conflict). POI 4/5 renames packages; coordinate with xDocReport/docx4j bumps. |
| 12 | `assetPipelineVersion` 3.2.3 | pinned ("logging broke in 3.2.4+") | Grails 4 typically pairs with asset-pipeline 3.x latest; re-test the logging regression during the upgrade. |
| 13 | Spock 1.3-groovy-2.4 | EOL | Grails 4/Groovy 2.5 requires `spock-core:1.3-groovy-2.5` (later 2.x for Groovy 3). Mechanical but touches every test. |
| 14 | Build plugins: Gradle wrapper 4.10.3, `maven` plugin, `com.github.ben-manes.versions` 0.27.0, `gradle-git-properties` 2.2.4, `node-gradle` 1.5.3, `nebula.lint` 17.8.0, JGit 5.x buildscript force | pinned | Grails 4 requires Gradle 5.x/6.x: the deprecated `maven` plugin (removed in Gradle 7) must move to `maven-publish`, node/git-properties/versions plugins need their Gradle-5+ releases, and the JGit ≤5 force can be dropped on Java 11. |

## Top risks for the Grails 3→4 wave

1. **The GORM 6.1 → 7 / Hibernate 5.2 → 5.4 jump (#2)** — the current build
   leans on internal-API pins; every `eachDependency`/`force` rule in
   `build.gradle` needs re-derivation against the new BOM, and
   `failOnVersionConflict()` will surface all of it at once.
2. **Liquibase/database-migration/MySQL-connector unpinning (#3)** — schema
   tooling changes with 700+ existing changesets; must be proven against the
   characterization DB before anything else lands.
3. **Jackson 2.9 EOL (#4)** — security-relevant, but the bump cascades through
   grails views/JSON marshalling; needs the API snapshot suite as the gate.
4. **Dead Grails 2/3-era plugins with no Grails 4 build (#5–#9)** — csv,
   excel-import, ajax-tags, quartz-monitor, code-coverage, test-mixins all
   need replacement or removal, several with wide code footprints.
5. **Embedded Tomcat is frozen at 8.5.88 until Boot 2.1 (#1)** — newer 8.5.x
   patch releases deadlock Spring Boot 1.5's startup (verified empirically);
   accumulating Tomcat CVEs can only be addressed by the Grails 4 upgrade.
6. **Gradle 4.10 → 5/6 build-system migration (#14)** — prerequisite for the
   Grails 4 plugin; breaks the deprecated `maven` plugin and several
   third-party plugin versions currently in use.
