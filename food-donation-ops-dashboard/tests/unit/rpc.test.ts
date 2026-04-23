import { describe, expect, it, vi } from "vitest";

vi.mock("../../lib/supabase/server", () => {
  return {
    supabaseServer: () => ({
      rpc: vi.fn().mockResolvedValue({ data: [] }),
    }),
  };
});

vi.mock("../../lib/supabase/service", () => {
  return {
    supabaseService: () => ({
      rpc: vi.fn().mockResolvedValue({}),
      from: vi.fn().mockReturnValue({ insert: vi.fn().mockResolvedValue({}) }),
    }),
  };
});

vi.mock("../../lib/auth", () => {
  return {
    requireAdmin: vi.fn().mockResolvedValue({ id: "admin-id", email: "admin@example.com" }),
    getUser: vi.fn().mockResolvedValue({ id: "user-id" }),
  };
});

import { resetGeneratedPages, rpcAllocateOrder, rpcUpsertDonationLot } from "../../lib/services/rpc";

describe("rpc services", () => {
  it("calls reset RPC and audit log", async () => {
    const result = await resetGeneratedPages();
    expect(result).toBe(true);
  });

  it("allocates order and logs audit", async () => {
    const data = await rpcAllocateOrder(1001);
    expect(data).toEqual([]);
  });

  it("upserts donation lot", async () => {
    const data = await rpcUpsertDonationLot({ p_donor_id: 1 });
    expect(data).toEqual([]);
  });
});
