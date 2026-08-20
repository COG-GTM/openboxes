# Prompt: UI spec as a `spec.md` in the repo

Feature chosen so it is UI-only and rides on what Acts 1–4 already built: an **"Overdue inbound" card on the warehouse dashboard**, fed by the `GET /api/shipments/exceptions/overdue` endpoint that already exists on `spec-demo-base`. No new backend query, no schema change — so the whole spec is about UI behaviour, which is what makes it a *different* kind of spec from the OpenAPI one.

Why it is grounded (verified in the repo, useful if someone challenges it):

- The dashboard already renders configurable widgets: `src/js/components/dashboard/Dashboard.jsx` with `NumberCard.jsx`, `GraphCard.jsx`, `TableCard.jsx`, `NumbersTableCard.jsx`.
- Widgets are declared in config, not hardcoded: `grails-app/conf/runtime.groovy` → `openboxes.dashboardConfig`, where e.g. `delayedShipments` declares `enabled`, `title`, `info`, `graphType = "numberTable"`, `type = 'graph'`, `endpoint = "/api/dashboard/delayedShipments"`, and dashboards list widgets by `widgetId` + `order`.
- Titles/info come from `react.dashboard.*.label` keys in `grails-app/i18n/messages*.properties`.
- Cards are user-rearrangeable (`react-sortable-hoc`, `DragHandle.jsx`) and per-user layout is persisted (`UserService.getDashboardConfig`).

---

## The prompt to paste (short version — this is the one for stage)

> Write a UI spec at `specs/ui/overdue-inbound-dashboard-card.spec.md` for an "Overdue inbound" card on the warehouse dashboard, backed by the existing `GET /api/shipments/exceptions/overdue`. Follow the conventions of the existing dashboard widgets in `openboxes.dashboardConfig` and `src/js/components/dashboard/`, cover empty/loading/error and permission states, and end with numbered acceptance criteria. Do not implement anything yet.

That is deliberately short: the point on stage is that the *human* input is small and the spec Devin returns is long, specific, and reviewable.

---

## The prompt to paste (fuller version — use this if you want a more predictable output)

> Write a UI specification, no implementation, at `specs/ui/overdue-inbound-dashboard-card.spec.md`.
>
> **Feature:** an "Overdue inbound" card on the warehouse dashboard so a warehouse manager sees overdue inbound shipments without navigating to a list page. It is backed by the endpoint that already exists on this branch, `GET /api/shipments/exceptions/overdue` — read `openapi/specs/shipment-exceptions-api.yaml` and its acceptance-criteria doc first and treat them as the source of truth for the data. Do not add a backend query, a domain change, or a migration.
>
> **Ground it in this repo's conventions before you write anything:** how widgets are declared in `openboxes.dashboardConfig` in `grails-app/conf/runtime.groovy` (`enabled`, `title`, `info`, `type`, `graphType`, `endpoint`, and how a dashboard lists `widgetId` + `order`), how the card components in `src/js/components/dashboard/` differ (`NumberCard`, `TableCard`, `NumbersTableCard`, `GraphCard`), how titles and info tooltips resolve to `react.dashboard.*` keys in `grails-app/i18n/messages.properties`, and how per-user card layout is persisted via `UserService.getDashboardConfig`. Recommend which existing card type to reuse and say why; if none fits, say what is missing rather than inventing a component.
>
> **The spec must cover:** what the card shows and in what order; how it scopes to the current location; the loading, empty, error and no-permission states, each described as what the user actually sees; what clicking the card or a row does; whether it participates in drag-to-reorder and the dashboard time filter; every new i18n key; and how it behaves on the mobile/narrow layout.
>
> **End with numbered, testable acceptance criteria** in the style of `openapi/specs/shipment-exceptions-acceptance-criteria.md` — each one something a Playwright test under `characterization/tests/` could assert. List anything you could not determine from the code as an open question for me to answer, rather than choosing for me.

---

## Why this works as the next demo beat

- It is the same workflow on a **different artefact type**: an OpenAPI contract is machine-checkable, a UI spec is not — so the review beat carries more weight, and the acceptance criteria are what make it verifiable at all (Playwright under `characterization/tests/`, which the repo already has).
- The "list anything you could not determine as an open question" clause is what produces the review conversation on stage. In Act 1 that clause is what surfaced the five contract questions; expect the same here (which location scope, what the row click does, whether it respects the time filter).
- It stays UI-only, so it can be specced live without touching the backend that Acts 2–4 already proved.

**One decision for you:** the prompt puts the file at `specs/ui/overdue-inbound-dashboard-card.spec.md`. If you want the plainer story — "the spec lives at the root of the repo" — change that path to `spec.md` in the prompt; nothing else changes. A per-feature path scales better if you run this demo more than once on the same repo.
