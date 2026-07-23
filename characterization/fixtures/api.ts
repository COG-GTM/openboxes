import { APIRequestContext, expect, request as playwrightRequest } from '@playwright/test';
import { ADMIN, BASE_URL, LOCATIONS, url } from './constants';

/**
 * API helpers used to (a) assert on persisted outcomes and (b) set up
 * prerequisite records (purchase order + shipment) for the invoice flow.
 * Setup goes through the same HTTP endpoints the legacy UI uses, so it
 * exercises real application behavior rather than writing to the DB.
 */

/** Opens an authenticated API session (login + choose location), independent of the browser page. */
export async function newApiSession(
  username: string,
  password: string,
  locationId: string = LOCATIONS.mainWarehouse.id,
): Promise<APIRequestContext> {
  const ctx = await playwrightRequest.newContext({ baseURL: BASE_URL });
  const loginRes = await ctx.post(url('/auth/handleLogin'), {
    form: { username, password },
    maxRedirects: 0,
  });
  const redirect = loginRes.headers()['location'] ?? '';
  expect(
    loginRes.status() === 302 && !redirect.includes('/auth/login'),
    `login as ${username} should succeed`,
  ).toBeTruthy();
  const session = await ctx.get(url(`/dashboard/chooseLocation/${locationId}`));
  expect(session.ok()).toBeTruthy();
  return ctx;
}

/** True when the given credentials can authenticate (login redirects to the dashboard, not back to /auth/login). */
export async function canAuthenticate(username: string, password: string): Promise<boolean> {
  const ctx = await playwrightRequest.newContext({ baseURL: BASE_URL });
  try {
    const res = await ctx.post(url('/auth/handleLogin'), {
      form: { username, password },
      maxRedirects: 0,
    });
    const location = res.headers()['location'] ?? '';
    return res.status() === 302 && !location.includes('/auth/login');
  } finally {
    await ctx.dispose();
  }
}

/**
 * The demo dataset seeds the invoice-enabled users (superuser, accountant) as
 * INACTIVE. Activates the given user through the admin user-management screen
 * so the invoice flow can log in. Idempotent: skipped when login already works.
 */
export async function ensureUserActive(username: string, password: string): Promise<void> {
  if (await canAuthenticate(username, password)) {
    return;
  }
  const admin = await newApiSession(ADMIN.username, ADMIN.password);
  try {
    // The user list is a React screen backed by the /api/users/list endpoint.
    // The baseline (released) image predates that endpoint, so fall back to
    // scraping the legacy GSP user list there.
    const listRes = await admin.get(url(`/api/users/list?q=${username}`));
    if (listRes.status() === 200) {
      const users = (await listRes.json()).data as Array<{ id: string; username: string }>;
      const user = users.find((u) => u.username === username);
      expect(user, `user ${username} should exist in the demo dataset`).toBeTruthy();
      const res = await admin.put(url(`/api/users/${user!.id}`), {
        data: { active: true },
      });
      expect(res.ok()).toBeTruthy();
    } else {
      const listHtml = await (await admin.get(url(`/user/list?q=${username}`))).text();
      // The list row links the user's edit page with the username as link text
      // (the page also links the *current* user's edit page in the navbar).
      const match = listHtml.match(
        new RegExp(`/user/(?:show|edit)/([0-9a-f]+)"[^>]*>\\s*${username}\\b`),
      );
      expect(match, `user ${username} should exist in the demo dataset`).toBeTruthy();
      const userId = match![1];
      const res = await admin.post(url('/user/update'), {
        form: { id: userId, active: 'on' },
      });
      expect(res.ok()).toBeTruthy();
    }
  } finally {
    await admin.dispose();
  }
  expect(await canAuthenticate(username, password)).toBeTruthy();
}

/** Finds a product id by exact name (product codes are randomly generated at import time). */
export async function findProductId(ctx: APIRequestContext, name: string): Promise<string> {
  const res = await ctx.get(url(`/api/products?q=${encodeURIComponent(name)}`));
  expect(res.status()).toBe(200);
  const products = (await res.json()).data as Array<{ id: string; name: string }>;
  const product = products.find((p) => p.name === name);
  expect(product, `demo product "${name}" should exist`).toBeTruthy();
  return product!.id;
}

/** Finds the supplier location id by name (used as purchase-order origin). */
export async function findSupplierLocationId(ctx: APIRequestContext, name: string): Promise<string> {
  const res = await ctx.get(url('/api/locations?locationTypeCode=SUPPLIER&max=100'));
  expect(res.status()).toBe(200);
  const locations = (await res.json()).data as Array<{ id: string; name: string }>;
  const location = locations.find((l) => l.name === name);
  expect(location, `demo supplier "${name}" should exist`).toBeTruthy();
  return location!.id;
}

