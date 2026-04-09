import { describe, it, expect, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createMockContext(role: "owner" | "employee" | "customer" = "owner", userId = 1): TrpcContext {
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
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      cookie: vi.fn(),
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

// Mock db module - all data must be inline since vi.mock is hoisted
vi.mock(import("./db"), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getCheckoutAddOnsByKennel: vi.fn().mockResolvedValue([
      { id: 1, kennelId: 1, name: "Bath", price: "25.00", isActive: true, createdAt: new Date() },
      { id: 2, kennelId: 1, name: "Nail Trim", price: "15.00", isActive: true, createdAt: new Date() },
      { id: 3, kennelId: 1, name: "Teeth Cleaning", price: "30.00", isActive: false, createdAt: new Date() },
    ]),
    getActiveCheckoutAddOnsByKennel: vi.fn().mockResolvedValue([
      { id: 1, kennelId: 1, name: "Bath", price: "25.00", isActive: true, createdAt: new Date() },
      { id: 2, kennelId: 1, name: "Nail Trim", price: "15.00", isActive: true, createdAt: new Date() },
    ]),
    createCheckoutAddOn: vi.fn().mockResolvedValue(4),
    updateCheckoutAddOn: vi.fn().mockResolvedValue(undefined),
    deleteCheckoutAddOn: vi.fn().mockResolvedValue(undefined),
    getBookingAddOns: vi.fn().mockResolvedValue([
      { id: 1, bookingId: 100, addOnId: 1, dogId: null, price: "25.00", completed: false, createdAt: new Date() },
      { id: 2, bookingId: 100, addOnId: 2, dogId: null, price: "15.00", completed: true, createdAt: new Date() },
    ]),
    getBookingAddOnsByKennel: vi.fn().mockResolvedValue([
      { id: 1, bookingId: 100, addOnId: 1, dogId: null, price: "25.00", completed: false, createdAt: new Date(), checkOutDate: new Date(), bookingStatus: "checked_in" },
      { id: 2, bookingId: 100, addOnId: 2, dogId: null, price: "15.00", completed: true, createdAt: new Date(), checkOutDate: new Date(), bookingStatus: "checked_in" },
    ]),
    addBookingAddOn: vi.fn().mockResolvedValue(3),
    updateBookingAddOn: vi.fn().mockResolvedValue(undefined),
    deleteBookingAddOn: vi.fn().mockResolvedValue(undefined),
    getUserByOpenId: vi.fn().mockResolvedValue({ id: 1, openId: "test", role: "owner", name: "Test" }),
    getKennelsByOwner: vi.fn().mockResolvedValue([{ id: 1, ownerId: 1, name: "Test Kennel" }]),
    getBookingById: vi.fn().mockResolvedValue({ id: 100, kennelId: 1, status: "checked_in" }),
  };
});

describe("Checkout Add-Ons", () => {
  describe("Owner add-on management", () => {
    it("lists all add-ons for a kennel", async () => {
      const ctx = createMockContext("owner");
      const caller = appRouter.createCaller(ctx);
      const result = await caller.addOn.listByKennel({ kennelId: 1 });
      expect(result).toHaveLength(3);
      expect(result[0].name).toBe("Bath");
    });

    it("lists only active add-ons", async () => {
      const ctx = createMockContext("owner");
      const caller = appRouter.createCaller(ctx);
      const result = await caller.addOn.activeByKennel({ kennelId: 1 });
      expect(result).toHaveLength(2);
      expect(result.every((a: any) => a.isActive)).toBe(true);
    });

    it("creates a new add-on", async () => {
      const ctx = createMockContext("owner");
      const caller = appRouter.createCaller(ctx);
      const result = await caller.addOn.create({
        kennelId: 1,
        name: "De-shedding Treatment",
        price: 35,
      });
      expect(result.id).toBe(4);
    });

    it("updates an add-on", async () => {
      const ctx = createMockContext("owner");
      const caller = appRouter.createCaller(ctx);
      const result = await caller.addOn.update({
        id: 1,
        name: "Full Bath & Dry",
        price: 30,
      });
      expect(result.success).toBe(true);
    });

    it("toggles add-on active status", async () => {
      const ctx = createMockContext("owner");
      const caller = appRouter.createCaller(ctx);
      const result = await caller.addOn.update({
        id: 3,
        isActive: true,
      });
      expect(result.success).toBe(true);
    });

    it("deletes an add-on", async () => {
      const ctx = createMockContext("owner");
      const caller = appRouter.createCaller(ctx);
      const result = await caller.addOn.delete({ id: 3 });
      expect(result.success).toBe(true);
    });
  });

  describe("Employee booking add-ons", () => {
    it("adds an add-on to a booking", async () => {
      const ctx = createMockContext("employee", 2);
      const caller = appRouter.createCaller(ctx);
      const result = await caller.addOn.addToBooking({
        bookingId: 100,
        addOnId: 1,
        price: 25,
      });
      expect(result.id).toBe(3);
    });

    it("removes an add-on from a booking", async () => {
      const ctx = createMockContext("employee", 2);
      const caller = appRouter.createCaller(ctx);
      const result = await caller.addOn.removeFromBooking({ id: 1 });
      expect(result.success).toBe(true);
    });

    it("marks an add-on as completed", async () => {
      const ctx = createMockContext("employee", 2);
      const caller = appRouter.createCaller(ctx);
      const result = await caller.addOn.completeAddOn({ id: 1 });
      expect(result.success).toBe(true);
    });

    it("gets add-ons for a specific booking", async () => {
      const ctx = createMockContext("employee", 2);
      const caller = appRouter.createCaller(ctx);
      const result = await caller.addOn.getByBooking({ bookingId: 100 });
      expect(result).toHaveLength(2);
    });

    it("gets all booking add-ons for a kennel", async () => {
      const ctx = createMockContext("employee", 2);
      const caller = appRouter.createCaller(ctx);
      const result = await caller.addOn.getByKennel({ kennelId: 1 });
      expect(result).toHaveLength(2);
    });
  });

  describe("Access control", () => {
    it("customer can view active add-ons", async () => {
      const ctx = createMockContext("customer", 3);
      const caller = appRouter.createCaller(ctx);
      const result = await caller.addOn.activeByKennel({ kennelId: 1 });
      expect(result).toHaveLength(2);
    });

    it("customer cannot create add-ons", async () => {
      const ctx = createMockContext("customer", 3);
      const caller = appRouter.createCaller(ctx);
      await expect(
        caller.addOn.create({ kennelId: 1, name: "Test", price: 10 })
      ).rejects.toThrow();
    });

    it("customer cannot add add-ons to bookings", async () => {
      const ctx = createMockContext("customer", 3);
      const caller = appRouter.createCaller(ctx);
      await expect(
        caller.addOn.addToBooking({ bookingId: 100, addOnId: 1, price: 25 })
      ).rejects.toThrow();
    });
  });
});
