# Running OpenBoxes Locally (Docker)

Verified baseline environment for the modernization program (Phase 0.1).
Boots the released OpenBoxes app image (`ghcr.io/openboxes/openboxes:latest`,
Grails 3.3.16 / Java 8) against a containerized MariaDB 10 database, fronted
by nginx. As of Phase 1.4 the source tree builds and runs on **Java 21**
(see [Running from source on Java 21](#running-from-source-on-java-21)).

## Prerequisites

- Docker Engine v24+ with the Compose plugin (`docker compose`). No local
  Java/Gradle toolchain is needed — the app runs from a prebuilt image.
- ~2 GB of free RAM for the app container (JVM runs with `-Xms1024m -Xmx1024m`).
- Outbound internet access (to pull images, and for the demo-data loader,
  which fetches CSVs from the upstream GitHub repo).

## Boot the stack

```bash
cd docker
docker compose up -d
```

This starts three containers:

| Container         | Image                                   | Ports (host)  |
|-------------------|-----------------------------------------|---------------|
| `openboxes-app`   | `ghcr.io/openboxes/openboxes:latest`    | 8080          |
| `openboxes-db`    | `mariadb:10`                            | (internal)    |
| `openboxes-nginx` | `nginx:1.13`                            | 80            |

On **first boot** the app runs the full Liquibase migration suite against the
empty database. This takes **2–5 minutes** (longer on slow machines). Watch
progress with:

```bash
docker logs -f openboxes-app
```

The app is ready when the log prints:

```
Grails application running at http://localhost:8080/openboxes in environment: production
```

or when the healthcheck passes:

```bash
curl -s http://localhost:8080/openboxes/health   # {"status":"UP"}
```

## App URL and credentials

- App URL: **http://localhost:8080/openboxes/** (also proxied on port 80 via nginx)
- Default login (seeded by the install migrations): **admin / password**

After logging in you will be asked to choose a location — pick
**Main Warehouse**.

## Seed demo data

The install migrations only create the admin user and a bare Main Warehouse.
To get realistic data (57 products, 18+ locations incl. Boston/Chicago
warehouses, inventory in 3 depots, sample users, 2 stock lists) run the
built-in configuration-wizard demo loader:

```bash
cd docker
./load-demo-data.sh          # defaults: http://localhost:8080/openboxes admin password
```

This logs in as admin and hits `GET /api/config/data/demo`, which imports the
demo CSVs referenced in `grails-app/conf/runtime.groovy`
(`openboxes.configurationWizard.dataInit`). It takes a minute or two.
Run it once against a fresh database; re-running may create duplicates.

Demo users created (all with password `password`): `admin`, `superuser`,
`purchaser`, `accountant`, `browser`. Note that the demo users other than
`admin` are imported **inactive** ("account under review" on login) — activate
them as admin via *gear icon → Users → select user → Activate* before use.

Demo depots with inventory: Main Warehouse, Boston Warehouse,
Chicago Warehouse (plus Central Warehouse (NYC)).

## Characterization tests

Once the stack is up and demo data is loaded, the Playwright golden-path
suite in [`characterization/`](../../characterization/README.md) can be run
with `cd characterization && npm ci && npx playwright install chromium && npm test`.
`docker/wait-for-app.sh` blocks until the app healthcheck passes (useful in
scripts/CI).

## Running from source on Java 21

The app builds and runs on JDK 21 (the Docker image uses
`eclipse-temurin:21-jre-noble`). To build the WAR from the source tree and
boot the stack with it instead of the released image:

```bash
./gradlew prepareDocker -Dgrails.env=prod       # requires JDK 21
docker build -t openboxes/openboxes:java21-local build/docker
cd docker
OB_IMAGE_REPOSITORY="" OB_VERSION=java21-local docker compose up -d
```

Then wait for the healthcheck and load demo data as described above. The
`.github/workflows/characterization-java21.yml` workflow runs exactly this
flow in CI and executes the Playwright characterization suite against it.

Notes:

- The API snapshot suite must run against a *pristine* demo dataset — run it
  before any Playwright flows (which mutate data), or reset the database in
  between.
- The API snapshots were recorded against the pinned released image and
  currently drift from source builds of `develop` (identically on Java 8 and
  Java 11 source builds), so the API suite only runs against the pinned image
  in CI until the snapshots are re-baselined.

## Configuration overrides

Optionally create `docker/.env` (see `docker/.env.example`) to override
database credentials, the app image/version (`OB_VERSION`), JVM flags
(`JAVA_TOOL_OPTIONS`), etc. Defaults work out of the box.

## Database access

MariaDB data is persisted in `docker/mysql/` (gitignored). Connect with:

```bash
docker exec -it openboxes-db mysql -uopenboxes -popenboxes openboxes
```

Root password defaults to `root` (`MYSQL_ROOT_PASSWORD`).

## Resetting

```bash
cd docker
docker compose down
sudo rm -rf mysql/       # wipe the database volume
docker compose up -d     # re-runs migrations from scratch
```

## Gotchas

- **First boot is slow** — the Liquibase migration suite (700+ changesets)
  must complete before the login page responds. Don't restart the app
  container mid-migration.
- **Memory** — the JVM is capped at 1 GB heap by default; the app container
  needs ~1.5–2 GB total. Increase via `JAVA_TOOL_OPTIONS` in `docker/.env`
  if you see OOM kills.
- **No local Java toolchain needed for running** — the compose setup uses the
  released image. Building the WAR from source requires JDK 21
  (see `.github/workflows/backend-tests.yml` for the CI toolchain).
- **Demo-data loader needs internet** — the app fetches the demo CSVs from
  `raw.githubusercontent.com/openboxes/openboxes/develop/...` at import time.
- **Ports** — 8080 (app) and 80 (nginx) must be free on the host.
