/**
 * Scalability & Observability fixture — Phase 7.
 * Intentionally contains seeded issues that SCALE001–SCALE004 should detect.
 */

import express from 'express';

// ---------------------------------------------------------------------------
// SCALE001 — console.log used instead of a structured logger
// ---------------------------------------------------------------------------

export function processOrder(orderId: string): void {
  console.log(`Processing order ${orderId}`); // SCALE001: raw console.log
  console.log('Order processed successfully'); // SCALE001: raw console.log
}

// ---------------------------------------------------------------------------
// SCALE002 — ORM query without .limit() / .take()
// ---------------------------------------------------------------------------

const db = {
  find: (opts?: Record<string, unknown>) => opts,
  findAll: () => [],
  findMany: () => [],
};

export function getAllUsers(): unknown {
  return db.findAll(); // SCALE002: unbounded — no pagination applied
}

export function searchProducts(term: string): unknown {
  void term;
  return db.findMany({ where: { name: term } }); // SCALE002: unbounded query
}

// ---------------------------------------------------------------------------
// SCALE003 — module-level mutable state (prevents horizontal scaling)
// ---------------------------------------------------------------------------

export const requestCount = { value: 0 }; // SCALE003: mutable singleton

let activeConnections = 0; // SCALE003: module-level mutable var

export function incrementCounter(): void {
  requestCount.value += 1;
  activeConnections += 1;
}

// ---------------------------------------------------------------------------
// SCALE004 — Express app without /health or /healthz route
// ---------------------------------------------------------------------------

const app = express();

app.get('/users', (_req, res) => {
  res.json([]);
});

app.post('/orders', (_req, res) => {
  res.json({ ok: true });
});

// No /health or /healthz route defined — SCALE004

export { app };
