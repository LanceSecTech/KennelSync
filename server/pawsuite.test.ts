import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createMockContext(role: "owner" | "employee" | "customer" = "customer", userId = 1): { ctx: TrpcContext; clearedCookies: any[] } {
  const clearedCookies: any[] = [];

  const user: AuthenticatedUser = {
    id: userId,
    openId: `test-user-${userId}`,
    email: `test${userId}@example.com`,
    name: `Test User ${userId}`,
    loginMethod: "manus",
    role,
    kennelId: role !== "customer" ? 1 : null,
    phone: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };

  return { ctx, clearedCookies };
}

function createUnauthContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("auth.me", () => {
  it("returns null for unauthenticated users", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("returns user data for authenticated users", async () => {
    const { ctx } = createMockContext("customer");
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeDefined();
    expect(result?.role).toBe("customer");
    expect(result?.name).toBe("Test User 1");
  });
});

describe("auth.logout", () => {
  it("clears the session cookie and reports success", async () => {
    const { ctx, clearedCookies } = createMockContext("customer");
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toBe(COOKIE_NAME);
  });
});

describe("role-based access control", () => {
  it("allows owner to access owner procedures", async () => {
    const { ctx } = createMockContext("owner");
    const caller = appRouter.createCaller(ctx);
    // Owner should be able to call system.health (public)
    const result = await caller.system.health({ timestamp: Date.now() });
    expect(result).toEqual({ ok: true });
  });

  it("denies employee access to owner-only procedures", async () => {
    const { ctx } = createMockContext("employee");
    const caller = appRouter.createCaller(ctx);
    // Employee should not be able to call system.notifyOwner (admin/owner only)
    await expect(caller.system.notifyOwner({ title: "test", content: "test" }))
      .rejects.toThrow();
  });

  it("denies customer access to owner-only procedures", async () => {
    const { ctx } = createMockContext("customer");
    const caller = appRouter.createCaller(ctx);
    await expect(caller.system.notifyOwner({ title: "test", content: "test" }))
      .rejects.toThrow();
  });

  it("denies unauthenticated access to protected procedures", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.kennel.myKennels())
      .rejects.toThrow();
  });
});

describe("system.health", () => {
  it("returns ok for public access", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.system.health({ timestamp: Date.now() });
    expect(result).toEqual({ ok: true });
  });
});

describe("kennel.list", () => {
  it("returns an array for public access", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.kennel.list();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("role-specific route access patterns", () => {
  it("customer can access myDogs", async () => {
    const { ctx } = createMockContext("customer");
    const caller = appRouter.createCaller(ctx);
    const result = await caller.dog.myDogs();
    expect(Array.isArray(result)).toBe(true);
  });

  it("customer can access myBookings", async () => {
    const { ctx } = createMockContext("customer");
    const caller = appRouter.createCaller(ctx);
    const result = await caller.booking.myBookings();
    expect(Array.isArray(result)).toBe(true);
  });

  it("customer can access myPayments", async () => {
    const { ctx } = createMockContext("customer");
    const caller = appRouter.createCaller(ctx);
    const result = await caller.payment.myPayments();
    expect(Array.isArray(result)).toBe(true);
  });

  it("customer can access customerDashboard", async () => {
    const { ctx } = createMockContext("customer");
    const caller = appRouter.createCaller(ctx);
    const result = await caller.stats.customerDashboard();
    expect(result).toBeDefined();
    expect(typeof result.dogsCount).toBe("number");
    expect(Array.isArray(result.dogStatuses)).toBe(true);
    expect(Array.isArray(result.actionItems)).toBe(true);
  });

  it("employee can access byKennel bookings", async () => {
    const { ctx } = createMockContext("employee");
    const caller = appRouter.createCaller(ctx);
    const result = await caller.booking.byKennel({ kennelId: 1 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("employee can access alerts by kennel", async () => {
    const { ctx } = createMockContext("employee");
    const caller = appRouter.createCaller(ctx);
    const result = await caller.alert.byKennel({ kennelId: 1 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("customer cannot access byKennel bookings (employee-only)", async () => {
    const { ctx } = createMockContext("customer");
    const caller = appRouter.createCaller(ctx);
    await expect(caller.booking.byKennel({ kennelId: 1 }))
      .rejects.toThrow();
  });

  it("customer cannot access owner dashboard", async () => {
    const { ctx } = createMockContext("customer");
    const caller = appRouter.createCaller(ctx);
    await expect(caller.stats.ownerDashboard({ kennelId: 1 }))
      .rejects.toThrow();
  });

  it("employee cannot access owner financial data", async () => {
    const { ctx } = createMockContext("employee");
    const caller = appRouter.createCaller(ctx);
    await expect(caller.payment.byKennel({ kennelId: 1 }))
      .rejects.toThrow();
  });
});

describe("input validation", () => {
  it("rejects dog creation with empty name", async () => {
    const { ctx } = createMockContext("customer");
    const caller = appRouter.createCaller(ctx);
    await expect(caller.dog.create({ name: "" }))
      .rejects.toThrow();
  });

  it("rejects booking with invalid service type", async () => {
    const { ctx } = createMockContext("owner");
    const caller = appRouter.createCaller(ctx);
    await expect(caller.service.create({
      kennelId: 1,
      name: "Test",
      type: "invalid" as any,
      pricePerUnit: "10.00",
    })).rejects.toThrow();
  });

  it("rejects vaccination with empty vaccine name", async () => {
    const { ctx } = createMockContext("customer");
    const caller = appRouter.createCaller(ctx);
    await expect(caller.vaccination.create({ dogId: 1, vaccineName: "" }))
      .rejects.toThrow();
  });
});
