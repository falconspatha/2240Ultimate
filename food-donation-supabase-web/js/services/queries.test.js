/**
 * Property-based tests for js/services/queries.js
 * Framework: Vitest + fast-check
 *
 * To run:
 *   npm install -D vitest fast-check
 *   npx vitest run js/services/queries.test.js
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  withMultiSearch,
  withFilters,
  withSort,
  withDateRange,
} from "./queries.js";

// ---------------------------------------------------------------------------
// Minimal mock query builder — records chained calls for assertion
// ---------------------------------------------------------------------------
function mockQuery() {
  const calls = [];
  const proxy = new Proxy(
    {},
    {
      get(_, method) {
        return (...args) => {
          calls.push({ method, args });
          return proxy; // chainable
        };
      },
    },
  );
  proxy._calls = calls;
  return proxy;
}

// ---------------------------------------------------------------------------
// Property 1 & 2: withMultiSearch
// Feature: enhanced-query, Property 1: Multi-column search completeness and soundness
// Feature: enhanced-query, Property 2: Search clear restores full result set
// ---------------------------------------------------------------------------
describe("withMultiSearch", () => {
  // Property 1: non-empty search term produces an .or() call with all columns
  // Validates: Requirements 1.1, 1.2
  it("Property 1 — non-empty search applies OR ilike across all columns", () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 20 }).filter((s) => /^[A-Za-z_]+$/.test(s)), {
          minLength: 1,
          maxLength: 5,
        }),
        fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0),
        (columns, search) => {
          const q = mockQuery();
          const result = withMultiSearch(q, columns, search);
          const orCall = q._calls.find((c) => c.method === "or");
          // Must have called .or()
          expect(orCall).toBeDefined();
          // The OR clause must reference every column
          const orArg = orCall.args[0];
          for (const col of columns) {
            expect(orArg).toContain(col);
          }
          // The search term (trimmed) must appear in the clause
          expect(orArg).toContain(search.trim());
        },
      ),
      { numRuns: 100 },
    );
  });

  // Property 2: empty / whitespace search is a no-op
  // Validates: Requirements 1.3, 6.3
  it("Property 2 — empty or whitespace search returns query unchanged", () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 5 }),
        fc.oneof(
          fc.constant(""),
          fc.constant("   "),
          fc.string({ maxLength: 10 }).map((s) => s.replace(/\S/g, " ")), // all-whitespace
        ),
        (columns, emptySearch) => {
          const q = mockQuery();
          withMultiSearch(q, columns, emptySearch);
          // No calls should have been made on the query
          expect(q._calls.length).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 4: withFilters
// Feature: enhanced-query, Property 4: withFilters applies all non-empty conditions with AND logic
// ---------------------------------------------------------------------------
describe("withFilters", () => {
  // Validates: Requirements 4.1, 4.2, 4.5, 5.2
  it("Property 4 — every non-empty filter entry produces an .eq() call", () => {
    fc.assert(
      fc.property(
        fc.dictionary(
          fc.string({ minLength: 1, maxLength: 15 }).filter((s) => /^[A-Za-z_]+$/.test(s)),
          fc.oneof(
            fc.string({ minLength: 1, maxLength: 20 }), // non-empty
            fc.constant(""), // empty — should be skipped
            fc.constant(null), // null — should be skipped
          ),
        ),
        (filters) => {
          const q = mockQuery();
          withFilters(q, filters);
          const eqCalls = q._calls.filter((c) => c.method === "eq");
          const nonEmptyEntries = Object.entries(filters).filter(([, v]) => {
            const s = v == null ? "" : String(v).trim();
            return s !== "";
          });
          // Number of .eq() calls must equal number of non-empty entries
          expect(eqCalls.length).toBe(nonEmptyEntries.length);
          // Each non-empty entry must appear as an .eq() call
          for (const [col, val] of nonEmptyEntries) {
            const found = eqCalls.some((c) => c.args[0] === col && c.args[1] === String(val).trim());
            expect(found).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("Property 4 — empty filters object produces no .eq() calls", () => {
    const q = mockQuery();
    withFilters(q, {});
    expect(q._calls.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Property 5: withDateRange
// Feature: enhanced-query, Property 5: withDateRange bounds correctness
// ---------------------------------------------------------------------------
describe("withDateRange", () => {
  const isoDate = () =>
    fc.date({ min: new Date("2020-01-01"), max: new Date("2030-12-31") }).map((d) => d.toISOString().slice(0, 10));

  // Validates: Requirements 4.3, 5.4
  it("Property 5 — both from and to produce .gte() and .lte() calls", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter((s) => /^[A-Za-z_]+$/.test(s)),
        isoDate(),
        isoDate(),
        (column, from, to) => {
          const q = mockQuery();
          withDateRange(q, column, from, to);
          const methods = q._calls.map((c) => c.method);
          expect(methods).toContain("gte");
          expect(methods).toContain("lte");
          const gteCall = q._calls.find((c) => c.method === "gte");
          const lteCall = q._calls.find((c) => c.method === "lte");
          expect(gteCall.args).toEqual([column, from]);
          expect(lteCall.args).toEqual([column, to]);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("Property 5 — only from produces .gte() but no .lte()", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter((s) => /^[A-Za-z_]+$/.test(s)),
        isoDate(),
        (column, from) => {
          const q = mockQuery();
          withDateRange(q, column, from, null);
          const methods = q._calls.map((c) => c.method);
          expect(methods).toContain("gte");
          expect(methods).not.toContain("lte");
        },
      ),
      { numRuns: 100 },
    );
  });

  it("Property 5 — only to produces .lte() but no .gte()", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter((s) => /^[A-Za-z_]+$/.test(s)),
        isoDate(),
        (column, to) => {
          const q = mockQuery();
          withDateRange(q, column, null, to);
          const methods = q._calls.map((c) => c.method);
          expect(methods).not.toContain("gte");
          expect(methods).toContain("lte");
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 6: all utility functions are identity on empty inputs
// Feature: enhanced-query, Property 6: Utility functions are identity on empty inputs
// ---------------------------------------------------------------------------
describe("identity on empty inputs", () => {
  // Validates: Requirements 5.5
  it("Property 6 — withMultiSearch with empty string makes no calls", () => {
    const q = mockQuery();
    withMultiSearch(q, ["Col1", "Col2"], "");
    expect(q._calls.length).toBe(0);
  });

  it("Property 6 — withMultiSearch with whitespace-only makes no calls", () => {
    const q = mockQuery();
    withMultiSearch(q, ["Col1"], "   ");
    expect(q._calls.length).toBe(0);
  });

  it("Property 6 — withFilters with empty object makes no calls", () => {
    const q = mockQuery();
    withFilters(q, {});
    expect(q._calls.length).toBe(0);
  });

  it("Property 6 — withFilters with all-empty values makes no calls", () => {
    const q = mockQuery();
    withFilters(q, { Status: "", Priority: null });
    expect(q._calls.length).toBe(0);
  });

  it("Property 6 — withSort with null column makes no calls", () => {
    const q = mockQuery();
    withSort(q, null, "asc");
    expect(q._calls.length).toBe(0);
  });

  it("Property 6 — withDateRange with null from and to makes no calls", () => {
    const q = mockQuery();
    withDateRange(q, "ReceivedDate", null, null);
    expect(q._calls.length).toBe(0);
  });

  it("Property 6 — withMultiSearch with empty columns array makes no calls", () => {
    const q = mockQuery();
    withMultiSearch(q, [], "hello");
    expect(q._calls.length).toBe(0);
  });
});
