/**
 * Seeded-data constants shared by all characterization flows.
 *
 * Assumptions: the instance was booted from docker/docker-compose.yml and the
 * demo dataset was loaded once via docker/load-demo-data.sh (which hits
 * GET /api/config/data/demo as admin). Product *codes* are randomly generated
 * at import time, so tests always reference products by NAME (stable across
 * fresh databases), never by code.
 */
export const BASE_URL = process.env.OPENBOXES_BASE_URL ?? 'http://localhost:8080/openboxes';

/** Resolves an app-relative path (e.g. `/auth/login`) against the base URL, keeping its context path. */
export const url = (path: string): string => `${BASE_URL.replace(/\/$/, '')}${path}`;

export const ADMIN = { username: 'admin', password: 'password' } as const;

export const LOCATIONS = {
  /** Depot the suite logs into; id 1 is created by the install migrations. */
  mainWarehouse: { id: '1', name: 'Main Warehouse' },
  /** Demo depot used as an outbound destination. */
  bostonWarehouse: { name: 'Boston Warehouse' },
  /** Demo supplier used as the inbound origin. */
  mainSupplier: { name: 'Main Supplier' },
} as const;

export const PRODUCTS = {
  /** Demo product (lot & expiry controlled). Referenced by name, not code. */
  lamivudine: { name: 'Lamivudine 150mg tablet' },
} as const;

/** MM/DD/YYYY, as expected by the app's date pickers. */
export function formatDate(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${mm}/${dd}/${date.getFullYear()}`;
}

export const today = () => formatDate(new Date());

/** Unique-per-run suffix so repeated runs never collide on lot numbers etc. */
export const runId = () => `${Date.now()}`;
