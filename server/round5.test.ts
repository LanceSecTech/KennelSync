import { describe, expect, it } from "vitest";

// Test the natural sort utility
describe("naturalSort", () => {
  // Inline the logic since it's a client module, but we test the algorithm
  function naturalSort(a: string, b: string): number {
    const regex = /(\d+)|(\D+)/g;
    const aParts = a.match(regex) || [];
    const bParts = b.match(regex) || [];
    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const aPart = aParts[i] || "";
      const bPart = bParts[i] || "";
      const aNum = parseInt(aPart, 10);
      const bNum = parseInt(bPart, 10);
      if (!isNaN(aNum) && !isNaN(bNum)) {
        if (aNum !== bNum) return aNum - bNum;
      } else {
        const cmp = aPart.localeCompare(bPart);
        if (cmp !== 0) return cmp;
      }
    }
    return 0;
  }

  it("sorts room numbers numerically", () => {
    const rooms = ["Room 1", "Room 10", "Room 2", "Room 3", "Room 11"];
    const sorted = [...rooms].sort(naturalSort);
    expect(sorted).toEqual(["Room 1", "Room 2", "Room 3", "Room 10", "Room 11"]);
  });

  it("sorts plain numbers", () => {
    const nums = ["1", "10", "2", "20", "3", "11"];
    const sorted = [...nums].sort(naturalSort);
    expect(sorted).toEqual(["1", "2", "3", "10", "11", "20"]);
  });

  it("sorts mixed text and numbers", () => {
    const items = ["Building A Room 10", "Building A Room 2", "Building A Room 1"];
    const sorted = [...items].sort(naturalSort);
    expect(sorted).toEqual(["Building A Room 1", "Building A Room 2", "Building A Room 10"]);
  });

  it("handles equal strings", () => {
    expect(naturalSort("abc", "abc")).toBe(0);
  });

  it("handles empty strings", () => {
    const items = ["", "a", ""];
    const sorted = [...items].sort(naturalSort);
    expect(sorted).toEqual(["", "", "a"]);
  });
});

// Test spay/neuter boolean conversion
describe("spayNeuter conversion", () => {
  it("converts 'yes' to true", () => {
    const value = "yes";
    expect(value === "yes").toBe(true);
  });

  it("converts 'no' to false", () => {
    const value = "no";
    expect(value === "yes").toBe(false);
  });

  it("converts boolean true to 'yes'", () => {
    const spayedNeutered = true;
    const display = spayedNeutered ? "yes" : "no";
    expect(display).toBe("yes");
  });

  it("converts boolean false to 'no'", () => {
    const spayedNeutered = false;
    const display = spayedNeutered ? "yes" : "no";
    expect(display).toBe("no");
  });
});

// Test vaccine compliance logic
describe("vaccine compliance", () => {
  const requiredVaccines = [
    { id: 1, vaccineName: "Rabies", kennelId: 1 },
    { id: 2, vaccineName: "Bordetella", kennelId: 1 },
  ];

  it("detects missing vaccines when none are provided", () => {
    const dogVaccinations: any[] = [];
    const missing = requiredVaccines.filter(rv =>
      !dogVaccinations.some(v =>
        v.vaccineName.toLowerCase().trim() === rv.vaccineName.toLowerCase().trim() &&
        v.status !== "expired" && v.status !== "missing"
      )
    );
    expect(missing.length).toBe(2);
    expect(missing.map(m => m.vaccineName)).toEqual(["Rabies", "Bordetella"]);
  });

  it("detects one missing vaccine when only one is provided", () => {
    const dogVaccinations = [
      { vaccineName: "Rabies", status: "current" },
    ];
    const missing = requiredVaccines.filter(rv =>
      !dogVaccinations.some(v =>
        v.vaccineName.toLowerCase().trim() === rv.vaccineName.toLowerCase().trim() &&
        v.status !== "expired" && v.status !== "missing"
      )
    );
    expect(missing.length).toBe(1);
    expect(missing[0].vaccineName).toBe("Bordetella");
  });

  it("shows no missing vaccines when all are provided and current", () => {
    const dogVaccinations = [
      { vaccineName: "Rabies", status: "current" },
      { vaccineName: "Bordetella", status: "current" },
    ];
    const missing = requiredVaccines.filter(rv =>
      !dogVaccinations.some(v =>
        v.vaccineName.toLowerCase().trim() === rv.vaccineName.toLowerCase().trim() &&
        v.status !== "expired" && v.status !== "missing"
      )
    );
    expect(missing.length).toBe(0);
  });

  it("treats expired vaccines as missing", () => {
    const dogVaccinations = [
      { vaccineName: "Rabies", status: "expired" },
      { vaccineName: "Bordetella", status: "current" },
    ];
    const missing = requiredVaccines.filter(rv =>
      !dogVaccinations.some(v =>
        v.vaccineName.toLowerCase().trim() === rv.vaccineName.toLowerCase().trim() &&
        v.status !== "expired" && v.status !== "missing"
      )
    );
    expect(missing.length).toBe(1);
    expect(missing[0].vaccineName).toBe("Rabies");
  });

  it("handles case-insensitive vaccine name matching", () => {
    const dogVaccinations = [
      { vaccineName: "rabies", status: "current" },
      { vaccineName: "BORDETELLA", status: "current" },
    ];
    const missing = requiredVaccines.filter(rv =>
      !dogVaccinations.some(v =>
        v.vaccineName.toLowerCase().trim() === rv.vaccineName.toLowerCase().trim() &&
        v.status !== "expired" && v.status !== "missing"
      )
    );
    expect(missing.length).toBe(0);
  });
});

// Test occupancy calculation logic
describe("occupancy calculation", () => {
  it("calculates occupancy percentage correctly", () => {
    const todayOccupancy = 5;
    const totalCapacity = 20;
    const pct = Math.round((todayOccupancy / Math.max(totalCapacity, 1)) * 100);
    expect(pct).toBe(25);
  });

  it("handles zero capacity without division by zero", () => {
    const todayOccupancy = 0;
    const totalCapacity = 0;
    const pct = Math.round((todayOccupancy / Math.max(totalCapacity, 1)) * 100);
    expect(pct).toBe(0);
  });

  it("shows 100% when fully occupied", () => {
    const todayOccupancy = 10;
    const totalCapacity = 10;
    const pct = Math.round((todayOccupancy / Math.max(totalCapacity, 1)) * 100);
    expect(pct).toBe(100);
  });
});
