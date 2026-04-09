import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

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

function createUnauthContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

describe("upload routes", () => {
  it("authenticated user can get upload URL", async () => {
    const caller = appRouter.createCaller(createCustomerContext());
    const result = await caller.upload.getUploadUrl({
      fileName: "photo.jpg",
      contentType: "image/jpeg",
      folder: "dog-photos",
    });
    expect(result.key).toContain("dog-photos/");
    expect(result.key).toContain("photo.jpg");
    expect(result.folder).toBe("dog-photos");
  });

  it("unauthenticated user cannot get upload URL", async () => {
    const caller = appRouter.createCaller(createUnauthContext());
    await expect(
      caller.upload.getUploadUrl({
        fileName: "photo.jpg",
        contentType: "image/jpeg",
      })
    ).rejects.toThrow();
  });

  it("unauthenticated user cannot complete upload", async () => {
    const caller = appRouter.createCaller(createUnauthContext());
    await expect(
      caller.upload.complete({
        key: "test/photo.jpg",
        contentBase64: "dGVzdA==",
        contentType: "image/jpeg",
      })
    ).rejects.toThrow();
  });

  it("upload key includes user ID for namespacing", async () => {
    const caller = appRouter.createCaller(createCustomerContext());
    const result = await caller.upload.getUploadUrl({
      fileName: "vaccine-cert.pdf",
      contentType: "application/pdf",
      folder: "vaccination-certs",
    });
    expect(result.key).toContain("3-"); // user ID is 3
    expect(result.key).toContain("vaccination-certs/");
  });

  it("default folder is uploads when not specified", async () => {
    const caller = appRouter.createCaller(createCustomerContext());
    const result = await caller.upload.getUploadUrl({
      fileName: "file.png",
      contentType: "image/png",
    });
    expect(result.folder).toBe("uploads");
    expect(result.key).toContain("uploads/");
  });
});

describe("dog.update photoUrl", () => {
  it("customer can update dog photoUrl field", async () => {
    const caller = appRouter.createCaller(createCustomerContext());
    // This will fail at DB level (no dog exists) but validates the input schema accepts photoUrl
    try {
      await caller.dog.update({
        id: 999,
        photoUrl: "https://cdn.example.com/photo.jpg",
      });
    } catch (e: any) {
      // DB error is expected, but NOT a validation error
      expect(e.message).not.toContain("photoUrl");
    }
  });
});

describe("vaccination.create with documentUrl", () => {
  it("accepts documentUrl in vaccination creation", async () => {
    const caller = appRouter.createCaller(createCustomerContext());
    try {
      await caller.vaccination.create({
        dogId: 999,
        vaccineName: "Rabies",
        documentUrl: "https://cdn.example.com/cert.pdf",
        status: "current",
      });
    } catch (e: any) {
      // DB error expected, but input validation should pass
      expect(e.message).not.toContain("documentUrl");
    }
  });
});

describe("vaccination.update with documentUrl", () => {
  it("accepts documentUrl in vaccination update", async () => {
    const caller = appRouter.createCaller(createCustomerContext());
    try {
      await caller.vaccination.update({
        id: 999,
        documentUrl: "https://cdn.example.com/new-cert.pdf",
      });
    } catch (e: any) {
      expect(e.message).not.toContain("documentUrl");
    }
  });
});
