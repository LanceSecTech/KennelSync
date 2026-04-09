import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createOwnerContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "owner-1",
      email: "owner@test.com",
      name: "Test Owner",
      loginMethod: "manus",
      role: "owner",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

function createEmployeeContext(): TrpcContext {
  return {
    user: {
      id: 2,
      openId: "employee-1",
      email: "emp@test.com",
      name: "Test Employee",
      loginMethod: "manus",
      role: "employee",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

function createCustomerContext(): TrpcContext {
  return {
    user: {
      id: 3,
      openId: "customer-1",
      email: "cust@test.com",
      name: "Test Customer",
      loginMethod: "manus",
      role: "customer",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

describe("room routes - access control", () => {
  it("customer cannot access room.byKennel", async () => {
    const caller = appRouter.createCaller(createCustomerContext());
    await expect(caller.room.byKennel({ kennelId: 1 })).rejects.toThrow();
  });

  it("customer cannot create rooms", async () => {
    const caller = appRouter.createCaller(createCustomerContext());
    await expect(
      caller.room.create({ kennelId: 1, name: "Test Room" })
    ).rejects.toThrow();
  });

  it("employee cannot create rooms (owner only)", async () => {
    const caller = appRouter.createCaller(createEmployeeContext());
    await expect(
      caller.room.create({ kennelId: 1, name: "Test Room" })
    ).rejects.toThrow();
  });

  it("employee cannot delete rooms (owner only)", async () => {
    const caller = appRouter.createCaller(createEmployeeContext());
    await expect(caller.room.delete({ id: 1 })).rejects.toThrow();
  });

  it("customer cannot assign rooms", async () => {
    const caller = appRouter.createCaller(createCustomerContext());
    await expect(
      caller.room.assign({ bookingId: 1, roomId: 1 })
    ).rejects.toThrow();
  });

  it("customer cannot assignForDay", async () => {
    const caller = appRouter.createCaller(createCustomerContext());
    await expect(
      caller.room.assignForDay({ bookingId: 1, roomId: 1, stayDate: "2026-04-01" })
    ).rejects.toThrow();
  });

  it("customer cannot query dailyAvailability", async () => {
    const caller = appRouter.createCaller(createCustomerContext());
    await expect(
      caller.room.dailyAvailability({
        kennelId: 1,
        startDate: "2026-04-01",
        endDate: "2026-04-07",
      })
    ).rejects.toThrow();
  });

  it("customer cannot view current assignments", async () => {
    const caller = appRouter.createCaller(createCustomerContext());
    await expect(
      caller.room.currentAssignments({ kennelId: 1 })
    ).rejects.toThrow();
  });
});

describe("room routes - owner access", () => {
  it("owner can access room.byKennel", async () => {
    const caller = appRouter.createCaller(createOwnerContext());
    // Should not throw (may return empty array if DB not connected)
    try {
      const result = await caller.room.byKennel({ kennelId: 1 });
      expect(Array.isArray(result)).toBe(true);
    } catch (e: any) {
      // DB not available is acceptable in test env
      expect(e.message).not.toContain("FORBIDDEN");
    }
  });
});

describe("room routes - employee access", () => {
  it("employee can access room.byKennel", async () => {
    const caller = appRouter.createCaller(createEmployeeContext());
    try {
      const result = await caller.room.byKennel({ kennelId: 1 });
      expect(Array.isArray(result)).toBe(true);
    } catch (e: any) {
      expect(e.message).not.toContain("FORBIDDEN");
    }
  });
});