/** Returns the id of the currently logged-in user. */
export async function currentUserId(ctx: APIRequestContext): Promise<string> {
  const res = await ctx.get(url('/api/getAppContext'));
  expect(res.status()).toBe(200);
  return (await res.json()).data.user.id;
}

export interface ShippedOrder {
  orderId: string;
  orderNumber: string;
  shipmentNumber: string;
}

/**
 * Creates a purchase order with one line item, places it, and ships it via a
 * combined (order-based) shipment — the prerequisite for a shipment item to
 * become an invoice item candidate. Mirrors exactly the requests the legacy
 * PO wizard and the React "Ship from PO" wizard issue.
 */
export async function createShippedPurchaseOrder(
  ctx: APIRequestContext,
  options: {
    description: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    supplierName?: string;
  },
): Promise<ShippedOrder> {
  const supplierId = await findSupplierLocationId(ctx, options.supplierName ?? LOCATIONS.mainSupplier.name);
  const productId = await findProductId(ctx, options.productName);
  const orderedById = await currentUserId(ctx);
  const now = new Date();
  const dateOrdered = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`;

  // Step 1: order header (redirects to addItems/<orderId> on success).
  const headerRes = await ctx.post(url('/purchaseOrder/saveOrderDetails'), {
    form: {
      'order.id': '',
      'orderType.id': 'PURCHASE_ORDER',
      name: options.description,
      'origin.id': supplierId,
      'destination.id': LOCATIONS.mainWarehouse.id,
      'destinationParty.id': LOCATIONS.mainWarehouse.organizationId,
      'orderedBy.id': orderedById,
      dateOrdered,
      currencyCode: 'USD',
    },
    maxRedirects: 0,
  });
  expect(headerRes.status()).toBe(302);
  const orderId = headerRes.headers()['location'].match(/addItems\/([0-9a-f]+)/)![1];

  // Step 2: line item.
  const itemRes = await ctx.post(url('/order/saveOrderItem'), {
    form: {
      'order.id': orderId,
      'orderItem.id': '',
      'product.id': productId,
      quantity: String(options.quantity),
      quantityPerUom: '1',
      unitPrice: String(options.unitPrice),
    },
  });
  expect(itemRes.status()).toBe(200);

  // Step 3: place the order (PENDING -> PLACED).
  const placeRes = await ctx.get(url(`/order/placeOrder/${orderId}`), { maxRedirects: 0 });
  expect(placeRes.status()).toBe(302);

  // Step 4: combined shipment from the PO.
  const smRes = await ctx.post(url('/api/stockMovements/createCombinedShipments'), {
    data: {
      description: `${options.description} shipment`,
      origin: { id: supplierId },
      destination: { id: LOCATIONS.mainWarehouse.id },
    },
  });
  expect(smRes.ok()).toBeTruthy();
  const stockMovementId = (await smRes.json()).data.id as string;

  const orderItemsRes = await ctx.post(url('/api/combinedShipmentItems/findOrderItems'), {
    data: { orderIds: [orderId] },
  });
  expect(orderItemsRes.status()).toBe(200);
  const orderItems = (await orderItemsRes.json()).orderItems as Array<{
    orderItemId: string;
    orderNumber: string;
    quantityAvailable: number;
  }>;
  expect(orderItems.length).toBe(1);
  const orderNumber = orderItems[0].orderNumber;

  const addRes = await ctx.post(url(`/api/combinedShipmentItems/addToShipment/${stockMovementId}`), {
    data: {
      itemsToAdd: [
        {
          orderItemId: orderItems[0].orderItemId,
          quantityToShip: options.quantity,
          sortOrder: 100,
        },
      ],
    },
  });
  expect(addRes.status()).toBe(200);

  // Step 5: issue the shipment (marks the shipment items as shipped).
  const statusRes = await ctx.post(url(`/api/stockMovements/${stockMovementId}/status`), {
    data: { status: 'ISSUED' },
  });
  expect(statusRes.status()).toBe(200);

  const smReadRes = await ctx.get(url(`/api/stockMovements/${stockMovementId}`));
  expect(smReadRes.status()).toBe(200);
  const sm = (await smReadRes.json()).data;
  expect(sm.statusCode).toBe('ISSUED');

  return { orderId, orderNumber, shipmentNumber: sm.identifier };
}
