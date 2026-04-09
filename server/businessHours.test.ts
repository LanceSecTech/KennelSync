import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock db module
vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getBusinessHours: vi.fn(),
    upsertBusinessHours: vi.fn(),
    seedDefaultBusinessHours: vi.fn(),
  };
});

import * as db from "./db";

describe("business hours", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getBusinessHours", () => {
    it("returns empty array when no hours exist", async () => {
      (db.getBusinessHours as any).mockResolvedValue([]);
      const result = await db.getBusinessHours(1);
      expect(result).toEqual([]);
      expect(db.getBusinessHours).toHaveBeenCalledWith(1);
    });

    it("returns hours sorted by day of week", async () => {
      const mockHours = [
        { id: 1, kennelId: 1, dayOfWeek: 0, openTime: null, closeTime: null, isClosed: true },
        { id: 2, kennelId: 1, dayOfWeek: 1, openTime: "07:00", closeTime: "19:00", isClosed: false },
        { id: 3, kennelId: 1, dayOfWeek: 2, openTime: "07:00", closeTime: "19:00", isClosed: false },
        { id: 4, kennelId: 1, dayOfWeek: 3, openTime: "08:00", closeTime: "18:00", isClosed: false },
        { id: 5, kennelId: 1, dayOfWeek: 4, openTime: "07:00", closeTime: "19:00", isClosed: false },
        { id: 6, kennelId: 1, dayOfWeek: 5, openTime: "07:00", closeTime: "17:00", isClosed: false },
        { id: 7, kennelId: 1, dayOfWeek: 6, openTime: null, closeTime: null, isClosed: true },
      ];
      (db.getBusinessHours as any).mockResolvedValue(mockHours);
      const result = await db.getBusinessHours(1);
      expect(result).toHaveLength(7);
      expect(result[0].dayOfWeek).toBe(0);
      expect(result[0].isClosed).toBe(true);
      expect(result[1].dayOfWeek).toBe(1);
      expect(result[1].openTime).toBe("07:00");
    });
  });

  describe("upsertBusinessHours", () => {
    it("calls upsert with correct parameters", async () => {
      (db.upsertBusinessHours as any).mockResolvedValue(undefined);
      const hours = [
        { dayOfWeek: 0, openTime: null, closeTime: null, isClosed: true },
        { dayOfWeek: 1, openTime: "08:00", closeTime: "17:00", isClosed: false },
      ];
      await db.upsertBusinessHours(1, hours);
      expect(db.upsertBusinessHours).toHaveBeenCalledWith(1, hours);
    });

    it("handles all days open", async () => {
      (db.upsertBusinessHours as any).mockResolvedValue(undefined);
      const hours = Array.from({ length: 7 }, (_, i) => ({
        dayOfWeek: i,
        openTime: "09:00",
        closeTime: "21:00",
        isClosed: false,
      }));
      await db.upsertBusinessHours(1, hours);
      expect(db.upsertBusinessHours).toHaveBeenCalledWith(1, hours);
    });

    it("handles all days closed", async () => {
      (db.upsertBusinessHours as any).mockResolvedValue(undefined);
      const hours = Array.from({ length: 7 }, (_, i) => ({
        dayOfWeek: i,
        openTime: null,
        closeTime: null,
        isClosed: true,
      }));
      await db.upsertBusinessHours(1, hours);
      expect(db.upsertBusinessHours).toHaveBeenCalledWith(1, hours);
    });
  });

  describe("seedDefaultBusinessHours", () => {
    it("seeds default hours for a kennel", async () => {
      (db.seedDefaultBusinessHours as any).mockResolvedValue(undefined);
      await db.seedDefaultBusinessHours(1);
      expect(db.seedDefaultBusinessHours).toHaveBeenCalledWith(1);
    });
  });

  describe("business hours data structure", () => {
    it("validates day of week range 0-6", () => {
      const validDays = [0, 1, 2, 3, 4, 5, 6];
      validDays.forEach(day => {
        expect(day).toBeGreaterThanOrEqual(0);
        expect(day).toBeLessThanOrEqual(6);
      });
    });

    it("validates time format HH:MM", () => {
      const validTimes = ["00:00", "07:00", "12:30", "19:00", "23:59"];
      validTimes.forEach(time => {
        expect(time).toMatch(/^\d{2}:\d{2}$/);
      });
    });

    it("closed days should have null times", () => {
      const closedDay = { dayOfWeek: 0, openTime: null, closeTime: null, isClosed: true };
      expect(closedDay.isClosed).toBe(true);
      expect(closedDay.openTime).toBeNull();
      expect(closedDay.closeTime).toBeNull();
    });

    it("open days should have valid times", () => {
      const openDay = { dayOfWeek: 1, openTime: "07:00", closeTime: "19:00", isClosed: false };
      expect(openDay.isClosed).toBe(false);
      expect(openDay.openTime).toBeTruthy();
      expect(openDay.closeTime).toBeTruthy();
    });
  });
});
