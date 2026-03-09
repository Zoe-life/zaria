/**
 * Data Integrity & Race Conditions fixture — Phase 8.
 * Intentionally contains seeded issues that INT001–INT004 should detect.
 */

import express from 'express';

const app = express();
app.use(express.json());

const db = {
  findOne: (opts: Record<string, unknown>) => opts,
  create: (data: Record<string, unknown>) => data,
  update: (id: string, data: Record<string, unknown>) => ({ id, ...data }),
  save: (data: Record<string, unknown>) => data,
};

// ---------------------------------------------------------------------------
// INT001 — Route handler reads req.body without validation middleware
// ---------------------------------------------------------------------------

app.post('/users', (req, res) => {
  // INT001: req.body accessed with no validation (no Joi, Zod, express-validator, etc.)
  const { name, email } = req.body as { name: string; email: string };
  const user = db.create({ name, email });
  res.json(user);
});

app.put('/users/:id', (req, res) => {
  // INT001: req.body and req.params accessed without validation
  const { id } = req.params;
  const updates = req.body as Record<string, unknown>;
  const user = db.update(id, updates);
  res.json(user);
});

// ---------------------------------------------------------------------------
// INT002 — Multiple ORM writes without a transaction boundary
// ---------------------------------------------------------------------------

export async function transferFunds(fromId: string, toId: string, amount: number): Promise<void> {
  // INT002: two writes, no wrapping tx — risk of partial failure
  db.update(fromId, { balance: -amount });
  db.update(toId, { balance: amount });
}

export async function createOrderWithItems(
  orderData: Record<string, unknown>,
  items: Array<Record<string, unknown>>,
): Promise<void> {
  // INT002: multiple writes — no tx boundary
  const order = db.create(orderData);
  for (const item of items) {
    db.create({ ...item, orderId: (order as Record<string, unknown>)['id'] });
  }
}

// ---------------------------------------------------------------------------
// INT003 — TOCTOU: check-then-act on file system without atomicity
// ---------------------------------------------------------------------------

import { existsSync, writeFileSync } from 'fs';

export function saveConfigFile(path: string, content: string): void {
  // INT003: check-then-act — another process could create the file between check and write
  if (!existsSync(path)) {
    writeFileSync(path, content); // Non-atomic: race window between check and write
  }
}

export async function registerUsername(username: string): Promise<boolean> {
  // INT003: check-then-act on database without atomic operation
  const existing = db.findOne({ username });
  if (!existing) {
    db.create({ username }); // Race: another request could create the same username
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// INT004 — POST handler that does not check for existing resource
// ---------------------------------------------------------------------------

app.post('/products', (req, res) => {
  // INT004: creates without checking if product already exists (non-idempotent)
  const product = db.create(req.body as Record<string, unknown>);
  res.status(201).json(product);
});

app.post('/subscriptions', (req, res) => {
  // INT004: no existence check before creating subscription
  const sub = db.save(req.body as Record<string, unknown>);
  res.status(201).json(sub);
});

export { app };
