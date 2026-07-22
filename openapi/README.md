# OpenAPI Specs (Phase 3: REST layer formalization)

OpenAPI 3.0 specs that pin the **current** behavior of the OpenBoxes REST API
(`grails-app/controllers/**/*ApiController.groovy`), one spec file per
controller. Together with the contract tests under
[`characterization/contract/`](../characterization/contract) they extend the
migration parity oracle established by the snapshot suite under
[`characterization/api/`](../characterization/api).

**These specs are descriptive, not aspirational.** They document what the API
does today — including non-REST quirks (200-on-create, `{"data": null}` for
unknown ids, `text/html` bodies, POST-as-update) — so the migrated backend can
be verified against them. Do not "clean up" behavior in a spec; change the
spec only when the application behavior intentionally changes.

## Layout

```
openapi/
  README.md                 <- this file (conventions for all Phase 3 children)
  redocly.yaml              <- shared Redocly lint config
  components/
    common.yaml             <- shared components (see below)
  specs/
    api.yaml                       <- ApiController
    attribute-api.yaml             <- AttributeApiController
    bin-location-api.yaml          <- BinLocationApiController
    category-api.yaml              <- CategoryApiController
    combine-shipment-api.yaml      <- CombineShipmentApiController
    combined-shipment-item-api.yaml<- CombinedShipmentItemApiController
    ...one file per controller, added per Phase 3 child
```

## Conventions (follow these exactly)

### Spec files

- One file per controller under `specs/`, named after the controller in
  kebab-case with the `Controller` suffix dropped:
  `StockMovementApiController` -> `stock-movement-api.yaml`.
- OpenAPI **3.0.3**, YAML. `info.title`: `OpenBoxes - <ControllerName>`;
  `info.description` names the controller class and the URL mappings that
  route to it (see `grails-app/controllers/org/pih/warehouse/UrlMappings.groovy`);
  `info.version`: `0.1.0`.
- `servers`: single entry `http://localhost:8080/openboxes` (the Docker
  baseline from `docs/migration/RUNNING_LOCALLY.md`).
- Paths are the mapped URLs **without** the `/openboxes` context path, e.g.
  `/api/categories/{id}`.
- Every operation has an `operationId` (camelCase, unique within the file)
  and a `summary`. Document parity quirks in `description`.
- Global `security: [{cookieAuth: []}]`; override with `security: []` on the
  anonymous endpoints (`/api/login`, `/api/status`, ...). Each spec re-exports
  the scheme via
  `components.securitySchemes.cookieAuth -> $ref: '../components/common.yaml#/components/securitySchemes/cookieAuth'`
  (Redocly's `security-defined` rule requires a local entry).
- Schemas: pin what the controller actually renders. Use `required` only for
  keys that are always present, `nullable: true` liberally (Grails renders
  many nulls), and `additionalProperties: true` for default Grails domain
  renderings that are too large/unstable to enumerate. Derive shapes from the
  controller source and the committed snapshots in
  `characterization/api/snapshots/`.
- Error responses: reference the shared responses in `common.yaml`
  (`NotFound`, `Unauthorized`, `ValidationError`, `ServerError`). These match
  `ErrorsController`'s JSON bodies, which are returned when the request looks
  like AJAX/JSON (`Accept: application/json` — the contract client sends it).

### Shared components (`components/common.yaml`)

- `securitySchemes.cookieAuth` — the `JSESSIONID` session cookie scheme.
- `responses.NotFound/Unauthorized/ValidationError/ServerError` and
  `schemas.ErrorResponse/ValidationErrorResponse` — the common error shapes.
- `parameters.max/offset` — the standard pagination query params.
- `schemas.Id` — domain object ids (usually 32-char hex, not constrained).
- `schemas.Location/LocationType/Address/Person` — recurring default Grails
  renderings.
- Reference them with relative refs, e.g.
  `$ref: '../components/common.yaml#/components/schemas/Id'`.
- Add a component here only when 2+ controller specs need it; otherwise keep
  it in the controller spec's own `components`.

### Lint

```bash
npx --yes @redocly/cli@1.34.2 lint --config openapi/redocly.yaml 'openapi/specs/*.yaml' openapi/components/common.yaml
```

Extends the `recommended` ruleset; `info-license`, `no-unused-components`
and `operation-4xx-response` are off (see `redocly.yaml` for why). Lint must
pass with **zero errors and zero warnings** (CI runs it, see below).

### Contract tests (`characterization/contract/`)

Pytest suite that performs real requests against the seeded Docker instance
and validates each response against the specs: status declared, content type
declared, JSON body conforms to the schema (`oas.py` is the tiny validator;
OpenAPI 3.0 dialect via `openapi-schema-validator`, cross-file refs
supported).

- One test module per controller: `test_<spec-name-underscored>_contract.py`
  (e.g. `test_category_api_contract.py`).
- Load the spec once per module: `spec = Spec("category-api.yaml")`.
- Use the `check()` helper for each request:
  `check(client, spec, "GET", "/api/categories/{id}", path=f"/api/categories/{cid}")`
  — `path_template` must match the spec path; `path` is the concrete URL
  (omit it when the template has no placeholders). Extra kwargs go to
  `requests` (`json=`, `params=`).
- The `client` fixture reuses `characterization/api/obx.py` (login as
  admin/password, choose Main Warehouse) and sends
  `Accept: application/json` so error responses arrive as JSON.
- Resolve seeded records by stable natural keys (names/codes), never by
  generated ids — same rule as the snapshot suite.
- Write flows must create dedicated `ZZ Contract ...`-named records and
  delete them (with leftover cleanup), so the suite is re-runnable.
- Exercise every operation you spec'd where practical, including error
  branches (unknown ids etc.). Skip only operations that need fixtures the
  demo dataset cannot provide (e.g. multipart imports); still spec them.

Run locally (app must be up and seeded, see
`docs/migration/RUNNING_LOCALLY.md`):

```bash
./characterization/contract/run.sh          # whole suite
./characterization/contract/run.sh -k category
```

Config via `OB_BASE_URL` / `OB_USERNAME` / `OB_PASSWORD` (same defaults as
the snapshot suite).

## CI

`.github/workflows/characterization-tests.yml` (called from
`test-pull-request.yml`):

- `openapi-lint` job — Redocly lint over all specs (no Docker needed).
- `api-snapshot-tests` job — boots the Docker baseline, seeds demo data, runs
  the snapshot suite **and then the contract suite** against the same
  instance.

When you add a new spec + tests, no workflow changes are needed — the lint
glob and the pytest discovery pick them up automatically.
