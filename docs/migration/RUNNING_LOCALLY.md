# Running OpenBoxes Locally (Docker)

Verified baseline environment for the modernization program (Phase 0.1).
Boots the released OpenBoxes app image (`ghcr.io/openboxes/openboxes:latest`,
Grails 3.3.16 / Java 8) against a containerized MariaDB 10 database, fronted
by nginx.

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
- **No local Java 8 needed for running** — the compose setup uses the
  released image. Building the WAR from source *does* require JDK 8
  (see `.github/workflows/backend-tests.yml` for the CI toolchain).
- **Demo-data loader needs internet** — the app fetches the demo CSVs from
  `raw.githubusercontent.com/openboxes/openboxes/develop/...` at import time.
- **Ports** — 8080 (app) and 80 (nginx) must be free on the host.
