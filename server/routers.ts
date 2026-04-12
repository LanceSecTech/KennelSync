import { publicProcedure, protectedProcedure, router, ownerProcedure, employeeProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";
import { storagePut, storageDelete } from "./storage";
import { supabase } from "./_core/supabase";
import type { User } from "./_core/context";
import {
  fetchAuthMetadataNames,
  isUsableDisplayName,
  resolveDisplayNamesForUsers,
  resolveOwnerDisplayName,
  trimStr,
} from "./lib/ownerDisplayName";
import {
  isOwnerSubscriptionEnforced,
  kennelRowHasOwnerAppAccess,
  kennelShowTrialUpgradeBanner,
} from "./subscriptionAccess";
import { MANUAL_PAYMENT_METHODS } from "../shared/manualPayment";
import {
  CUSTOMER_CHECKOUT_START_FAILED,
  CUSTOMER_ONLINE_PAYMENT_UNAVAILABLE,
  CUSTOMER_STRIPE_NOT_CONFIGURED,
} from "../shared/paymentMessages";
import { ownerFacingStripeConnectMessage } from "./stripeConnectErrors";

const zManualPaymentMethod = z.enum(MANUAL_PAYMENT_METHODS as unknown as [string, ...string[]]);

async function loadBookingForAccess(bookingId: number) {
  try {
    return await db.getBookingById(bookingId);
  } catch {
    throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
  }
}

async function employeeHasKennelAccess(userId: string, kennelId: number) {
  const { data, error } = await supabase
    .from("customer_kennel_associations")
    .select("id")
    .eq("customer_id", userId)
    .eq("kennel_id", kennelId)
    .limit(1);
  if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
  return !!(data && data.length > 0);
}

async function assertOwnerOwnsBookingKennel(user: User, booking: { kennelId: number }) {
  if (user.role !== "owner") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Owner access required" });
  }
  await assertOwnerOwnsKennel(user.id, booking.kennelId);
}

/** Single-kennel ownership check (authoritative row: kennels.owner_id). Service role bypasses RLS — use on every owner-scoped mutation/query by kennel. */
async function assertOwnerOwnsKennel(userId: string, kennelId: number): Promise<void> {
  let row: Record<string, unknown>;
  try {
    row = (await db.getKennelById(kennelId)) as Record<string, unknown>;
  } catch {
    console.warn(`[auth] assertOwnerOwnsKennel deny userId=${userId} kennelId=${kennelId} result=not_found`);
    throw new TRPCError({ code: "NOT_FOUND", message: "Kennel not found" });
  }
  const ownerId = String(row.owner_id ?? "");
  if (!ownerId || ownerId !== userId) {
    console.warn(
      `[auth] assertOwnerOwnsKennel deny userId=${userId} kennelId=${kennelId} ownerId=${ownerId || "none"} result=forbidden`,
    );
    throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized for this kennel" });
  }
}

async function assertOwnerOwnsKennelId(user: User, kennelId: number) {
  if (user.role !== "owner") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Owner access required" });
  }
  await assertOwnerOwnsKennel(user.id, kennelId);
}

/** PostgREST / Supabase schema-cache errors when a column is missing from the live DB */
function isMissingKennelColumnError(e: unknown, columnSnake: string): boolean {
  const m = String((e as { message?: string })?.message ?? e ?? "").toLowerCase();
  const col = columnSnake.toLowerCase();
  return (
    m.includes("schema cache") ||
    (m.includes(col) && (m.includes("column") || m.includes("could not find"))) ||
    (m.includes("does not exist") && m.includes(col))
  );
}

async function assertStaffMayChangeBookingStatus(user: User, booking: { kennelId: number }) {
  if (user.role === "owner") {
    await assertOwnerOwnsBookingKennel(user, booking);
    return;
  }
  if (user.role === "employee") {
    const directMatch = user.kennelId != null && user.kennelId === booking.kennelId;
    const assocMatch = await employeeHasKennelAccess(user.id, booking.kennelId);
    if (!directMatch && !assocMatch) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized for this kennel" });
    }
    return;
  }
  throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
}

async function assertEmployeeOrOwnerKennel(user: User, kennelId: number) {
  if (user.role === "owner") {
    await assertOwnerOwnsKennel(user.id, kennelId);
    return;
  }
  if (user.role === "employee") {
    const directMatch = user.kennelId != null && user.kennelId === kennelId;
    const assocMatch = await employeeHasKennelAccess(user.id, kennelId);
    if (!directMatch && !assocMatch) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized for this kennel" });
    }
    return;
  }
  throw new TRPCError({ code: "FORBIDDEN", message: "Staff access required" });
}

async function assertDogVisibleAtKennel(kennelId: number, dogId: number) {
  const dogs = await db.getDogsForKennelWithBookings(kennelId);
  if (!dogs.some((d) => d.id === dogId)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Dog is not linked to this kennel." });
  }
}

async function assertCustomerLinkedToKennel(kennelId: number, customerId: string) {
  const { data: assoc } = await supabase
    .from("customer_kennel_associations")
    .select("id")
    .eq("kennel_id", kennelId)
    .eq("customer_id", customerId)
    .limit(1);
  if (assoc && assoc.length > 0) return;
  const dogs = await db.getDogsForKennelWithBookings(kennelId);
  if (dogs.some((d) => d.ownerId === customerId)) return;
  const bookingRows = await db.getBookingsByKennelId(kennelId);
  if (bookingRows.some((b: { customerId?: string }) => b.customerId === customerId)) return;
  throw new TRPCError({ code: "FORBIDDEN", message: "Customer is not linked to this kennel." });
}

/** Supabase returns this when `booking_dogs` was never created or not in schema cache. */
function isMissingBookingDogsTable(err: unknown): boolean {
  const m = String((err as { message?: string })?.message ?? err ?? "").toLowerCase();
  return (
    m.includes("schema cache") ||
    m.includes("could not find the table") ||
    (m.includes("does not exist") && m.includes("booking_dogs"))
  );
}

function isMissingRoomAssignmentDaysTable(err: unknown): boolean {
  const m = String((err as { message?: string })?.message ?? err ?? "").toLowerCase();
  return (
    m.includes("schema cache") ||
    m.includes("could not find the table") ||
    (m.includes("does not exist") && m.includes("room_assignment_days"))
  );
}

function normalizeStringForCompare(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s.length ? s : null;
}

function normalizeVaccineLabel(value: unknown): string {
  return String(value || "").trim().toLowerCase();
}

function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const DEFAULT_DOG_BADGES: Array<{
  key: string;
  name: string;
  description: string;
  icon: string;
}> = [
  { key: "jumper", name: "Jumper", description: "Can jump fences, gates, or low walls.", icon: "fence" },
  { key: "not_fixed", name: "Not Spayed/Neutered", description: "Dog is not spayed/neutered.", icon: "alert" },
  { key: "fighter", name: "Fighter", description: "Needs extra separation around other dogs.", icon: "swords" },
  { key: "escape_risk", name: "Escape Risk", description: "Known to bolt or slip doors.", icon: "door" },
  { key: "food_guarding", name: "Food Guarding", description: "Shows guarding behavior around food.", icon: "food" },
  { key: "meds_required", name: "Meds Required", description: "Requires medication during stay.", icon: "pill" },
];

/** Must match preset ids accepted by the owner badge UI (`client/src/lib/dogBadgeIcons.tsx`). */
const ALLOWED_DOG_BADGE_ICON_IDS = new Set([
  "alert",
  "paw",
  "shield",
  "bolt",
  "fence",
  "mars",
  "venus",
  "dog",
  "heart",
  "pill",
  "syringe",
  "star",
  "swords",
  "door",
  "food",
]);

function slugifyDogBadgeName(name: string): string {
  const s = name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
  return s.length ? s : "badge";
}

async function uniqueDogBadgeKeyForKennel(kennelId: number, baseSlug: string): Promise<string> {
  const { data, error } = await supabase.from("dog_badges").select("key").eq("kennel_id", kennelId);
  if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
  const existing = new Set((data || []).map((r: { key: string }) => String(r.key || "")));
  let candidate = baseSlug;
  let n = 2;
  while (existing.has(candidate)) {
    candidate = `${baseSlug}-${n}`;
    n += 1;
  }
  return candidate;
}

async function getUserStripeCustomerId(userId: string): Promise<string | null> {
  let { data, error } = await supabase
    .from("users")
    .select("stripe_customer_id")
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    const msg = String(error.message || "").toLowerCase();
    if (!(msg.includes("stripe_customer_id") && msg.includes("does not exist"))) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
    }
    const fallback = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    data = fallback.data;
    error = fallback.error;
    if (error) return null;
  }
  const row = data as Record<string, any> | null;
  const id = row?.stripe_customer_id ?? row?.stripeCustomerId ?? null;
  return id ? String(id) : null;
}

export const appRouter = router({
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    updateProfile: protectedProcedure
      .input(
        z.object({
          name: z.string().trim().min(1).optional(),
          phone: z.string().trim().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
        const updates: Record<string, unknown> = {};
        if (input.name !== undefined) updates.name = input.name;
        if (input.phone !== undefined) updates.phone = input.phone || null;
        if (!Object.keys(updates).length) return db.getUserById(ctx.user.id);

        try {
          return await db.updateUser(ctx.user.id, updates);
        } catch (err: any) {
          const msg = String(err?.message || "");
          // Some environments may not have users.phone yet; still persist name.
          if (msg.toLowerCase().includes("phone") && msg.toLowerCase().includes("does not exist")) {
            if (updates.name !== undefined) {
              return await db.updateUser(ctx.user.id, { name: updates.name });
            }
          }
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: msg || "Failed to update profile" });
        }
      }),
    /** Idempotent: marks the signed-in user as having finished onboarding (all roles). */
    completeOnboarding: protectedProcedure.mutation(async ({ ctx }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
      try {
        await db.updateUser(ctx.user.id, { onboarding_completed: true });
      } catch (err: any) {
        const msg = String(err?.message || "").toLowerCase();
        if (msg.includes("onboarding_completed") && msg.includes("does not exist")) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message:
              "Database is missing column users.onboarding_completed. Run MIGRATION_R32_users_onboarding_completed.sql in Supabase.",
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: String(err?.message || "Failed to save onboarding completion"),
        });
      }
      return { success: true as const };
    }),
    logout: publicProcedure.mutation(async ({ ctx }) => {
      await supabase.auth.signOut();
      return { success: true } as const;
    }),
  }),

  // ===== KENNEL ROUTES =====
  kennel: router({
    list: publicProcedure.query(async () => {
      const { data, error } = await supabase
        .from('kennels')
        .select('*')
        .eq('is_active', true);
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      return data || [];
    }),
    getById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return db.getKennelById(input.id);
    }),
    myKennels: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
      if (ctx.user.role === 'owner') {
        return db.getKennelsByOwnerId(ctx.user.id);
      }
      if (ctx.user.role === "employee") {
        if (ctx.user.kennelId) {
          const kennel = await db.getKennelById(ctx.user.kennelId);
          if (kennel) return [kennel];
        }
        const { data: assoc, error } = await supabase
          .from("customer_kennel_associations")
          .select("kennel_id")
          .eq("customer_id", ctx.user.id);
        if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
        const ids = Array.from(new Set((assoc || []).map((r: any) => r.kennel_id).filter(Boolean)));
        if (!ids.length) return [];
        const kennels = await Promise.all(ids.map((id: number) => db.getKennelById(id)));
        return kennels.filter(Boolean);
      }
      if (ctx.user.kennelId) {
        const kennel = await db.getKennelById(ctx.user.kennelId);
        return kennel ? [kennel] : [];
      }
      return [];
    }),
    create: protectedProcedure.input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zip: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      policies: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });

      const kennel = await db.createKennel(ctx.user.id, {
        name: input.name,
        description: input.description,
        address: input.address,
        city: input.city,
        state: input.state,
        zip: input.zip,
        phone: input.phone,
        email: input.email,
        policies: input.policies,
      });

      const mustMatch: Array<keyof typeof input> = ["city", "state", "zip", "phone", "email"];
      const dropped = mustMatch.filter((k) => {
        if (input[k] === undefined) return false;
        return normalizeStringForCompare((kennel as any)[k]) !== normalizeStringForCompare(input[k]);
      });
      if (dropped.length) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Kennel created but fields did not persist: ${dropped.join(", ")}`,
        });
      }

      try {
        const { ensureStripeCustomerForKennel } = await import("./stripeOwnerSubscription");
        const u = await db.getUserById(ctx.user.id);
        const email = String(u?.email || ctx.user.email || "");
        await ensureStripeCustomerForKennel(kennel.id, email, input.name);
      } catch (e) {
        console.warn("[kennel.create] Stripe customer (non-fatal):", e);
      }
      
      // Update user role to owner
      await db.updateUser(ctx.user.id, { role: 'owner', kennel_id: kennel.id });
      
      // Create default business hours (Mon-Fri 7am-7pm, Sat-Sun closed)
      for (let day = 0; day < 7; day++) {
        const isClosed = day >= 5; // Saturday and Sunday
        await db.updateBusinessHours(kennel.id, day, '07:00', '19:00', isClosed);
      }
      
      return { id: kennel.id };
    }),
    update: ownerProcedure.input(z.object({
      id: z.number(),
      name: z.string().optional(),
      description: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zip: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      policies: z.string().optional(),
      logoUrl: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
      await assertOwnerOwnsKennelId(ctx.user, input.id);
      const { id, logoUrl, name, description, address, city, state, zip, phone, email, policies } = input;
      const updates: Record<string, any> = {};
      if (name !== undefined) updates.name = name;
      if (description !== undefined) updates.description = description;
      if (address !== undefined) updates.address = address;
      if (city !== undefined) updates.city = city;
      if (state !== undefined) updates.state = state;
      if (zip !== undefined) updates.zip = zip;
      if (phone !== undefined) updates.phone = phone;
      if (email !== undefined) updates.email = email;
      if (policies !== undefined) updates.policies = policies;
      if (logoUrl !== undefined) updates.logo_url = logoUrl;
      const saved = await db.updateKennel(id, updates);

      const mustMatch: Array<keyof typeof input> = ["city", "state", "zip", "phone", "email"];
      const dropped = mustMatch.filter((k) => {
        if (input[k] === undefined) return false;
        return normalizeStringForCompare((saved as any)[k]) !== normalizeStringForCompare(input[k]);
      });
      if (dropped.length) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Saved kennel but fields did not persist: ${dropped.join(", ")}`,
        });
      }
      return { success: true };
    }),
    linkToKennel: protectedProcedure.input(z.object({ kennelId: z.number() })).mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
      const { error } = await supabase
        .from('customer_kennel_associations')
        .upsert(
          [{ kennel_id: input.kennelId, customer_id: ctx.user.id }],
          { onConflict: 'customer_id,kennel_id' },
        );
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      return { success: true };
    }),
    unlinkFromKennel: protectedProcedure.input(z.object({ kennelId: z.number() })).mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
      const { error } = await supabase
        .from('customer_kennel_associations')
        .delete()
        .eq('kennel_id', input.kennelId)
        .eq('customer_id', ctx.user.id);
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      return { success: true };
    }),
  }),

  // ===== SERVICES ROUTES =====
  service: router({
    list: protectedProcedure.input(z.object({ kennelId: z.number() })).query(async ({ input }) => {
      return db.getServicesByKennelId(input.kennelId);
    }),
    byKennel: protectedProcedure.input(z.object({ kennelId: z.number() })).query(async ({ input }) => {
      return db.getServicesByKennelId(input.kennelId);
    }),
    create: ownerProcedure.input(z.object({
      kennelId: z.number(),
      name: z.string(),
      type: z.enum(['boarding', 'daycare', 'grooming']),
      pricePerUnit: z.union([z.number(), z.string()]).transform((v) => parseFloat(String(v).trim())).refine((n) => Number.isFinite(n), { message: 'Invalid price' }),
      description: z.string().optional(),
      unitType: z.enum(['per_night', 'per_day', 'per_session']).optional(),
    })).mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
      await assertOwnerOwnsKennelId(ctx.user, input.kennelId);
      return db.createService(
        input.kennelId,
        input.name,
        input.type,
        input.pricePerUnit,
        input.description,
        input.unitType,
      );
    }),
    update: ownerProcedure.input(z.object({
      id: z.number(),
      name: z.string().optional(),
      type: z.enum(['boarding', 'daycare', 'grooming']).optional(),
      pricePerUnit: z.union([z.number(), z.string()]).optional().transform((v) => {
        if (v === undefined || v === '') return undefined;
        const n = parseFloat(String(v).trim());
        return Number.isFinite(n) ? n : undefined;
      }),
      description: z.string().nullable().optional(),
      unitType: z.enum(['per_night', 'per_day', 'per_session']).nullable().optional(),
      isActive: z.boolean().optional(),
    })).mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
      const svc = await db.getServiceById(input.id);
      await assertOwnerOwnsKennelId(ctx.user, svc.kennelId);
      const { id, pricePerUnit, description, unitType, ...rest } = input;
      const updates: Record<string, any> = {};
      if (rest.name !== undefined) updates.name = rest.name;
      if (rest.type !== undefined) updates.type = rest.type;
      if (rest.isActive !== undefined) updates.is_active = rest.isActive;
      if (pricePerUnit !== undefined) updates.price_per_unit = pricePerUnit;
      if (description !== undefined) updates.description = description === null || description === '' ? null : description;
      if (unitType !== undefined) updates.unit_type = unitType;
      return db.updateService(id, updates);
    }),
    delete: ownerProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
      const svc = await db.getServiceById(input.id);
      await assertOwnerOwnsKennelId(ctx.user, svc.kennelId);
      await db.deleteService(input.id);
      return { success: true };
    }),
  }),

  // ===== DOGS ROUTES =====
  dog: router({
    myDogs: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
      return db.getDogsByOwnerId(ctx.user.id);
    }),
    list: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
      return db.getDogsByOwnerId(ctx.user.id);
    }),
    byKennel: protectedProcedure.input(z.object({ kennelId: z.number() })).query(async ({ input }) => {
      return db.getDogsForKennelWithBookings(input.kennelId);
    }),
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return db.getDogById(input.id);
    }),
    create: protectedProcedure.input(z.object({
      name: z.string(),
      breed: z.string().optional(),
      age: z.number().optional(),
      weight: z.number().optional(),
      birthday: z.string().optional(),
      sex: z.enum(['male', 'female']).optional(),
      isSpayedNeutered: z.boolean().optional(),
      feedingInstructions: z.string().optional(),
      medications: z.string().optional(),
      behaviorNotes: z.string().optional(),
      vetName: z.string().optional(),
      vetPhone: z.string().optional(),
      emergencyContactName: z.string().optional(),
      emergencyContactPhone: z.string().optional(),
      specialNeeds: z.string().nullable().optional(),
    })).mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
      return db.createDog(ctx.user.id, input);
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(),
      name: z.string().optional(),
      breed: z.string().optional(),
      age: z.number().optional(),
      weight: z.number().optional(),
      birthday: z.string().nullable().optional(),
      sex: z.enum(['male', 'female']).optional(),
      isSpayedNeutered: z.boolean().optional(),
      photoUrl: z.string().optional(),
      feedingInstructions: z.string().optional(),
      medications: z.string().optional(),
      behaviorNotes: z.string().optional(),
      vetName: z.string().optional(),
      vetPhone: z.string().optional(),
      emergencyContactName: z.string().optional(),
      emergencyContactPhone: z.string().optional(),
      specialNeeds: z.string().nullable().optional(),
    })).mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
      const dog = await db.getDogById(input.id);
      if (dog.ownerId !== ctx.user.id) {
        console.warn(
          `[auth] dog.update deny userId=${ctx.user.id} dogId=${input.id} ownerId=${dog.ownerId} result=forbidden`,
        );
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized to update this dog" });
      }
      console.log(`[auth] dog.update ok userId=${ctx.user.id} dogId=${input.id}`);
      const {
        id,
        name,
        breed,
        age,
        weight,
        birthday,
        sex,
        isSpayedNeutered,
        photoUrl,
        feedingInstructions,
        medications,
        behaviorNotes,
        vetName,
        vetPhone,
        emergencyContactName,
        emergencyContactPhone,
        specialNeeds,
      } = input;
      const updates: Record<string, any> = {};
      if (name !== undefined) updates.name = name;
      if (breed !== undefined) updates.breed = breed;
      if (age !== undefined) updates.age = age;
      if (weight !== undefined) updates.weight = weight;
      if (birthday !== undefined) updates.birthday = birthday || null;
      if (sex !== undefined) updates.sex = sex;
      if (isSpayedNeutered !== undefined) updates.is_spayed_neutered = isSpayedNeutered;
      if (photoUrl !== undefined) updates.photo_url = photoUrl;
      if (feedingInstructions !== undefined) updates.feeding_instructions = feedingInstructions;
      if (medications !== undefined) updates.medications = medications;
      if (behaviorNotes !== undefined) updates.behavior_notes = behaviorNotes;
      if (vetName !== undefined) updates.vet_name = vetName;
      if (vetPhone !== undefined) updates.vet_phone = vetPhone;
      if (emergencyContactName !== undefined) updates.emergency_contact_name = emergencyContactName;
      if (emergencyContactPhone !== undefined) updates.emergency_contact_phone = emergencyContactPhone;
      if (specialNeeds !== undefined) updates.special_needs = specialNeeds;
      return db.updateDog(id, updates);
    }),
  }),

  dogBadge: router({
    listByKennel: employeeProcedure
      .input(z.object({ kennelId: z.number() }))
      .query(async ({ ctx, input }) => {
        await assertEmployeeOrOwnerKennel(ctx.user!, input.kennelId);
        const { data, error } = await supabase
          .from("dog_badges")
          .select("*")
          .eq("kennel_id", input.kennelId)
          .order("name", { ascending: true });
        if (error) {
          const msg = String(error.message || "").toLowerCase();
          if (msg.includes("dog_badges") && msg.includes("does not exist")) {
            return DEFAULT_DOG_BADGES.map((b, idx) => ({
              id: -(idx + 1),
              kennelId: input.kennelId,
              key: b.key,
              name: b.name,
              description: b.description,
              icon: b.icon,
              isDefault: true,
              isActive: true,
            }));
          }
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
        }
        const custom = (data || []).map((r: any) => ({
          id: r.id as number,
          kennelId: r.kennel_id as number,
          key: String(r.key || ""),
          name: String(r.name || ""),
          description: String(r.description || ""),
          icon: String(r.icon || "paw"),
          isDefault: !!r.is_default,
          isActive: r.is_active !== false,
        }));
        const byKey = new Map(custom.map((x) => [x.key, x]));
        const merged = [
          ...DEFAULT_DOG_BADGES.map((b, idx) =>
            byKey.get(b.key) || {
              id: -(idx + 1),
              kennelId: input.kennelId,
              key: b.key,
              name: b.name,
              description: b.description,
              icon: b.icon,
              isDefault: true,
              isActive: true,
            },
          ),
          ...custom.filter((c) => !DEFAULT_DOG_BADGES.some((d) => d.key === c.key)),
        ];
        return merged.filter((b) => b.isActive);
      }),
    assignedForDogs: employeeProcedure
      .input(z.object({ kennelId: z.number(), dogIds: z.array(z.number()) }))
      .query(async ({ ctx, input }) => {
        await assertEmployeeOrOwnerKennel(ctx.user!, input.kennelId);
        if (!input.dogIds.length) return {};
        const { data: assignments, error } = await supabase
          .from("dog_badge_assignments")
          .select("dog_id,badge_key")
          .in("dog_id", input.dogIds);
        if (error) {
          const msg = String(error.message || "").toLowerCase();
          if (msg.includes("dog_badge_assignments") && msg.includes("does not exist")) return {};
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
        }
        const out: Record<string, string[]> = {};
        for (const row of assignments || []) {
          const dogId = String((row as any).dog_id);
          if (!out[dogId]) out[dogId] = [];
          out[dogId].push(String((row as any).badge_key || ""));
        }
        return out;
      }),
    create: ownerProcedure
      .input(
        z.object({
          kennelId: z.number(),
          name: z.string().trim().min(2),
          description: z.string().trim().min(2),
          /** Preset icon id from owner UI (not a free-text field). */
          iconId: z.string().trim().min(1),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await assertOwnerOwnsKennelId(ctx.user!, input.kennelId);
        const iconId = input.iconId.trim();
        if (!ALLOWED_DOG_BADGE_ICON_IDS.has(iconId)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid badge icon selection." });
        }
        const baseSlug = slugifyDogBadgeName(input.name);
        const key = await uniqueDogBadgeKeyForKennel(input.kennelId, baseSlug);
        const { data, error } = await supabase
          .from("dog_badges")
          .insert([
            {
              kennel_id: input.kennelId,
              key,
              name: input.name.trim(),
              description: input.description.trim(),
              icon: iconId,
              is_default: false,
              is_active: true,
            },
          ])
          .select("*")
          .single();
        if (error) {
          const msg = String(error.message || "");
          if (msg.includes("duplicate key") || msg.toLowerCase().includes("unique")) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "A badge with this name already exists. Try a slightly different name.",
            });
          }
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: msg || "Could not create badge" });
        }
        return data;
      }),
    assignToDog: ownerProcedure
      .input(z.object({ kennelId: z.number(), dogId: z.number(), badgeKeys: z.array(z.string()) }))
      .mutation(async ({ ctx, input }) => {
        await assertOwnerOwnsKennelId(ctx.user!, input.kennelId);
        const keys = Array.from(new Set(input.badgeKeys.map((k) => k.trim().toLowerCase()).filter(Boolean)));
        const { error: clearErr } = await supabase.from("dog_badge_assignments").delete().eq("dog_id", input.dogId);
        if (clearErr) {
          const msg = String(clearErr.message || "").toLowerCase();
          if (!(msg.includes("dog_badge_assignments") && msg.includes("does not exist"))) {
            throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: clearErr.message });
          }
          return { success: true };
        }
        if (!keys.length) return { success: true };
        const { error: insertErr } = await supabase.from("dog_badge_assignments").insert(
          keys.map((key) => ({ dog_id: input.dogId, badge_key: key })),
        );
        if (insertErr) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: insertErr.message });
        return { success: true };
      }),
  }),

  // ===== VACCINATIONS ROUTES =====
  vaccination: router({
    list: protectedProcedure.input(z.object({ dogId: z.number() })).query(async ({ input }) => {
      return db.getVaccinationsByDogId(input.dogId);
    }),
    byDog: protectedProcedure.input(z.object({ dogId: z.number() })).query(async ({ input }) => {
      return db.getVaccinationsByDogId(input.dogId);
    }),
    create: protectedProcedure.input(z.object({
      dogId: z.number(),
      kennelId: z.number().optional(),
      vaccineName: z.string(),
      dateAdministered: z.string().optional(),
      expirationDate: z.string(),
      documentUrl: z.string().optional(),
      status: z.enum(['current', 'expiring_soon', 'expired', 'missing']).optional(),
    })).mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED", message: "Unauthorized" });
      const dog = await db.getDogById(input.dogId);
      if (!dog) throw new TRPCError({ code: "NOT_FOUND", message: "Dog not found" });
      if (ctx.user.role === "customer") {
        if (dog.ownerId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized to edit this dog" });
        }
      } else if (ctx.user.role === "owner") {
        if (input.kennelId == null) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "kennelId is required when adding a vaccination as kennel owner.",
          });
        }
        await assertOwnerOwnsKennelId(ctx.user, input.kennelId);
        await assertDogVisibleAtKennel(input.kennelId, input.dogId);
      } else if (ctx.user.role === "employee") {
        const kid = ctx.user.kennelId;
        if (kid != null) {
          await assertDogVisibleAtKennel(kid, input.dogId);
        }
      }
      return db.createVaccination(
        input.dogId,
        input.vaccineName,
        input.expirationDate,
        input.dateAdministered,
        input.documentUrl,
        input.status,
      );
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(),
      vaccineName: z.string().optional(),
      dateAdministered: z.string().optional(),
      expirationDate: z.string().optional(),
      documentUrl: z.string().optional(),
      status: z.enum(['current', 'expiring_soon', 'expired', 'missing']).optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      const updates: Record<string, any> = {};
      if (data.vaccineName !== undefined) updates.vaccine_name = data.vaccineName;
      if (data.dateAdministered !== undefined) updates.date_administered = data.dateAdministered;
      if (data.expirationDate !== undefined) updates.expiration_date = data.expirationDate;
      if (data.documentUrl !== undefined) updates.document_url = data.documentUrl;
      if (data.status !== undefined) updates.status = data.status;
      return db.updateVaccination(id, updates);
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      const { error } = await supabase.from('vaccinations').delete().eq('id', input.id);
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      return { success: true };
    }),
  }),

  // ===== BOOKINGS ROUTES =====
  booking: router({
    list: protectedProcedure.input(z.object({ kennelId: z.number() })).query(async ({ input }) => {
      return db.getBookingsByKennelId(input.kennelId);
    }),
    byKennel: protectedProcedure.input(z.object({ kennelId: z.number() })).query(async ({ input }) => {
      return db.getBookingsByKennelId(input.kennelId);
    }),
    myBookings: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
      return db.getBookingsByCustomerId(ctx.user.id);
    }),
    today: employeeProcedure.input(z.object({ kennelId: z.number() })).query(async ({ input }) => {
      return db.getTodayBookings(input.kennelId);
    }),
    /** Bath/nail tasks only for dogs scheduled to check out today */
    todayTasks: employeeProcedure.input(z.object({ kennelId: z.number() })).query(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
      await assertEmployeeOrOwnerKennel(ctx.user, input.kennelId);
      const today = new Date().toISOString().split("T")[0];
      const bookings = await db.getBookingsByKennelId(input.kennelId);
      const active = bookings.filter((b: any) => {
        if (b.status !== "checked_in") return false;
        const serviceType = String(b.serviceType || "").toLowerCase();
        if (serviceType === "daycare") {
          const checkInDay = String(b.checkInDate ?? "").split("T")[0];
          return checkInDay === today;
        }
        const checkOutDay = String(b.checkOutDate ?? "").split("T")[0];
        return checkOutDay === today;
      });

      type TaskRow = {
        id: string;
        bookingAddOnId: number;
        bookingId: number;
        dogName: string;
        taskName: string;
        taskStatus: "pending" | "in_progress" | "completed";
      };
      const tasks: TaskRow[] = [];

      for (const b of active) {
        const dogName = b.dogName || "Dog";
        const addOnRows = await db.getBookingAddOns(b.id);
        for (const r of addOnRows) {
          const { data: co } = await supabase
            .from("checkout_add_ons")
            .select("name")
            .eq("id", r.add_on_id)
            .maybeSingle();
          const rawStatus = (r as Record<string, unknown>).task_status as string | undefined;
          let taskStatus: "pending" | "in_progress" | "completed" = "pending";
          if (rawStatus === "in_progress" || rawStatus === "completed") {
            taskStatus = rawStatus;
          } else if (r.completed) {
            taskStatus = "completed";
          }
          const taskName = co?.name || "Add-on";
          if (!/(bath|nail)/i.test(taskName)) {
            continue;
          }
          tasks.push({
            id: `ba-${r.id}`,
            bookingAddOnId: r.id,
            bookingId: b.id,
            dogName,
            taskName,
            taskStatus,
          });
        }
      }

      return tasks;
    }),
    create: protectedProcedure.input(z.object({
      kennelId: z.number(),
      dogIds: z.array(z.number()),
      serviceId: z.number(),
      checkInDate: z.string(),
      checkOutDate: z.string().optional(),
      totalPrice: z.number(),
      addOnIds: z.array(z.number()).optional(),
    })).mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
      
      const booking = await db.createBooking(
        input.kennelId,
        ctx.user.id,
        input.dogIds[0],
        input.serviceId,
        input.checkInDate,
        input.checkOutDate || input.checkInDate,
        input.totalPrice
      );

      const extraDogs = input.dogIds.slice(1);
      if (extraDogs.length > 0) {
        const rows = extraDogs.map((dogId) => ({ booking_id: booking.id, dog_id: dogId }));
        const { error: bdErr } = await supabase.from("booking_dogs").insert(rows);
        if (bdErr) {
          if (isMissingBookingDogsTable(bdErr)) {
            throw new TRPCError({
              code: "PRECONDITION_FAILED",
              message:
                "The booking_dogs table is missing in Supabase. Open SQL Editor and run MIGRATION_R26_booking_dogs.sql from the repo root, then reload the API schema (Dashboard → Settings → API).",
            });
          }
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: bdErr.message });
        }
      }

      // Add selected add-ons
      if (input.addOnIds && input.addOnIds.length > 0) {
        for (const addOnId of input.addOnIds) {
          const addOn = await supabase
            .from('checkout_add_ons')
            .select('price')
            .eq('id', addOnId)
            .single();
          
          if (addOn.data) {
            await db.addBookingAddOn(booking.id, addOnId, input.dogIds[0], addOn.data.price);
          }
        }
      }

      return db.getBookingById(booking.id);
    }),
    updateStatus: protectedProcedure.input(z.object({
      id: z.number(),
      status: z.enum(['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'completed']).optional(),
      paymentStatus: z.enum(['unpaid', 'deposit_paid', 'paid', 'partial']).optional(),
    })).mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
      const booking = await loadBookingForAccess(input.id);
      await assertStaffMayChangeBookingStatus(ctx.user, booking);
      const { id, ...data } = input;
      return db.updateBooking(id, data);
    }),
    checkoutQuote: employeeProcedure
      .input(
        z.object({
          bookingId: z.number(),
          addOnIds: z.array(z.number()).default([]),
          discountId: z.number().nullable().optional(),
          discountNotes: z.string().optional(),
        }),
      )
      .query(async ({ ctx, input }) => {
        const booking = await loadBookingForAccess(input.bookingId);
        await assertStaffMayChangeBookingStatus(ctx.user!, booking);
        const baseTotal = Number(booking.totalPrice || 0);
        const { data: addOnRows, error: addOnErr } = await supabase
          .from("checkout_add_ons")
          .select("id,name,price,is_active")
          .eq("kennel_id", booking.kennelId)
          .in("id", input.addOnIds.length ? input.addOnIds : [-1]);
        if (addOnErr) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: addOnErr.message });
        const selectedAddOns = (addOnRows || [])
          .filter((a: any) => a.is_active !== false)
          .map((a: any) => ({ id: a.id as number, name: String(a.name || "Add-on"), price: Number(a.price || 0) }));
        const addOnsTotal = selectedAddOns.reduce((sum, a) => sum + a.price, 0);

        let discount: { id: number; name: string; kind: "fixed" | "percent"; amount: number; notes?: string } | null = null;
        let discountAmount = 0;
        if (input.discountId) {
          const { data: dRow, error: dErr } = await supabase
            .from("checkout_discounts")
            .select("*")
            .eq("id", input.discountId)
            .eq("kennel_id", booking.kennelId)
            .eq("is_active", true)
            .maybeSingle();
          if (dErr) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: dErr.message });
          if (!dRow) throw new TRPCError({ code: "BAD_REQUEST", message: "Selected discount is not available." });
          const kind = String(dRow.discount_type || "fixed") === "percent" ? "percent" : "fixed";
          const amount = Number(dRow.amount || 0);
          const subtotal = baseTotal + addOnsTotal;
          discountAmount = kind === "percent" ? (subtotal * amount) / 100 : amount;
          discountAmount = Math.max(0, Math.min(discountAmount, subtotal));
          discount = {
            id: dRow.id,
            name: String(dRow.name || "Discount"),
            kind,
            amount,
            notes: input.discountNotes || dRow.notes || undefined,
          };
        }
        const subtotal = baseTotal + addOnsTotal;
        const finalTotal = Math.max(0, subtotal - discountAmount);
        return { bookingId: booking.id, baseTotal, addOnsTotal, subtotal, discountAmount, finalTotal, selectedAddOns, discount };
      }),
    checkoutSavedCardEligibility: employeeProcedure
      .input(z.object({ bookingId: z.number() }))
      .query(async ({ ctx, input }) => {
        const booking = await loadBookingForAccess(input.bookingId);
        await assertStaffMayChangeBookingStatus(ctx.user!, booking);
        const { stripe } = await import("./stripe");
        if (!stripe) {
          return { stripeConfigured: false as const, hasSavedCard: false as const };
        }
        const customerId = await getUserStripeCustomerId(booking.customerId);
        if (!customerId) {
          return { stripeConfigured: true as const, hasSavedCard: false as const };
        }
        const pms = await stripe.paymentMethods.list({ customer: customerId, type: "card", limit: 3 });
        return { stripeConfigured: true as const, hasSavedCard: pms.data.length > 0 };
      }),
    checkoutFinalize: employeeProcedure
      .input(
        z.object({
          bookingId: z.number(),
          addOnIds: z.array(z.number()).default([]),
          discountId: z.number().nullable().optional(),
          discountNotes: z.string().optional(),
          paymentMode: z.enum(["saved_card", "manual"]).default("manual"),
          /** Used when paymentMode is manual; defaults to other. Recorded on the payment row when total due is positive. */
          manualPaymentMethod: zManualPaymentMethod.optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const booking = await loadBookingForAccess(input.bookingId);
        await assertStaffMayChangeBookingStatus(ctx.user!, booking);
        if (booking.status !== "checked_in") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Only checked-in bookings can be checked out." });
        }

        const baseTotal = Number(booking.totalPrice || 0);
        const { data: addOnRows, error: addOnErr } = await supabase
          .from("checkout_add_ons")
          .select("id,name,price,is_active")
          .eq("kennel_id", booking.kennelId)
          .in("id", input.addOnIds.length ? input.addOnIds : [-1]);
        if (addOnErr) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: addOnErr.message });
        const selectedAddOns = (addOnRows || [])
          .filter((a: any) => a.is_active !== false)
          .map((a: any) => ({ id: a.id as number, name: String(a.name || "Add-on"), price: Number(a.price || 0) }));
        const addOnsTotal = selectedAddOns.reduce((sum, a) => sum + a.price, 0);
        let discount: { id: number; name: string; kind: "fixed" | "percent"; amount: number; notes?: string } | null = null;
        let discountAmount = 0;
        if (input.discountId) {
          const { data: dRow, error: dErr } = await supabase
            .from("checkout_discounts")
            .select("*")
            .eq("id", input.discountId)
            .eq("kennel_id", booking.kennelId)
            .eq("is_active", true)
            .maybeSingle();
          if (dErr) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: dErr.message });
          if (!dRow) throw new TRPCError({ code: "BAD_REQUEST", message: "Selected discount is not available." });
          const kind = String(dRow.discount_type || "fixed") === "percent" ? "percent" : "fixed";
          const amount = Number(dRow.amount || 0);
          const subtotal = baseTotal + addOnsTotal;
          discountAmount = kind === "percent" ? (subtotal * amount) / 100 : amount;
          discountAmount = Math.max(0, Math.min(discountAmount, subtotal));
          discount = { id: dRow.id, name: String(dRow.name || "Discount"), kind, amount, notes: input.discountNotes || dRow.notes || undefined };
        }
        const subtotal = baseTotal + addOnsTotal;
        const finalTotal = Math.max(0, subtotal - discountAmount);

        for (const addOn of selectedAddOns) {
          await db.addBookingAddOn(booking.id, addOn.id, booking.dogId, addOn.price);
        }
        if (discount && discountAmount > 0) {
          const { error: dInsertErr } = await supabase.from("booking_discounts").insert([
            {
              booking_id: booking.id,
              discount_id: discount.id,
              discount_name: discount.name,
              discount_type: discount.kind,
              discount_amount: discountAmount,
              discount_rate: discount.kind === "percent" ? discount.amount : null,
              notes: discount.notes || null,
            },
          ]);
          if (dInsertErr) {
            const msg = String(dInsertErr.message || "").toLowerCase();
            if (!(msg.includes("booking_discounts") && msg.includes("does not exist"))) {
              throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: dInsertErr.message });
            }
          }
        }

        if (input.paymentMode === "manual") {
          const method = input.manualPaymentMethod ?? "other";
          if (finalTotal > 0) {
            try {
              await db.createManualPayment(
                booking.id,
                booking.customerId,
                booking.kennelId,
                finalTotal,
                method,
              );
            } catch (e) {
              const msg = e instanceof Error ? e.message : String(e);
              if (msg.toLowerCase().includes("manual_payment_method") || msg.toLowerCase().includes("column")) {
                throw new TRPCError({
                  code: "PRECONDITION_FAILED",
                  message:
                    "Database is missing the manual payment column. Run MIGRATION_R34_payments_manual_payment_method.sql in Supabase, then try again.",
                });
              }
              throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Could not save manual payment record." });
            }
          }
          await db.updateBooking(booking.id, { paymentStatus: "paid" });
        } else if (input.paymentMode === "saved_card") {
          if (finalTotal <= 0) {
            await db.updateBooking(booking.id, { paymentStatus: "paid" });
          } else {
            const { stripe } = await import("./stripe");
            if (!stripe) throw new TRPCError({ code: "BAD_REQUEST", message: "Stripe is not configured." });
            const customerId = await getUserStripeCustomerId(booking.customerId);
            if (!customerId) throw new TRPCError({ code: "BAD_REQUEST", message: "Customer has no saved card on file." });
            const pms = await stripe.paymentMethods.list({ customer: customerId, type: "card" });
            const paymentMethodId = pms.data[0]?.id;
            if (!paymentMethodId) throw new TRPCError({ code: "BAD_REQUEST", message: "Customer has no saved card on file." });
            const cents = Math.round(finalTotal * 100);
            if (cents < 50) throw new TRPCError({ code: "BAD_REQUEST", message: "Final total must be at least $0.50 to charge card." });
            try {
              const pi = await stripe.paymentIntents.create({
                customer: customerId,
                payment_method: paymentMethodId,
                amount: cents,
                currency: "usd",
                off_session: true,
                confirm: true,
                metadata: {
                  booking_id: String(booking.id),
                  kennel_id: String(booking.kennelId),
                  customer_id: booking.customerId,
                },
              });
              await db.createPayment(booking.id, booking.customerId, booking.kennelId, finalTotal, pi.id);
              await db.updateBooking(booking.id, { paymentStatus: "paid" });
            } catch (err: any) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: String(err?.message || "Saved card charge failed."),
              });
            }
          }
        }

        await db.updateBooking(booking.id, { status: "checked_out" });
        const chargedStripe = input.paymentMode === "saved_card" && finalTotal > 0;
        return { success: true, paymentCharged: chargedStripe, finalTotal };
      }),
    edit: protectedProcedure.input(z.object({
      id: z.number(),
      kennelId: z.number().optional(),
      checkInDate: z.string().optional(),
      checkOutDate: z.string().optional(),
      notes: z.string().nullable().optional(),
      serviceId: z.number().optional(),
      dogId: z.number().optional(),
      addOnIds: z.array(z.number()).optional(),
      totalPrice: z.number().optional(),
    })).mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
      const booking = await loadBookingForAccess(input.id);
      const { id, kennelId, checkInDate, checkOutDate, notes, serviceId, dogId, addOnIds, totalPrice } = input;

      if (ctx.user.role === 'owner') {
        if (kennelId == null) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'kennelId is required' });
        }
        if (kennelId !== booking.kennelId) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Booking does not belong to this kennel' });
        }
        await assertOwnerOwnsBookingKennel(ctx.user, booking);
        if (['cancelled', 'completed', 'checked_out'].includes(booking.status)) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'This booking can no longer be edited' });
        }
      } else if (ctx.user.role === 'customer') {
        if (booking.customerId !== ctx.user.id) {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }
        if (booking.status !== 'pending') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Only pending bookings can be edited' });
        }
      } else {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized to edit bookings' });
      }

      const updates: Record<string, any> = {};
      if (checkInDate !== undefined) updates.check_in_date = checkInDate;
      if (checkOutDate !== undefined) updates.check_out_date = checkOutDate;
      if (notes !== undefined) updates.notes = notes;

      const ownerExtras = ctx.user.role === 'owner';
      if (ownerExtras && serviceId !== undefined) {
        const service = await db.getServiceById(serviceId);
        if (service.kennelId !== booking.kennelId) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid service for this kennel' });
        }
        updates.service_id = serviceId;
      }

      if (ownerExtras && dogId !== undefined) {
        const dog = await db.getDogById(dogId);
        if (dog.ownerId !== booking.customerId) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Dog does not belong to this booking customer' });
        }
        updates.dog_id = dogId;
      }

      if (ownerExtras && totalPrice !== undefined) {
        updates.total_price = totalPrice;
      }

      let result = booking;
      if (Object.keys(updates).length > 0) {
        result = await db.updateBooking(id, updates);
      }

      if (ownerExtras && addOnIds !== undefined) {
        const effectiveDogId = dogId ?? booking.dogId;
        await db.deleteBookingAddOnsByBookingId(id);
        const uniqueIds = Array.from(new Set(addOnIds));
        for (const addOnId of uniqueIds) {
          const { data: addOnRow } = await supabase
            .from('checkout_add_ons')
            .select('price, kennel_id')
            .eq('id', addOnId)
            .single();
          if (!addOnRow || addOnRow.kennel_id !== booking.kennelId) {
            throw new TRPCError({ code: 'BAD_REQUEST', message: `Invalid add-on ${addOnId}` });
          }
          const price = parseFloat(String(addOnRow.price ?? 0));
          await db.addBookingAddOn(id, addOnId, effectiveDogId, price);
        }
        result = await db.getBookingById(id);
      }

      return result;
    }),
    cancel: protectedProcedure.input(z.object({
      id: z.number(),
      kennelId: z.number().optional(),
    })).mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
      const booking = await loadBookingForAccess(input.id);

      if (booking.status === 'cancelled') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Booking is already cancelled' });
      }

      if (ctx.user.role === 'owner') {
        if (input.kennelId == null) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'kennelId is required' });
        }
        if (input.kennelId !== booking.kennelId) {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }
        await assertOwnerOwnsBookingKennel(ctx.user, booking);
        const allowed = ['pending', 'confirmed', 'checked_in'];
        if (!allowed.includes(booking.status)) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'This booking cannot be cancelled' });
        }
      } else if (ctx.user.role === 'customer') {
        if (booking.customerId !== ctx.user.id) {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }
        if (!['pending', 'confirmed'].includes(booking.status)) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'This booking cannot be cancelled' });
        }
      } else {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      return db.updateBooking(input.id, { status: 'cancelled' });
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(),
      status: z.enum(['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'completed']).optional(),
      paymentStatus: z.enum(['unpaid', 'deposit_paid', 'paid', 'partial']).optional(),
      checkedInAt: z.string().optional(),
      checkedOutAt: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
      const booking = await loadBookingForAccess(input.id);
      await assertStaffMayChangeBookingStatus(ctx.user, booking);
      const { id, ...data } = input;
      return db.updateBooking(id, data);
    }),
  }),

  // ===== PAYMENTS ROUTES =====
  payment: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
      return db.getPaymentsByCustomerId(ctx.user.id);
    }),
    myPayments: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
      return db.getPaymentsByCustomerId(ctx.user.id);
    }),
    byKennel: ownerProcedure.input(z.object({ kennelId: z.number() })).query(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
      await assertOwnerOwnsKennelId(ctx.user, input.kennelId);
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('kennel_id', input.kennelId)
        .order('created_at', { ascending: false });
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      return (data || []).map((p: any) => ({
        id: p.id,
        bookingId: p.booking_id,
        customerId: p.customer_id,
        kennelId: p.kennel_id,
        amount: p.amount,
        status: p.status,
        type: p.type || 'payment',
        stripePaymentId: p.stripe_payment_id,
        manualPaymentMethod: p.manual_payment_method ?? null,
        paidAt: p.paid_at || p.created_at,
        createdAt: p.created_at,
      }));
    }),
    balanceSummary: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
      const bookings = await db.getBookingsByCustomerId(ctx.user.id);
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const payments = await db.getPaymentsByCustomerId(ctx.user.id);

      const balanceDue = bookings
        .filter(b => b.status !== 'cancelled' && (b.paymentStatus === 'unpaid' || b.paymentStatus === 'partial'))
        .reduce((sum: number, b: any) => sum + parseFloat(String(b.totalPrice ?? 0)), 0);

      const upcomingCharges = bookings
        .filter(b => b.status === 'confirmed' || b.status === 'pending')
        .reduce((sum: number, b: any) => sum + parseFloat(String(b.totalPrice ?? 0)), 0);

      const paidThisMonth = payments
        .filter(
          (p: any) =>
            new Date(p.created_at) >= startOfMonth &&
            (p.status === 'completed' || p.status === 'succeeded'),
        )
        .reduce((sum: number, p: any) => sum + parseFloat(String(p.amount || 0)), 0);

      return { balanceDue, upcomingCharges, paidThisMonth };
    }),
    /** Whether this customer can use in-app Stripe Checkout for a booking at this kennel (Connect-ready + Stripe configured). */
    customerKennelOnlinePay: protectedProcedure
      .input(z.object({ kennelId: z.number() }))
      .query(async ({ ctx, input }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
        const { stripe } = await import("./stripe");
        const kennel = await db.getKennelById(input.kennelId);
        if (!kennel) {
          return { onlinePayAvailable: false as const, message: CUSTOMER_ONLINE_PAYMENT_UNAVAILABLE };
        }
        const { kennelCanReceiveBookingDestinations } = await import("./stripeConnect");
        const destinationOk = kennelCanReceiveBookingDestinations(kennel as Record<string, unknown>);
        const onlinePayAvailable = Boolean(stripe) && destinationOk;
        return {
          onlinePayAvailable,
          message: onlinePayAvailable ? undefined : CUSTOMER_ONLINE_PAYMENT_UNAVAILABLE,
        };
      }),
    /** Same gate as createCheckoutSession, for a specific booking (must be the customer). */
    bookingOnlinePayEligibility: protectedProcedure
      .input(z.object({ bookingId: z.number() }))
      .query(async ({ ctx, input }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
        const booking = await db.getBookingById(input.bookingId);
        if (!booking || booking.customerId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
        }
        const { stripe } = await import("./stripe");
        const kennelRow = (await db.getKennelById(booking.kennelId)) as Record<string, unknown>;
        const { kennelCanReceiveBookingDestinations } = await import("./stripeConnect");
        const destinationOk = kennelCanReceiveBookingDestinations(kennelRow);
        const amount = Math.round(parseFloat(String(booking.totalPrice ?? 0)) * 100);
        const onlinePayAvailable = Boolean(stripe) && destinationOk && amount >= 50;
        let message: string | undefined;
        if (!stripe) message = CUSTOMER_STRIPE_NOT_CONFIGURED;
        else if (!destinationOk) message = CUSTOMER_ONLINE_PAYMENT_UNAVAILABLE;
        else if (amount < 50) message = "This balance is too small to pay online.";
        return { onlinePayAvailable, message };
      }),
    /** Staff: record full stay total as paid offline (no Stripe). See Checkout for itemized checkout. */
    recordManualPayment: employeeProcedure
      .input(
        z.object({
          bookingId: z.number(),
          manualPaymentMethod: zManualPaymentMethod,
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const booking = await loadBookingForAccess(input.bookingId);
        await assertStaffMayChangeBookingStatus(ctx.user!, booking);
        if (booking.status === "cancelled") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Cancelled bookings cannot be marked paid." });
        }
        if (booking.paymentStatus === "paid") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "This booking is already marked paid." });
        }
        const amount = Number(booking.totalPrice || 0);
        if (amount <= 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "There is no amount to record for this booking." });
        }
        try {
          await db.createManualPayment(booking.id, booking.customerId, booking.kennelId, amount, input.manualPaymentMethod);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          if (msg.toLowerCase().includes("manual_payment_method") || msg.toLowerCase().includes("column")) {
            throw new TRPCError({
              code: "PRECONDITION_FAILED",
              message:
                "Database is missing the manual payment column. Run MIGRATION_R34_payments_manual_payment_method.sql in Supabase, then try again.",
            });
          }
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Could not save payment record." });
        }
        await db.updateBooking(booking.id, { paymentStatus: "paid" });
        return { success: true as const };
      }),
    createCheckoutSession: protectedProcedure.input(z.object({
      bookingId: z.number(),
      origin: z.string(),
    })).mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
      const { stripe } = await import('./stripe');
      if (!stripe) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: CUSTOMER_STRIPE_NOT_CONFIGURED });
      }

      const booking = await db.getBookingById(input.bookingId);
      if (!booking) throw new TRPCError({ code: 'NOT_FOUND', message: 'Booking not found' });
      if (booking.customerId !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not allowed to pay for this booking' });
      }

      const amount = Math.round(parseFloat(String(booking.totalPrice ?? 0)) * 100);
      if (amount < 50) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Minimum payment amount is $0.50' });

      const kennelRow = (await db.getKennelById(booking.kennelId)) as Record<string, unknown>;
      const { connectApplicationFeeCents, kennelCanReceiveBookingDestinations } = await import("./stripeConnect");
      const destinationOk = kennelCanReceiveBookingDestinations(kennelRow);
      if (!destinationOk) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: CUSTOMER_ONLINE_PAYMENT_UNAVAILABLE,
        });
      }

      const base = String(process.env.STRIPE_CHECKOUT_APP_ORIGIN || input.origin).replace(/\/$/, '');
      const successUrl = `${base}/payment/success?session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${base}/payment/cancel`;

      const connectedId =
        (kennelRow.stripe_connected_account_id ?? kennelRow.stripeConnectedAccountId) != null
          ? String(kennelRow.stripe_connected_account_id ?? kennelRow.stripeConnectedAccountId).trim()
          : "";

      if (!connectedId) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: CUSTOMER_ONLINE_PAYMENT_UNAVAILABLE });
      }

      const sessionParams: Parameters<typeof stripe.checkout.sessions.create>[0] = {
        payment_method_types: ["card"],
        mode: "payment",
        customer_email: ctx.user.email || undefined,
        client_reference_id: ctx.user.id,
        metadata: {
          checkout_flow: "booking",
          booking_id: String(input.bookingId),
          customer_id: ctx.user.id,
          kennel_id: String(booking.kennelId),
          user_id: ctx.user.id,
          customer_email: ctx.user.email || "",
          stripe_connected_account_id: connectedId,
          connect_destination: "true",
        },
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: { name: `Kennel Stay #${input.bookingId}` },
              unit_amount: amount,
            },
            quantity: 1,
          },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        allow_promotion_codes: true,
      };

      const fee = connectApplicationFeeCents(amount);
      sessionParams.payment_intent_data = {
        transfer_data: { destination: connectedId },
        ...(fee > 0 ? { application_fee_amount: fee } : {}),
      };

      try {
        const session = await stripe.checkout.sessions.create(sessionParams);
        console.log(
          `[Stripe] booking checkout session created bookingId=${input.bookingId} userId=${ctx.user.id} sessionId=${session.id}`,
        );
        return { url: session.url };
      } catch (err) {
        console.error("[Stripe] booking checkout.session.create failed:", err);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: CUSTOMER_CHECKOUT_START_FAILED });
      }
    }),
    create: protectedProcedure.input(z.object({
      bookingId: z.number(),
      kennelId: z.number(),
      amount: z.number(),
      stripePaymentId: z.string(),
    })).mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
      const booking = await loadBookingForAccess(input.bookingId);
      if (booking.customerId !== ctx.user.id) {
        console.warn(
          `[auth] payment.create deny userId=${ctx.user.id} bookingId=${input.bookingId} customerId=${booking.customerId}`,
        );
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized for this booking" });
      }
      if (booking.kennelId !== input.kennelId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Kennel does not match booking" });
      }
      console.log(`[auth] payment.create ok userId=${ctx.user.id} bookingId=${input.bookingId} kennelId=${input.kennelId}`);
      return db.createPayment(input.bookingId, ctx.user.id, input.kennelId, input.amount, input.stripePaymentId);
    }),
  }),

  // ===== ROOMS ROUTES =====
  room: router({
    list: employeeProcedure
      .input(
        z.object({
          kennelId: z.number(),
          asOfDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        }),
      )
      .query(async ({ ctx, input }) => {
        await assertEmployeeOrOwnerKennel(ctx.user!, input.kennelId);
        return db.getRoomsByKennelIdWithOccupancy(
          input.kennelId,
          input.asOfDate ? { asOfDate: input.asOfDate } : undefined,
        );
      }),
    byKennel: employeeProcedure
      .input(
        z.object({
          kennelId: z.number(),
          asOfDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        }),
      )
      .query(async ({ ctx, input }) => {
        await assertEmployeeOrOwnerKennel(ctx.user!, input.kennelId);
        return db.getRoomsByKennelIdWithOccupancy(
          input.kennelId,
          input.asOfDate ? { asOfDate: input.asOfDate } : undefined,
        );
      }),
    currentAssignments: employeeProcedure
      .input(
        z.object({
          kennelId: z.number(),
          asOfDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        }),
      )
      .query(async ({ ctx, input }) => {
        await assertEmployeeOrOwnerKennel(ctx.user!, input.kennelId);
        if (input.asOfDate) {
          return db.getEffectiveRoomPlacementsForDate(input.kennelId, input.asOfDate);
        }
        const { data: activeBookings, error: bookingErr } = await supabase
          .from("bookings")
          .select("id, dog_id")
          .eq("kennel_id", input.kennelId)
          .eq("status", "checked_in");
        if (bookingErr) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: bookingErr.message });
        const bookingIds = (activeBookings || []).map((b: any) => b.id);
        if (!bookingIds.length) return [];
        const { data: assigns, error: assignErr } = await supabase
          .from("room_assignments")
          .select("booking_id, room_id, assigned_at")
          .in("booking_id", bookingIds)
          .is("unassigned_at", null)
          .order("assigned_at", { ascending: false });
        if (assignErr) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: assignErr.message });
        const roomByBooking = new Map<number, number>();
        for (const r of assigns || []) {
          if (!roomByBooking.has(r.booking_id)) roomByBooking.set(r.booking_id, r.room_id);
        }
        return (activeBookings || []).map((b: any) => ({
          bookingId: b.id,
          roomId: roomByBooking.get(b.id) ?? null,
          dogId: b.dog_id,
        }));
      }),
    assign: employeeProcedure.input(z.object({
      bookingId: z.number(),
      roomId: z.number().nullable(),
    })).mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
      const booking = await loadBookingForAccess(input.bookingId);
      await assertStaffMayChangeBookingStatus(ctx.user, booking);
      if (booking.status !== "checked_in" && booking.status !== "confirmed") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Room can only be assigned to active stays" });
      }
      const { error: clearErr } = await supabase
        .from("room_assignments")
        .update({ unassigned_at: new Date().toISOString() })
        .eq("booking_id", input.bookingId)
        .is("unassigned_at", null);
      if (clearErr) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: clearErr.message });
      if (input.roomId != null) {
        const { error: insertErr } = await supabase
          .from("room_assignments")
          .insert([{ booking_id: input.bookingId, room_id: input.roomId }]);
        if (insertErr) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: insertErr.message });
      }
      return { success: true };
    }),
    /** Calendar-only: place this booking in a room for a single stay night/date without changing stay-wide room_assignments. */
    assignForDay: employeeProcedure
      .input(
        z.object({
          bookingId: z.number(),
          roomId: z.number(),
          stayDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
        const booking = await loadBookingForAccess(input.bookingId);
        await assertStaffMayChangeBookingStatus(ctx.user, booking);
        if (booking.status !== "checked_in" && booking.status !== "confirmed") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Room can only be assigned to active stays" });
        }
        const { data: roomRow, error: roomErr } = await supabase
          .from("rooms")
          .select("kennel_id")
          .eq("id", input.roomId)
          .maybeSingle();
        if (roomErr) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: roomErr.message });
        if (!roomRow || Number(roomRow.kennel_id) !== booking.kennelId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Room is not in this kennel" });
        }
        const checkOut =
          booking.checkOutDate != null ? String(booking.checkOutDate) : String(booking.checkInDate);
        const inStay =
          input.stayDate >= String(booking.checkInDate) && input.stayDate <= checkOut;
        if (!inStay) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Date is outside this booking's stay" });
        }
        const { error: upsertErr } = await supabase.from("room_assignment_days").upsert(
          {
            booking_id: input.bookingId,
            room_id: input.roomId,
            stay_date: input.stayDate,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "booking_id,stay_date" },
        );
        if (upsertErr) {
          if (isMissingRoomAssignmentDaysTable(upsertErr)) {
            throw new TRPCError({
              code: "PRECONDITION_FAILED",
              message:
                "The room_assignment_days table is missing. Run MIGRATION_R27_room_assignment_days.sql in the Supabase SQL Editor, then reload the API schema.",
            });
          }
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: upsertErr.message });
        }
        return { success: true };
      }),
    create: ownerProcedure.input(z.object({
      kennelId: z.number(),
      name: z.string(),
      building: z.string().optional(),
      sizeType: z.enum(['small', 'medium', 'large', 'mixed', 'special_care']).optional(),
      capacity: z.number().optional(),
      notes: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
      await assertOwnerOwnsKennelId(ctx.user, input.kennelId);
      return db.createRoom(input.kennelId, input.name, input.capacity || 1, input.building, input.sizeType, input.notes);
    }),
    update: ownerProcedure.input(z.object({
      id: z.number(),
      name: z.string().optional(),
      building: z.string().optional(),
      sizeType: z.enum(['small', 'medium', 'large', 'mixed', 'special_care']).optional(),
      capacity: z.number().optional(),
      notes: z.string().optional(),
      isAvailable: z.boolean().optional(),
    })).mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
      const { data: row, error: roomErr } = await supabase
        .from("rooms")
        .select("kennel_id")
        .eq("id", input.id)
        .maybeSingle();
      if (roomErr) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: roomErr.message });
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Room not found" });
      await assertOwnerOwnsKennelId(ctx.user, Number(row.kennel_id));
      const { id, isAvailable, sizeType, ...rest } = input;
      const updates: Record<string, any> = { ...rest };
      if (isAvailable !== undefined) updates.is_available = isAvailable;
      if (sizeType !== undefined) updates.size_type = sizeType;
      return db.updateRoom(id, updates);
    }),
    delete: ownerProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
      const { data: row, error: roomErr } = await supabase
        .from("rooms")
        .select("kennel_id")
        .eq("id", input.id)
        .maybeSingle();
      if (roomErr) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: roomErr.message });
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Room not found" });
      await assertOwnerOwnsKennelId(ctx.user, Number(row.kennel_id));
      await db.deleteRoom(input.id);
      return { success: true };
    }),
    dailyAvailability: protectedProcedure.input(z.object({
      kennelId: z.number(),
      startDate: z.string(),
      endDate: z.string(),
    })).query(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
      await assertEmployeeOrOwnerKennel(ctx.user, input.kennelId);

      const rooms = await db.getRoomsByKennelId(input.kennelId);
      const { data: bookings, error: bookingErr } = await supabase
        .from("bookings")
        .select("id, dog_id, check_in_date, check_out_date, status")
        .eq("kennel_id", input.kennelId)
        .in("status", ["confirmed", "checked_in"])
        .lte("check_in_date", input.endDate)
        .gte("check_out_date", input.startDate);
      if (bookingErr) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: bookingErr.message });

      const bookingList = bookings || [];
      const bookingIds = bookingList.map((b: any) => b.id);

      const { data: assigns, error: assignErr } = await supabase
        .from("room_assignments")
        .select("booking_id, room_id, assigned_at")
        .in("booking_id", bookingIds.length ? bookingIds : [-1])
        .is("unassigned_at", null)
        .order("assigned_at", { ascending: false });
      if (assignErr) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: assignErr.message });

      const roomByBooking = new Map<number, number>();
      for (const r of assigns || []) {
        if (!roomByBooking.has(r.booking_id)) roomByBooking.set(r.booking_id, r.room_id);
      }

      const dayOverrideMap = new Map<string, number>();
      if (bookingIds.length) {
        const { data: overrides, error: ovErr } = await supabase
          .from("room_assignment_days")
          .select("booking_id, room_id, stay_date")
          .in("booking_id", bookingIds)
          .gte("stay_date", input.startDate)
          .lte("stay_date", input.endDate);
        if (ovErr) {
          if (!isMissingRoomAssignmentDaysTable(ovErr)) {
            throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: ovErr.message });
          }
        } else {
          for (const row of overrides || []) {
            const raw = row.stay_date as string;
            const dateStr = typeof raw === "string" ? raw.split("T")[0] : String(raw).slice(0, 10);
            dayOverrideMap.set(`${row.booking_id}|${dateStr}`, row.room_id);
          }
        }
      }

      const extraDogByBooking = new Map<number, number[]>();
      if (bookingIds.length) {
        const { data: bdRows, error: bdErr } = await supabase
          .from("booking_dogs")
          .select("booking_id, dog_id")
          .in("booking_id", bookingIds);
        if (bdErr) {
          if (!isMissingBookingDogsTable(bdErr)) {
            throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: bdErr.message });
          }
        } else {
          for (const row of bdRows || []) {
            if (!extraDogByBooking.has(row.booking_id)) extraDogByBooking.set(row.booking_id, []);
            extraDogByBooking.get(row.booking_id)!.push(row.dog_id);
          }
        }
      }

      const allDogIds = new Set<number>();
      for (const b of bookingList) {
        allDogIds.add(b.dog_id);
        for (const id of extraDogByBooking.get(b.id) || []) allDogIds.add(id);
      }
      const nameByDogId = new Map<number, string>();
      if (allDogIds.size) {
        const { data: dogRows, error: dogErr } = await supabase
          .from("dogs")
          .select("id, name")
          .in("id", Array.from(allDogIds));
        if (dogErr) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: dogErr.message });
        for (const d of dogRows || []) nameByDogId.set(d.id, d.name);
      }

      function dogNamesForBooking(b: { id: number; dog_id: number }): string[] {
        const seen = new Set<number>();
        const ids: number[] = [];
        if (!seen.has(b.dog_id)) {
          seen.add(b.dog_id);
          ids.push(b.dog_id);
        }
        for (const x of extraDogByBooking.get(b.id) || []) {
          if (!seen.has(x)) {
            seen.add(x);
            ids.push(x);
          }
        }
        return ids.map((id) => nameByDogId.get(id) ?? `Dog #${id}`);
      }
      function dogIdsForBooking(b: { id: number; dog_id: number }): number[] {
        const seen = new Set<number>();
        const ids: number[] = [];
        if (!seen.has(b.dog_id)) {
          seen.add(b.dog_id);
          ids.push(b.dog_id);
        }
        for (const x of extraDogByBooking.get(b.id) || []) {
          if (!seen.has(x)) {
            seen.add(x);
            ids.push(x);
          }
        }
        return ids;
      }

      const namesByBooking = new Map<number, string[]>();
      const idsByBooking = new Map<number, number[]>();
      for (const b of bookingList) {
        namesByBooking.set(b.id, dogNamesForBooking(b));
        idsByBooking.set(b.id, dogIdsForBooking(b));
      }

      function roomForBookingOnDay(bookingId: number, dateStr: string): number | undefined {
        const o = dayOverrideMap.get(`${bookingId}|${dateStr}`);
        if (o !== undefined) return o;
        return roomByBooking.get(bookingId);
      }

      function bookingActiveOnDate(b: any, dateStr: string): boolean {
        return b.check_in_date <= dateStr && (b.check_out_date >= dateStr || !b.check_out_date);
      }

      const dates: string[] = [];
      const cur = new Date(input.startDate);
      const end = new Date(input.endDate);
      while (cur <= end) {
        dates.push(cur.toISOString().split("T")[0]);
        cur.setDate(cur.getDate() + 1);
      }

      return dates.map((date) => ({
        date,
        rooms: rooms.map((room: any) => {
          const dayBookings = bookingList.filter(
            (b: any) => bookingActiveOnDate(b, date) && roomForBookingOnDay(b.id, date) === room.id,
          );
          const dogNames = dayBookings.flatMap((b: any) => namesByBooking.get(b.id) || []);
          const dogIds = Array.from(new Set(dayBookings.flatMap((b: any) => idsByBooking.get(b.id) || [])));
          const cap = room.capacity || 1;
          const occ = dayBookings.length;
          return {
            roomId: room.id,
            roomName: room.name,
            building: room.building || "Unassigned",
            capacity: cap,
            occupancy: occ,
            booked: occ >= cap,
            bookingIds: dayBookings.map((b: any) => b.id),
            dogNames,
            dogIds,
          };
        }),
      }));
    }),
  }),

  // ===== ADD-ONS ROUTES =====
  addOn: router({
    list: protectedProcedure.input(z.object({ kennelId: z.number() })).query(async ({ input }) => {
      return db.getCheckoutAddOnsByKennelId(input.kennelId);
    }),
    activeByKennel: protectedProcedure.input(z.object({ kennelId: z.number() })).query(async ({ input }) => {
      return db.getCheckoutAddOnsByKennelId(input.kennelId);
    }),
    byBooking: ownerProcedure.input(z.object({
      bookingId: z.number(),
      kennelId: z.number(),
    })).query(async ({ ctx, input }) => {
      const booking = await loadBookingForAccess(input.bookingId);
      if (input.kennelId !== booking.kennelId) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }
      await assertOwnerOwnsBookingKennel(ctx.user!, booking);
      const rows = await db.getBookingAddOns(input.bookingId);
      return rows.map((r: Record<string, any>) => ({
        id: r.id,
        bookingId: r.booking_id,
        addOnId: r.add_on_id,
        dogId: r.dog_id,
        price: r.price != null ? Number(r.price) : 0,
        completed: !!r.completed,
      }));
    }),
    addToBooking: protectedProcedure.input(z.object({
      bookingId: z.number(),
      addOnId: z.number(),
    })).mutation(async ({ input }) => {
      const { error } = await supabase
        .from('booking_add_ons')
        .upsert([{ booking_id: input.bookingId, add_on_id: input.addOnId }], { onConflict: 'booking_id,add_on_id' });
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      return { success: true };
    }),
    // listByKennel returns ALL add-ons (active + inactive) for owner management
    listByKennel: protectedProcedure.input(z.object({ kennelId: z.number() })).query(async ({ input }) => {
      const { data, error } = await supabase
        .from('checkout_add_ons')
        .select('*')
        .eq('kennel_id', input.kennelId)
        .order('created_at', { ascending: true });
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      return (data || []).map((r: any) => ({
        id: r.id,
        kennelId: r.kennel_id,
        name: r.name,
        price: r.price,
        isActive: r.is_active,
      }));
    }),
    create: ownerProcedure.input(z.object({
      kennelId: z.number(),
      name: z.string(),
      price: z.number(),
    })).mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
      await assertOwnerOwnsKennelId(ctx.user, input.kennelId);
      return db.createCheckoutAddOn(input.kennelId, input.name, input.price);
    }),
    update: ownerProcedure.input(z.object({
      id: z.number(),
      name: z.string().optional(),
      price: z.number().optional(),
      isActive: z.boolean().optional(),
    })).mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
      const { data: row, error } = await supabase
        .from("checkout_add_ons")
        .select("kennel_id")
        .eq("id", input.id)
        .maybeSingle();
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Add-on not found" });
      await assertOwnerOwnsKennelId(ctx.user, Number(row.kennel_id));
      const { id, ...data } = input;
      return db.updateCheckoutAddOn(id, data);
    }),
    delete: ownerProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
      const { data: row, error } = await supabase
        .from("checkout_add_ons")
        .select("kennel_id")
        .eq("id", input.id)
        .maybeSingle();
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Add-on not found" });
      await assertOwnerOwnsKennelId(ctx.user, Number(row.kennel_id));
      await db.deleteCheckoutAddOn(input.id);
      return { success: true };
    }),
  }),

  discount: router({
    listByKennel: employeeProcedure
      .input(z.object({ kennelId: z.number() }))
      .query(async ({ ctx, input }) => {
        await assertEmployeeOrOwnerKennel(ctx.user!, input.kennelId);
        const { data, error } = await supabase
          .from("checkout_discounts")
          .select("*")
          .eq("kennel_id", input.kennelId)
          .order("created_at", { ascending: true });
        if (error) {
          const msg = String(error.message || "").toLowerCase();
          if (msg.includes("checkout_discounts") && msg.includes("does not exist")) return [];
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
        }
        return (data || []).map((d: any) => ({
          id: d.id,
          kennelId: d.kennel_id,
          name: d.name,
          discountType: d.discount_type,
          amount: Number(d.amount || 0),
          notes: d.notes || "",
          isActive: d.is_active !== false,
        }));
      }),
    create: ownerProcedure
      .input(
        z.object({
          kennelId: z.number(),
          name: z.string().min(2),
          discountType: z.enum(["fixed", "percent"]),
          amount: z.number().positive(),
          notes: z.string().optional(),
          isActive: z.boolean().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await assertOwnerOwnsKennelId(ctx.user!, input.kennelId);
        const { data, error } = await supabase
          .from("checkout_discounts")
          .insert([
            {
              kennel_id: input.kennelId,
              name: input.name.trim(),
              discount_type: input.discountType,
              amount: input.amount,
              notes: input.notes || null,
              is_active: input.isActive !== false,
            },
          ])
          .select("*")
          .single();
        if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
        return data;
      }),
    update: ownerProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          discountType: z.enum(["fixed", "percent"]).optional(),
          amount: z.number().positive().optional(),
          notes: z.string().nullable().optional(),
          isActive: z.boolean().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
        const { data: dRow, error: fetchErr } = await supabase
          .from("checkout_discounts")
          .select("kennel_id")
          .eq("id", input.id)
          .maybeSingle();
        if (fetchErr) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: fetchErr.message });
        if (!dRow) throw new TRPCError({ code: "NOT_FOUND", message: "Discount not found" });
        await assertOwnerOwnsKennelId(ctx.user, Number(dRow.kennel_id));
        const updates: Record<string, any> = {};
        if (input.name !== undefined) updates.name = input.name.trim();
        if (input.discountType !== undefined) updates.discount_type = input.discountType;
        if (input.amount !== undefined) updates.amount = input.amount;
        if (input.notes !== undefined) updates.notes = input.notes || null;
        if (input.isActive !== undefined) updates.is_active = input.isActive;
        const { data, error } = await supabase
          .from("checkout_discounts")
          .update(updates)
          .eq("id", input.id)
          .select("*")
          .single();
        if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
        return data;
      }),
  }),

  // ===== BUSINESS HOURS ROUTES =====
  businessHours: router({
    list: protectedProcedure.input(z.object({ kennelId: z.number() })).query(async ({ input }) => {
      return db.getBusinessHours(input.kennelId);
    }),
    getByKennel: protectedProcedure.input(z.object({ kennelId: z.number() })).query(async ({ input }) => {
      return db.getBusinessHours(input.kennelId);
    }),
    // Bulk update: accepts array of all 7 days at once
    update: ownerProcedure.input(z.object({
      kennelId: z.number(),
      hours: z.array(z.object({
        dayOfWeek: z.number().min(0).max(6),
        openTime: z.string().nullable(),
        closeTime: z.string().nullable(),
        isClosed: z.boolean(),
      })),
    })).mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
      await assertOwnerOwnsKennelId(ctx.user, input.kennelId);
      for (const h of input.hours) {
        await db.updateBusinessHours(
          input.kennelId,
          h.dayOfWeek,
          h.openTime || '07:00',
          h.closeTime || '19:00',
          h.isClosed
        );
      }
      return { success: true };
    }),
    // Single day update (legacy support)
    updateDay: ownerProcedure.input(z.object({
      kennelId: z.number(),
      dayOfWeek: z.number().min(0).max(6),
      openTime: z.string(),
      closeTime: z.string(),
      isClosed: z.boolean(),
    })).mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
      await assertOwnerOwnsKennelId(ctx.user, input.kennelId);
      return db.updateBusinessHours(input.kennelId, input.dayOfWeek, input.openTime, input.closeTime, input.isClosed);
    }),
  }),

  // ===== FAVORITES ROUTES =====
  favorite: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
      return db.getFavoriteKennels(ctx.user.id);
    }),
    add: protectedProcedure.input(z.object({ kennelId: z.number() })).mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
      return db.addFavoriteKennel(ctx.user.id, input.kennelId);
    }),
    remove: protectedProcedure.input(z.object({ kennelId: z.number() })).mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
      await db.removeFavoriteKennel(ctx.user.id, input.kennelId);
      return { success: true };
    }),
  }),

  // ===== UPLOAD ROUTES =====
  upload: router({
    complete: protectedProcedure.input(z.object({
      key: z.string(),
      contentBase64: z.string(),
      contentType: z.string(),
    })).mutation(async ({ input }) => {
      const { storagePut } = await import('./storage');
      const base64Data = input.contentBase64.replace(/^data:[^;]+;base64,/, '');
      // Parse the key to extract bucket and path (format: 'bucket/path/file.ext')
      const slashIdx = input.key.indexOf('/');
      const bucket = slashIdx > -1 ? input.key.substring(0, slashIdx) : 'uploads';
      const filePath = slashIdx > -1 ? input.key.substring(slashIdx + 1) : input.key;
      const { url } = await storagePut(bucket, filePath, base64Data, input.contentType);
      return { url };
    }),
  }),

  // ===== STATS ROUTES =====
  stats: router({
    customerDashboard: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
      const today = new Date().toISOString().split('T')[0];
      const [dogs, bookings, assoc, favorites] = await Promise.all([
        db.getDogsByOwnerId(ctx.user.id),
        db.getBookingsByCustomerId(ctx.user.id),
        supabase.from("customer_kennel_associations").select("kennel_id").eq("customer_id", ctx.user.id),
        supabase.from("kennel_favorites").select("kennel_id").eq("user_id", ctx.user.id),
      ]);
      const linkedKennelIds = Array.from(new Set((assoc.data || []).map((r: any) => Number(r.kennel_id)).filter(Boolean)));
      const favoriteSet = new Set((favorites.data || []).map((r: any) => Number(r.kennel_id)).filter(Boolean));
      const preferredKennelId = linkedKennelIds.find((id) => favoriteSet.has(id)) || linkedKennelIds[0] || null;
      let requiredLabels: string[] = [];
      if (preferredKennelId) {
        const { data: reqRows, error: reqErr } = await supabase
          .from("kennel_required_vaccines")
          .select("vaccine_name")
          .eq("kennel_id", preferredKennelId);
        if (!reqErr) {
          requiredLabels = (reqRows || []).map((r: any) => String(r.vaccine_name || "").trim()).filter(Boolean);
        }
      }

      // Build dog statuses
      const dogStatuses = await Promise.all(dogs.map(async (dog: any) => {
        const vax = await db.getVaccinationsByDogId(dog.id);
        const rows = (vax as any[]) || [];
        const normalized = (s: unknown) => String(s || "").trim().toLowerCase();
        const hasExpired = rows.some((v: any) =>
          String(v.status || "").toLowerCase() === "expired" ||
          (v.expirationDate && String(v.expirationDate) < today)
        );
        const hasNoRecords = rows.length === 0;
        const missingRequired = requiredLabels.some((label) => {
          const match = rows.find((v: any) => normalized(v.vaccineName) === normalized(label));
          if (!match) return true;
          if (String(match.status || "").toLowerCase() === "expired") return true;
          if (match.expirationDate && String(match.expirationDate) < today) return true;
          return false;
        });
        const hasIssue = hasExpired || hasNoRecords || missingRequired;
        return { dogId: dog.id, dogName: dog.name, status: hasIssue ? 'action_needed' : 'ready' };
      }));

      const upcomingStays = bookings.filter((b: any) => b.checkInDate > today && b.status !== 'cancelled').length;
      const activeStays = bookings.filter((b: any) => b.status === 'checked_in').length;

      // Build action items
      const actionItems: { message: string; severity: string; dogId?: number }[] = [];
      for (const ds of dogStatuses) {
        if (ds.status === 'action_needed') {
          actionItems.push({ message: `${ds.dogName} has vaccination issues`, severity: 'critical', dogId: ds.dogId });
        }
      }
      const unpaidBookings = bookings.filter((b: any) => b.paymentStatus === 'unpaid' && b.status !== 'cancelled');
      if (unpaidBookings.length > 0) {
        actionItems.push({ message: `${unpaidBookings.length} unpaid booking(s)`, severity: 'warning' });
      }

      return { dogsCount: dogs.length, dogStatuses, upcomingStays, activeStays, actionItems };
    }),
    ownerDashboard: ownerProcedure.input(z.object({ kennelId: z.number() })).query(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
      await assertOwnerOwnsKennelId(ctx.user, input.kennelId);
      const today = new Date().toISOString().split('T')[0];
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      const monthStart = startOfMonth.toISOString().split('T')[0];

      const [bookings, rooms, payments] = await Promise.all([
        db.getBookingsByKennelId(input.kennelId),
        db.getRoomsByKennelId(input.kennelId),
        supabase.from('payments').select('*').eq('kennel_id', input.kennelId).then(r => r.data || []),
      ]);

      const todayBookings = bookings.filter((b: any) =>
        b.checkInDate <= today && (b.checkOutDate >= today || !b.checkOutDate) &&
        (b.status === 'confirmed' || b.status === 'checked_in')
      );
      const todayOccupancy = todayBookings.length;
      const totalCapacity = rooms.reduce((sum: number, r: any) => sum + (r.capacity || 1), 0) || 20;

      const paidStatuses = (s: string) => ["completed", "succeeded", "paid"].includes(String(s || "").toLowerCase());
      const monthPayments = (payments as any[]).filter((p: any) => p.created_at >= monthStart && paidStatuses(p.status));
      const monthRevenue = monthPayments.reduce((sum: number, p: any) => sum + parseFloat(String(p.amount || 0)), 0);
      const totalRevenue = (payments as any[]).filter((p: any) => paidStatuses(p.status)).reduce((sum: number, p: any) => sum + parseFloat(String(p.amount || 0)), 0);

      const pendingBookings = bookings.filter((b: any) => b.status === 'pending').length;
      const upcomingBookings = bookings.filter((b: any) => b.checkInDate > today && b.status !== 'cancelled').length;

      const activeBookings = bookings.filter((b: any) => b.status === 'checked_in').length;
      const totalBookings = bookings.length;

      return { todayOccupancy, totalCapacity, monthRevenue, totalRevenue, pendingBookings, upcomingBookings, activeBookings, totalBookings };
    }),
  }),

  // ===== OWNER REPORTS =====
  report: router({
    ownerSummary: ownerProcedure
      .input(
        z.object({
          kennelId: z.number(),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
          vaccineWindowDays: z.number().optional(),
        }),
      )
      .query(async ({ ctx, input }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
        await assertOwnerOwnsKennelId(ctx.user, input.kennelId);

        const today = new Date();
        const todayStr = today.toISOString().split("T")[0];
        const start = input.startDate || todayStr;
        const end = input.endDate || todayStr;
        const vaccineWindowDays = Math.max(1, input.vaccineWindowDays || 30);
        const vaxSoonEnd = new Date(today.getTime() + vaccineWindowDays * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0];

        const [bookings, dogs, assocRows] = await Promise.all([
          db.getBookingsByKennelId(input.kennelId),
          db.getDogsForKennelWithBookings(input.kennelId),
          supabase
            .from("customer_kennel_associations")
            .select("customer_id")
            .eq("kennel_id", input.kennelId),
        ]);
        if (assocRows.error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: assocRows.error.message });
        const assocCustomerIds = Array.from(new Set((assocRows.data || []).map((r: any) => r.customer_id).filter(Boolean)));
        let assocDogsRows: any[] = [];
        if (assocCustomerIds.length > 0) {
          const { data: linkedDogs, error: linkedDogsErr } = await supabase
            .from("dogs")
            .select("*")
            .in("owner_id", assocCustomerIds);
          if (linkedDogsErr) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: linkedDogsErr.message });
          assocDogsRows = (linkedDogs || []).map((d: any) => db.mapDogRow(d));
        }
        const dogByIdMerged = new Map<number, any>();
        for (const d of dogs || []) dogByIdMerged.set(Number(d.id), d);
        for (const d of assocDogsRows || []) dogByIdMerged.set(Number(d.id), d);
        const dogRows = Array.from(dogByIdMerged.values());
        const bookingIds = (bookings || []).map((b: any) => b.id);
        const dogIds = dogRows.map((d: any) => d.id);
        const [payments, addOns, rooms, vaccinations] = await Promise.all([
          supabase.from("payments").select("id,amount,status,created_at,booking_id").eq("kennel_id", input.kennelId),
          supabase
            .from("booking_add_ons")
            .select("id,booking_id,completed,add_on_id,checkout_add_ons(name,price)")
            .in("booking_id", bookingIds.length ? bookingIds : [-1]),
          db.getRoomsByKennelIdWithOccupancy(input.kennelId, { asOfDate: todayStr }),
          supabase
            .from("vaccinations")
            .select("id,dog_id,vaccine_name,expiration_date,status")
            .in("dog_id", dogIds.length ? dogIds : [-1]),
        ]);
        if (payments.error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: payments.error.message });
        if (addOns.error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: addOns.error.message });
        if (vaccinations.error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: vaccinations.error.message });
        const reqVax = await supabase
          .from("kennel_required_vaccines")
          .select("vaccine_name")
          .eq("kennel_id", input.kennelId);
        const reqVaxErrMsg = String(reqVax.error?.message || "").toLowerCase();
        if (reqVax.error && !(reqVaxErrMsg.includes("does not exist") || reqVaxErrMsg.includes("schema cache"))) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: reqVax.error.message });
        }

        const bookingRows = bookings || [];
        const paymentRows = payments.data || [];
        const addOnRows = addOns.data || [];
        const roomRows = rooms || [];
        const vaxRows = vaccinations.data || [];

        const byDayInRange = bookingRows.filter((b: any) => {
          const ci = String(b.checkInDate || "").split("T")[0];
          return ci >= start && ci <= end;
        });
        const byDayOutRange = bookingRows.filter((b: any) => {
          const co = String(b.checkOutDate || "").split("T")[0];
          return co && co >= start && co <= end;
        });

        const checkedInToday = bookingRows.filter(
          (b: any) => String(b.checkInDate || "").split("T")[0] === todayStr && b.status === "checked_in",
        );
        const checkedOutToday = bookingRows.filter((b: any) => {
          const co = String(b.checkOutDate || "").split("T")[0];
          if (!co) return false;
          return co === todayStr && (b.status === "checked_out" || b.status === "completed");
        });
        const noShows = bookingRows.filter(
          (b: any) => String(b.checkInDate || "").split("T")[0] === todayStr && b.status === "cancelled",
        );

        const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const dogBirthdayList = dogRows
          .filter((d: any) => !!d.birthday)
          .map((d: any): { dogId: number; dogName: string; birthday: string; nextBirthday: string } | null => {
            const b = String(d.birthday).split("T")[0];
            const parts = b.split("-").map((x) => parseInt(x, 10));
            if (parts.length < 3 || Number.isNaN(parts[1]) || Number.isNaN(parts[2])) return null;
            const m = parts[1];
            const day = parts[2];
            const next = new Date(todayDateOnly.getFullYear(), m - 1, day);
            if (next.getTime() < todayDateOnly.getTime()) next.setFullYear(next.getFullYear() + 1);
            return { dogId: d.id, dogName: d.name, birthday: b, nextBirthday: localDateKey(next) };
          })
          .filter((d): d is { dogId: number; dogName: string; birthday: string; nextBirthday: string } => !!d)
          .sort((a, b) => a.nextBirthday.localeCompare(b.nextBirthday));

        const upcomingBirthdays = dogBirthdayList.filter(
          (d) => d.nextBirthday >= start && d.nextBirthday <= end,
        );

        const dogById = new Map<number, any>(dogRows.map((d: any) => [d.id, d]));
        const requiredLabels = (reqVax.data || [])
          .map((r: any) => String(r.vaccine_name || "").trim())
          .filter(Boolean);
        const vaxByDog = new Map<number, any[]>();
        for (const v of vaxRows) {
          const did = Number(v.dog_id);
          if (!vaxByDog.has(did)) vaxByDog.set(did, []);
          vaxByDog.get(did)!.push(v);
        }
        const expiredVaccinations = vaxRows
          .filter((v: any) => v.status === "expired" || (v.expiration_date && v.expiration_date < todayStr))
          .map((v: any) => ({
            dogId: v.dog_id,
            dogName: dogById.get(v.dog_id)?.name || `Dog #${v.dog_id}`,
            vaccineName: v.vaccine_name,
            expirationDate: v.expiration_date,
            status: v.status,
          }));
        const missingVaccinations = requiredLabels.flatMap((label) =>
          dogRows.flatMap((d: any) => {
            const rows = vaxByDog.get(Number(d.id)) || [];
            const match = rows.find((v: any) => normalizeVaccineLabel(v.vaccine_name) === normalizeVaccineLabel(label));
            const expired = !!match && (
              String(match.status || "").toLowerCase() === "expired" ||
              (match.expiration_date && String(match.expiration_date) < todayStr)
            );
            if (match && !expired) return [];
            return [{
              dogId: d.id,
              dogName: d.name || `Dog #${d.id}`,
              vaccineName: label,
              expirationDate: match?.expiration_date || null,
              status: "missing",
            }];
          })
        );
        const soonVaccinations = vaxRows
          .filter(
            (v: any) =>
              v.expiration_date &&
              v.expiration_date >= todayStr &&
              v.expiration_date <= vaxSoonEnd &&
              v.status !== "expired",
          )
          .map((v: any) => ({
            dogId: v.dog_id,
            dogName: dogById.get(v.dog_id)?.name || `Dog #${v.dog_id}`,
            vaccineName: v.vaccine_name,
            expirationDate: v.expiration_date,
            status: v.status,
          }));

        const paymentIsPaid = (p: any) => ["succeeded", "completed", "paid"].includes(String(p.status || "").toLowerCase());
        const dailyRevenue = paymentRows
          .filter((p: any) => paymentIsPaid(p) && String(p.created_at || "").split("T")[0] === todayStr)
          .reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        const weekStartStr = weekStart.toISOString().split("T")[0];
        const monthlyStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
        const weeklyRevenue = paymentRows
          .filter((p: any) => paymentIsPaid(p) && String(p.created_at || "").split("T")[0] >= weekStartStr)
          .reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
        const monthlyRevenue = paymentRows
          .filter((p: any) => paymentIsPaid(p) && String(p.created_at || "").split("T")[0] >= monthlyStart)
          .reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
        const unpaidBalances = bookingRows
          .filter((b: any) => ["unpaid", "partial"].includes(String(b.paymentStatus || "").toLowerCase()))
          .map((b: any) => ({
            bookingId: b.id,
            dogName: (b as any).dogNames?.join(", ") || b.dogName || `Booking #${b.id}`,
            amount: Number(b.totalPrice || 0),
            paymentStatus: b.paymentStatus || "unpaid",
            checkInDate: b.checkInDate,
          }));

        const statusCounts = bookingRows.reduce((acc: Record<string, number>, b: any) => {
          acc[b.status] = (acc[b.status] || 0) + 1;
          return acc;
        }, {});

        const occupancy = {
          occupied: roomRows.reduce((s: number, r: any) => s + (r.currentOccupancy || 0), 0),
          capacity: roomRows.reduce((s: number, r: any) => s + (r.capacity || 0), 0),
        };

        const addOnSummary = addOnRows.reduce((acc: Record<string, { scheduled: number; completed: number }>, row: any) => {
          const name = row.checkout_add_ons?.name || `Add-on #${row.add_on_id}`;
          if (!acc[name]) acc[name] = { scheduled: 0, completed: 0 };
          acc[name].scheduled += 1;
          if (row.completed) acc[name].completed += 1;
          return acc;
        }, {});

        return {
          range: { startDate: start, endDate: end, vaccineWindowDays },
          birthdays: { upcoming: upcomingBirthdays, allWithBirthdays: dogBirthdayList },
          vaccinations: {
            expired: expiredVaccinations,
            missing: missingVaccinations,
            soon: soonVaccinations,
          },
          endOfDay: {
            checkedInToday: checkedInToday.length,
            checkedOutToday: checkedOutToday.length,
            cancelledOrDeniedToday: noShows.length,
            addOnTaskSummary: addOnSummary,
          },
          financials: {
            dailyRevenue,
            weeklyRevenue,
            monthlyRevenue,
            unpaidBalances,
          },
          operations: {
            statusCounts,
            occupancy,
            checkInsInRange: byDayInRange.length,
            checkOutsInRange: byDayOutRange.length,
          },
        };
      }),
    ownerDirectory: ownerProcedure
      .input(z.object({ kennelId: z.number() }))
      .query(async ({ ctx, input }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
        await assertOwnerOwnsKennelId(ctx.user, input.kennelId);

        const [bookings, dogs, rooms, assocRows] = await Promise.all([
          db.getBookingsByKennelId(input.kennelId),
          db.getDogsForKennelWithBookings(input.kennelId),
          db.getRoomsByKennelIdWithOccupancy(input.kennelId),
          supabase
            .from("customer_kennel_associations")
            .select("customer_id")
            .eq("kennel_id", input.kennelId),
        ]);
        if (assocRows.error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: assocRows.error.message });
        const bookingRows = bookings || [];
        const baseDogRows = dogs || [];
        const assocCustomerIds = Array.from(
          new Set((assocRows.data || []).map((r: any) => r.customer_id).filter(Boolean)),
        );
        let assocDogsRows: any[] = [];
        if (assocCustomerIds.length) {
          const { data, error: assocDogsErr } = await supabase
            .from("dogs")
            .select("*")
            .in("owner_id", assocCustomerIds);
          if (assocDogsErr) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: assocDogsErr.message });
          assocDogsRows = data || [];
        }
        // Merge dogs from kennel/bookings with dogs from linked customers to avoid missing pets.
        const dogById = new Map<number, any>();
        for (const d of baseDogRows) dogById.set(d.id, d);
        for (const raw of assocDogsRows || []) {
          const mapped = db.mapDogRow(raw as any);
          dogById.set(mapped.id, mapped);
        }
        const dogRows = Array.from(dogById.values());
        const roomById = new Map<number, any>((rooms || []).map((r: any) => [r.id, r]));

        // Include every owner linked through dogs plus anyone present on bookings.
        const ownerIds = Array.from(
          new Set(
            [
              ...dogRows.map((d: any) => d.ownerId).filter(Boolean),
              ...bookingRows.map((b: any) => b.customerId).filter(Boolean),
            ],
          ),
        );
        let usersRows: any[] = [];
        if (ownerIds.length) {
          const { data, error: usersErr } = await supabase.from("users").select("*").in("id", ownerIds);
          if (usersErr) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: usersErr.message });
          usersRows = data || [];
        }
        const userById = new Map<string, any>((usersRows || []).map((u: any) => [u.id, u]));

        const ownerIdsNeedingAuthName = ownerIds.filter((oid) => {
          const u = userById.get(oid) as Record<string, unknown> | undefined;
          const em = trimStr(u?.email);
          const n = trimStr(u?.name ?? u?.full_name);
          return !isUsableDisplayName(n, em);
        });
        const authMetaNameById = await fetchAuthMetadataNames(supabase, ownerIdsNeedingAuthName);

        const dogIds = dogRows.map((d: any) => d.id);
        const { data: vaxRows, error: vaxErr } = await supabase
          .from("vaccinations")
          .select("dog_id,vaccine_name,status,expiration_date,date_administered")
          .in("dog_id", dogIds.length ? dogIds : [-1]);
        if (vaxErr) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: vaxErr.message });

        let badgeAssignRows: { dog_id: number; badge_key: string }[] = [];
        const { data: baData, error: baErr } = await supabase
          .from("dog_badge_assignments")
          .select("dog_id,badge_key")
          .in("dog_id", dogIds.length ? dogIds : [-1]);
        if (baErr) {
          const msg = String(baErr.message || "").toLowerCase();
          if (!(msg.includes("dog_badge_assignments") && msg.includes("does not exist"))) {
            throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: baErr.message });
          }
        } else {
          badgeAssignRows = (baData || []) as { dog_id: number; badge_key: string }[];
        }
        const badgeKeysByDog = new Map<number, string[]>();
        for (const row of badgeAssignRows) {
          const did = row.dog_id as number;
          const k = String(row.badge_key || "").trim().toLowerCase();
          if (!k) continue;
          if (!badgeKeysByDog.has(did)) badgeKeysByDog.set(did, []);
          if (!badgeKeysByDog.get(did)!.includes(k)) badgeKeysByDog.get(did)!.push(k);
        }
        const reqVax = await supabase
          .from("kennel_required_vaccines")
          .select("vaccine_name")
          .eq("kennel_id", input.kennelId);
        const reqVaxErrMsg = String(reqVax.error?.message || "").toLowerCase();
        if (reqVax.error && !(reqVaxErrMsg.includes("does not exist") || reqVaxErrMsg.includes("schema cache"))) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: reqVax.error.message });
        }
        const requiredLabels = (reqVax.data || []).map((r: any) => String(r.vaccine_name || "").trim()).filter(Boolean);
        const vaxByDog = new Map<number, any[]>();
        for (const v of vaxRows || []) {
          const did = v.dog_id as number;
          if (!vaxByDog.has(did)) vaxByDog.set(did, []);
          vaxByDog.get(did)!.push(v);
        }

        const todayStr = new Date().toISOString().split("T")[0];
        const activeByDog = new Map<number, any>();
        for (const b of bookingRows) {
          if (String(b.status) !== "checked_in") continue;
          const ids: number[] =
            Array.isArray((b as any).dogIdsOnBooking) && (b as any).dogIdsOnBooking.length
              ? (b as any).dogIdsOnBooking
              : [b.dogId];
          for (const did of ids) {
            activeByDog.set(did, b);
          }
        }

        const pets = dogRows.map((d: any) => {
          const ownerBooking = bookingRows.find((b: any) => {
            const ids: number[] =
              Array.isArray((b as any).dogIdsOnBooking) && (b as any).dogIdsOnBooking.length
                ? (b as any).dogIdsOnBooking
                : [b.dogId];
            return ids.includes(d.id);
          });
          const ownerId = d.ownerId || ownerBooking?.customerId || null;
          const owner = ownerId ? userById.get(ownerId) : null;
          const ownerPhone = owner?.phone ?? owner?.phone_number ?? null;
          const ownerDisplayName = resolveOwnerDisplayName(
            owner,
            ownerId ? authMetaNameById.get(ownerId) ?? null : null,
            owner?.email,
          );
          const vr = vaxByDog.get(d.id) || [];
          const hasExpired = vr.some((x) => x.status === "expired" || (x.expiration_date && x.expiration_date < todayStr));
          const hasSoon = vr.some((x) => x.expiration_date && x.expiration_date >= todayStr);
          const missingRequired = requiredLabels.some((label) => {
            const match = vr.find(
              (x: any) => normalizeVaccineLabel(String(x.vaccine_name || "")) === normalizeVaccineLabel(label),
            );
            if (!match) return true;
            if ((match as any).status === "expired") return true;
            if ((match as any).expiration_date && (match as any).expiration_date < todayStr) return true;
            return false;
          });
          const vaccineStatus = missingRequired ? "missing_required" : hasExpired ? "expired" : hasSoon ? "on_file" : "none";
          const active = activeByDog.get(d.id);
          const activeRoom = active?.roomId ? roomById.get(active.roomId) : null;
          const vaccinations = vr.map((x: any) => ({
            vaccineName: String(x.vaccine_name || "").trim() || "Vaccination",
            expirationDate: x.expiration_date ?? null,
            dateAdministered: x.date_administered ?? null,
            status: x.status ?? null,
          }));
          const badgeKeys = badgeKeysByDog.get(d.id) || [];
          return {
            dogId: d.id,
            dogName: d.name,
            ownerId,
            ownerName: ownerDisplayName,
            ownerEmail: owner?.email || null,
            ownerPhone: ownerPhone ? String(ownerPhone) : null,
            breed: d.breed || null,
            age: d.age ?? null,
            birthday: d.birthday ?? null,
            vaccineStatus,
            vaccinations,
            badgeKeys,
            currentRoomName: activeRoom?.name || null,
            currentBuilding: activeRoom?.building || null,
            checkedIn: !!active,
          };
        });

        const petsByOwner = new Map<string, any[]>();
        for (const p of pets) {
          const key = p.ownerId || "__unknown__";
          if (!petsByOwner.has(key)) petsByOwner.set(key, []);
          petsByOwner.get(key)!.push(p);
        }

        const owners = ownerIds.map((oid) => {
          const u = userById.get(oid);
          const ownerPets = petsByOwner.get(oid) || [];
          const ownerBookings = bookingRows.filter((b: any) => b.customerId === oid);
          const displayName = resolveOwnerDisplayName(u, authMetaNameById.get(oid) ?? null, u?.email);
          const phone = u?.phone ?? u?.phone_number ?? null;
          return {
            ownerId: oid,
            name: displayName,
            email: u?.email || null,
            phone: phone ? String(phone) : null,
            city: u?.city != null ? String(u.city) : null,
            state: u?.state != null ? String(u.state) : null,
            zip: u?.zip != null ? String(u.zip) : null,
            petCount: ownerPets.length,
            totalBookings: ownerBookings.length,
            activeStays: ownerBookings.filter((b: any) => b.status === "checked_in").length,
            pets: ownerPets.map((p) => ({
              dogId: p.dogId,
              dogName: p.dogName,
              vaccineStatus: p.vaccineStatus,
              vaccinations: p.vaccinations,
              badgeKeys: p.badgeKeys,
            })),
          };
        })
          .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), undefined, { sensitivity: "base" }));

        const petsSorted = [...pets].sort((a, b) =>
          String(a.dogName || "").localeCompare(String(b.dogName || ""), undefined, { sensitivity: "base" }),
        );

        return { owners, pets: petsSorted };
      }),
    updateDirectoryCustomer: ownerProcedure
      .input(
        z.object({
          kennelId: z.number(),
          customerId: z.string().min(1),
          name: z.string().trim().optional(),
          email: z.string().email().optional(),
          phone: z.string().optional().nullable(),
          city: z.string().optional().nullable(),
          state: z.string().optional().nullable(),
          zip: z.string().optional().nullable(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await assertOwnerOwnsKennelId(ctx.user!, input.kennelId);
        await assertCustomerLinkedToKennel(input.kennelId, input.customerId);
        const updates: Record<string, unknown> = {};
        if (input.name !== undefined) updates.name = input.name;
        if (input.email !== undefined) updates.email = input.email;
        if (input.phone !== undefined) updates.phone = input.phone === "" ? null : input.phone;
        if (input.city !== undefined) updates.city = input.city === "" ? null : input.city;
        if (input.state !== undefined) updates.state = input.state === "" ? null : input.state;
        if (input.zip !== undefined) updates.zip = input.zip === "" ? null : input.zip;
        if (!Object.keys(updates).length) {
          return { success: true as const };
        }
        try {
          await db.updateUser(input.customerId, updates as Record<string, any>);
        } catch (e: any) {
          const msg = String(e?.message || "");
          const lower = msg.toLowerCase();
          if (lower.includes("does not exist") && (lower.includes("city") || lower.includes("state") || lower.includes("zip"))) {
            const { city, state, zip, ...rest } = updates as Record<string, any>;
            if (Object.keys(rest).length) {
              await db.updateUser(input.customerId, rest);
            }
            throw new TRPCError({
              code: "PRECONDITION_FAILED",
              message:
                "Saved contact info, but this database is missing users.city/state/zip columns. Run: ALTER TABLE users ADD COLUMN IF NOT EXISTS city TEXT; ADD COLUMN IF NOT EXISTS state TEXT; ADD COLUMN IF NOT EXISTS zip TEXT;",
            });
          }
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: msg || "Could not update customer" });
        }
        return { success: true as const };
      }),
    updateDirectoryDog: ownerProcedure
      .input(
        z.object({
          kennelId: z.number(),
          dogId: z.number(),
          name: z.string().optional(),
          breed: z.string().optional().nullable(),
          weight: z.number().optional().nullable(),
          birthday: z.string().nullable().optional(),
          age: z.number().optional().nullable(),
          emergencyContactName: z.string().optional().nullable(),
          emergencyContactPhone: z.string().optional().nullable(),
          specialNeeds: z.string().nullable().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await assertOwnerOwnsKennelId(ctx.user!, input.kennelId);
        await assertDogVisibleAtKennel(input.kennelId, input.dogId);
        const {
          dogId,
          name,
          breed,
          weight,
          birthday,
          age,
          emergencyContactName,
          emergencyContactPhone,
          specialNeeds,
        } = input;
        const updates: Record<string, unknown> = {};
        if (name !== undefined) updates.name = name;
        if (breed !== undefined) updates.breed = breed;
        if (weight !== undefined) updates.weight = weight;
        if (birthday !== undefined) updates.birthday = birthday;
        if (age !== undefined) updates.age = age;
        if (emergencyContactName !== undefined) updates.emergency_contact_name = emergencyContactName;
        if (emergencyContactPhone !== undefined) updates.emergency_contact_phone = emergencyContactPhone;
        if (specialNeeds !== undefined) updates.special_needs = specialNeeds;
        if (!Object.keys(updates).length) return { success: true as const };
        await db.updateDog(dogId, updates as Record<string, unknown>);
        return { success: true as const };
      }),
  }),

  // ===== ALERTS ROUTES =====
  alert: router({
    list: employeeProcedure.input(z.object({ kennelId: z.number() })).query(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
      await assertEmployeeOrOwnerKennel(ctx.user, input.kennelId);
      return db.getAlertsByKennelId(input.kennelId);
    }),
    byKennel: protectedProcedure.input(z.object({ kennelId: z.number() })).query(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
      await assertEmployeeOrOwnerKennel(ctx.user, input.kennelId);
      return db.getAlertsByKennelId(input.kennelId);
    }),
    myAlerts: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .eq('user_id', ctx.user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) {
        const msg = String(error.message || "").toLowerCase();
        // Alerts table may be kennel-scoped only in some schemas (no user_id).
        if (msg.includes("user_id") && msg.includes("does not exist")) return [];
        return [];
      }
      return await db.mapRawAlertsToClientRows(data || []);
    }),
    markRead: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
      const { data: row, error: fetchErr } = await supabase.from("alerts").select("*").eq("id", input.id).maybeSingle();
      if (fetchErr) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: fetchErr.message });
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Alert not found" });
      const r = row as Record<string, unknown>;
      const rowUserId = r.user_id != null && r.user_id !== "" ? String(r.user_id) : null;
      if (rowUserId && rowUserId === ctx.user.id) {
        console.log(`[auth] alert.markRead ok userId=${ctx.user.id} alertId=${input.id} via=user_id`);
      } else if (r.booking_id != null) {
        const booking = await loadBookingForAccess(Number(r.booking_id));
        if (booking.customerId !== ctx.user.id) {
          await assertEmployeeOrOwnerKennel(ctx.user, booking.kennelId);
          console.log(
            `[auth] alert.markRead ok userId=${ctx.user.id} alertId=${input.id} kennelId=${booking.kennelId} via=staff`,
          );
        } else {
          console.log(`[auth] alert.markRead ok userId=${ctx.user.id} alertId=${input.id} via=bookingCustomer`);
        }
      } else {
        const kid = Number(r.kennel_id);
        await assertEmployeeOrOwnerKennel(ctx.user, kid);
        console.log(`[auth] alert.markRead ok userId=${ctx.user.id} alertId=${input.id} kennelId=${kid} via=kennelStaff`);
      }
      let { error } = await supabase
        .from('alerts')
        .update({ is_resolved: true })
        .eq('id', input.id);
      if (error) {
        const msg = String(error.message || "").toLowerCase();
        if (msg.includes("is_resolved") && msg.includes("does not exist")) {
          const retry = await supabase
            .from('alerts')
            .update({ is_read: true })
            .eq('id', input.id);
          error = retry.error;
        }
      }
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      return { success: true };
    }),
    missingDogInfo: protectedProcedure.input(z.object({ kennelId: z.number() })).query(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
      await assertEmployeeOrOwnerKennel(ctx.user, input.kennelId);
      const bookings = await db.getBookingsByKennelId(input.kennelId);
      const issues: {
        bookingId: number;
        dogId: number | null;
        dogName: string;
        details: string;
        checkInDate: string;
        bookingStatus: string;
      }[] = [];
      for (const b of bookings) {
        if (!["pending", "confirmed", "checked_in"].includes(b.status)) continue;
        const rows = (b as any).vaccineIssueRows as Array<{ detail: string }> | undefined;
        if (!rows?.length) continue;
        const primaryDogId =
          (b as any).dogIdsOnBooking?.[0] != null
            ? Number((b as any).dogIdsOnBooking[0])
            : b.dogId != null
              ? Number(b.dogId)
              : null;
        issues.push({
          bookingId: b.id,
          dogId: Number.isFinite(primaryDogId as number) ? (primaryDogId as number) : null,
          dogName: (b as any).dogNames?.join(", ") || b.dogName || "Dog",
          details: rows.map((r) => r.detail).join(" · "),
          checkInDate: String(b.checkInDate || ""),
          bookingStatus: b.status,
        });
      }
      return issues;
    }),
    /** Per-dog required-vaccine issues vs kennel rules (owner + employee alerts). */
    vaccineCompliance: protectedProcedure.input(z.object({ kennelId: z.number() })).query(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
      await assertEmployeeOrOwnerKennel(ctx.user, input.kennelId);
      const bookings = await db.getBookingsByKennelId(input.kennelId);
      const kennelDogs = await db.getDogsForKennelWithBookings(input.kennelId);
      const today = new Date().toISOString().split("T")[0];
      const assocRows = await supabase
        .from("customer_kennel_associations")
        .select("customer_id")
        .eq("kennel_id", input.kennelId);
      if (assocRows.error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: assocRows.error.message });
      const assocCustomerIds = Array.from(new Set((assocRows.data || []).map((r: any) => r.customer_id).filter(Boolean)));
      let assocDogs: any[] = [];
      if (assocCustomerIds.length > 0) {
        const assocDogsRes = await supabase
          .from("dogs")
          .select("*")
          .in("owner_id", assocCustomerIds);
        if (assocDogsRes.error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: assocDogsRes.error.message });
        assocDogs = (assocDogsRes.data || []).map((d: any) => db.mapDogRow(d));
      }
      const scopeDogById = new Map<number, any>();
      for (const d of kennelDogs || []) scopeDogById.set(Number(d.id), d);
      for (const d of assocDogs || []) scopeDogById.set(Number(d.id), d);
      const scopeDogs = Array.from(scopeDogById.values());

      const customerIds = Array.from(new Set([
        ...bookings.map((b: any) => b.customerId).filter(Boolean),
        ...scopeDogs.map((d: any) => d.ownerId).filter(Boolean),
      ]));
      let customerDisplayById = new Map<string, string>();
      if (customerIds.length > 0) {
        const { data: usersRows, error: usersError } = await supabase
          .from("users")
          .select("id,email,name,full_name")
          .in("id", customerIds as string[]);
        if (usersError) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: usersError.message });
        const rows = usersRows || [];
        customerDisplayById = await resolveDisplayNamesForUsers(supabase, rows);
      }
      const out: {
        bookingId: number;
        dogId: number;
        dogName: string;
        customerName: string;
        vaccineLabel: string;
        kind: string;
        detail: string;
        checkInDate: string;
        bookingStatus: string;
      }[] = [];
      for (const b of bookings) {
        if (!["pending", "confirmed", "checked_in"].includes(b.status)) continue;
        const vRows = (b as any).vaccineIssueRows as
          | Array<{ dogId: number; dogName: string; vaccineLabel: string; kind: string; detail: string }>
          | undefined;
        if (!vRows?.length) continue;
        const customerName = customerDisplayById.get(String(b.customerId)) || "Customer";
        for (const issue of vRows) {
          out.push({
            bookingId: b.id,
            dogId: issue.dogId,
            dogName: issue.dogName,
            customerName,
            vaccineLabel: issue.vaccineLabel,
            kind: issue.kind,
            detail: issue.detail,
            checkInDate: String(b.checkInDate || ""),
            bookingStatus: b.status,
          });
        }
      }

      const allDogIds = Array.from(new Set(scopeDogs.map((d: any) => Number(d.id)).filter(Boolean))) as number[];
      const vaxRes = allDogIds.length
        ? await supabase
            .from("vaccinations")
            .select("dog_id,vaccine_name,expiration_date,status")
            .in("dog_id", allDogIds)
        : { data: [] as any[], error: null as any };
      if (vaxRes.error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: vaxRes.error.message });
      const vaxByDog = new Map<number, any[]>();
      for (const row of vaxRes.data || []) {
        const did = Number((row as any).dog_id);
        if (!vaxByDog.has(did)) vaxByDog.set(did, []);
        vaxByDog.get(did)!.push(row);
      }
      const bookingByDog = new Map<number, any>();
      for (const b of bookings) {
        const ids: number[] =
          Array.isArray((b as any).dogIdsOnBooking) && (b as any).dogIdsOnBooking.length
            ? (b as any).dogIdsOnBooking
            : [b.dogId];
        for (const did of ids) bookingByDog.set(Number(did), b);
      }
      const seenByDogAndLabel = new Set(out.map((r) => `${r.dogId}:${normalizeVaccineLabel(r.vaccineLabel)}:${r.kind}`));
      for (const d of scopeDogs as any[]) {
        const did = Number(d.id);
        if (!did) continue;
        const rows = vaxByDog.get(did) || [];
        const customerName = d.ownerId ? customerDisplayById.get(String(d.ownerId)) || "Customer" : "Customer";
        const booking = bookingByDog.get(did);
        const bookingId = Number(booking?.id || 0);
        const checkInDate = String(booking?.checkInDate || today);
        const bookingStatus = String(booking?.status || "profile_incomplete");
        if (rows.length === 0) {
          const k = `${did}:vaccination records:missing`;
          if (!seenByDogAndLabel.has(k)) {
            seenByDogAndLabel.add(k);
            out.push({
              bookingId,
              dogId: did,
              dogName: d.name || "Dog",
              customerName,
              vaccineLabel: "Vaccination records",
              kind: "missing",
              detail: "No vaccines on file",
              checkInDate,
              bookingStatus,
            });
          }
        }
        const hasExpired = rows.some((v: any) =>
          String(v.status || "").toLowerCase() === "expired" ||
          (v.expiration_date && String(v.expiration_date) < today)
        );
        if (hasExpired) {
          const k = `${did}:vaccination records:expired`;
          if (!seenByDogAndLabel.has(k)) {
            seenByDogAndLabel.add(k);
            out.push({
              bookingId,
              dogId: did,
              dogName: d.name || "Dog",
              customerName,
              vaccineLabel: "Vaccination records",
              kind: "expired",
              detail: "At least one vaccine is expired",
              checkInDate,
              bookingStatus,
            });
          }
        }
      }

      // Include dogs in kennel with required vaccines missing/expired even without active bookings.
      const reqRows = await supabase
        .from("kennel_required_vaccines")
        .select("vaccine_name")
        .eq("kennel_id", input.kennelId);
      const reqErrMsg = String(reqRows.error?.message || "").toLowerCase();
      if (reqRows.error && !(reqErrMsg.includes("does not exist") || reqErrMsg.includes("schema cache"))) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: reqRows.error.message });
      }
      const requiredLabels = (reqRows.data || []).map((r: any) => String(r.vaccine_name || "").trim()).filter(Boolean);
      const normalized = (s: unknown) => String(s || "").trim().toLowerCase();
      if (requiredLabels.length > 0 && scopeDogs.length > 0) {
        for (const d of scopeDogs as any[]) {
          const did = Number(d.id);
          const rows = vaxByDog.get(did) || [];
          const customerName = d.ownerId ? customerDisplayById.get(String(d.ownerId)) || "Customer" : "Customer";
          const booking = bookingByDog.get(did);
          const bookingId = Number(booking?.id || 0);
          const checkInDate = String(booking?.checkInDate || today);
          const bookingStatus = String(booking?.status || "profile_incomplete");
          for (const label of requiredLabels) {
            const match = rows.find((v: any) => normalized(v.vaccine_name) === normalized(label));
            const missing = !match;
            const expired = !!match && (
              String(match.status || "").toLowerCase() === "expired" ||
              (match.expiration_date && String(match.expiration_date) < today)
            );
            if (!missing && !expired) continue;
            const kind = missing ? "missing" : "expired";
            const k = `${did}:${normalized(label)}:${kind}`;
            if (seenByDogAndLabel.has(k)) continue;
            seenByDogAndLabel.add(k);
            out.push({
              bookingId,
              dogId: did,
              dogName: d.name || "Dog",
              customerName,
              vaccineLabel: label,
              kind,
              detail: missing ? "Required vaccine missing" : "Required vaccine expired",
              checkInDate,
              bookingStatus,
            });
          }
        }
      }
      return out;
    }),
    /** Checked-in dogs without room assignment, with dog + customer display data */
    unassignedRooms: employeeProcedure.input(z.object({ kennelId: z.number() })).query(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
      await assertEmployeeOrOwnerKennel(ctx.user, input.kennelId);

      const bookings = await db.getBookingsByKennelId(input.kennelId);
      const unassigned = bookings.filter((b: any) => b.status === "checked_in" && !b.roomId);
      if (unassigned.length === 0) return [];

      return unassigned.map((b: any) => {
        const customerEmail = b.customerEmail ?? null;
        const customerName = b.customerName || customerEmail || "Customer";
        const customerLabel = customerName;
        return {
          bookingId: b.id,
          dogId: b.dogId,
          dogName: b.dogName || (b.dogNames?.length ? b.dogNames.join(", ") : `Dog #${b.dogId}`),
          customerName,
          customerEmail,
          customerLabel,
          checkInDate: b.checkInDate,
        };
      });
    }),
  }),

  // ===== CUSTOMER KENNEL ROUTES =====
  customerKennel: router({
    myLinkedKennels: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
      const [{ data: assoc, error: assocError }, { data: favRows, error: favError }] = await Promise.all([
        supabase
          .from('customer_kennel_associations')
          .select('kennel_id, kennels(id, name, phone, email)')
          .eq('customer_id', ctx.user.id),
        supabase.from('kennel_favorites').select('kennel_id').eq('user_id', ctx.user.id),
      ]);
      if (assocError) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: assocError.message });
      if (favError) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: favError.message });
      const favSet = new Set((favRows || []).map((r: { kennel_id: number }) => r.kennel_id));
      return (assoc || []).map((row: any) => ({
        kennelId: row.kennel_id,
        kennelName: row.kennels?.name || `Kennel #${row.kennel_id}`,
        kennelPhone: row.kennels?.phone || null,
        kennelEmail: row.kennels?.email || null,
        isFavorite: favSet.has(row.kennel_id),
      }));
    }),
    link: protectedProcedure.input(z.object({ kennelId: z.number() })).mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
      const { error } = await supabase
        .from('customer_kennel_associations')
        .upsert(
          [{ kennel_id: input.kennelId, customer_id: ctx.user.id }],
          { onConflict: 'customer_id,kennel_id' },
        );
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      return { success: true };
    }),
    unlink: protectedProcedure.input(z.object({ kennelId: z.number() })).mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
      const { error } = await supabase
        .from('customer_kennel_associations')
        .delete()
        .eq('kennel_id', input.kennelId)
        .eq('customer_id', ctx.user.id);
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      return { success: true };
    }),
    toggleFavorite: protectedProcedure.input(z.object({ kennelId: z.number() })).mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
      const { data: existing } = await supabase
        .from('kennel_favorites')
        .select('id')
        .eq('user_id', ctx.user.id)
        .eq('kennel_id', input.kennelId)
        .maybeSingle();
      if (existing) {
        const { error } = await supabase
          .from('kennel_favorites')
          .delete()
          .eq('user_id', ctx.user.id)
          .eq('kennel_id', input.kennelId);
        if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
        return { success: true, isFavorite: false };
      }
      const { error } = await supabase
        .from('kennel_favorites')
        .insert([{ user_id: ctx.user.id, kennel_id: input.kennelId }]);
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      return { success: true, isFavorite: true };
    }),
  }),

  // ===== REQUIRED VACCINES ROUTES =====
  // NOTE: requires kennel_required_vaccines table - run MIGRATION_R24.sql in Supabase if not yet done
  requiredVaccine: router({
    byKennel: protectedProcedure.input(z.object({ kennelId: z.number() })).query(async ({ input }) => {
      const { data, error } = await supabase
        .from('kennel_required_vaccines')
        .select('*')
        .eq('kennel_id', input.kennelId);
      // Gracefully return empty array if table doesn't exist yet (before migration)
      if (error) {
        if (error.message?.includes('does not exist') || error.message?.includes('schema cache')) {
          return [];
        }
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }
      return (data || []).map((r: any) => ({ id: r.id, kennelId: r.kennel_id, vaccineName: r.vaccine_name }));
    }),
    add: ownerProcedure.input(z.object({ kennelId: z.number(), vaccineName: z.string() })).mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
      await assertOwnerOwnsKennelId(ctx.user, input.kennelId);
      const { data, error } = await supabase
        .from('kennel_required_vaccines')
        .insert([{ kennel_id: input.kennelId, vaccine_name: input.vaccineName }])
        .select()
        .single();
      if (error) {
        if (error.message?.includes('does not exist') || error.message?.includes('schema cache')) {
          throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Required vaccines table not yet created. Please run MIGRATION_R24.sql in Supabase SQL Editor.' });
        }
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }
      return { id: data.id, kennelId: data.kennel_id, vaccineName: data.vaccine_name };
    }),
    remove: ownerProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
      const { data: row, error: fetchErr } = await supabase
        .from("kennel_required_vaccines")
        .select("kennel_id")
        .eq("id", input.id)
        .maybeSingle();
      if (fetchErr) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: fetchErr.message });
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Required vaccine row not found" });
      await assertOwnerOwnsKennelId(ctx.user, Number(row.kennel_id));
      const { error } = await supabase
        .from('kennel_required_vaccines')
        .delete()
        .eq('id', input.id);
      if (error) {
        if (error.message?.includes('does not exist') || error.message?.includes('schema cache')) {
          throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Required vaccines table not yet created. Please run MIGRATION_R24.sql in Supabase SQL Editor.' });
        }
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }
      return { success: true };
    }),
  }),

  // ===== BOOKING ADD-ONS ROUTES =====
  bookingAddOn: router({
    list: protectedProcedure.input(z.object({ bookingId: z.number() })).query(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
      const booking = await loadBookingForAccess(input.bookingId);
      if (booking.customerId !== ctx.user.id) {
        await assertEmployeeOrOwnerKennel(ctx.user, booking.kennelId);
      }
      return db.getBookingAddOns(input.bookingId);
    }),
    addToBooking: employeeProcedure.input(z.object({
      bookingId: z.number(),
      addOnId: z.number(),
      dogId: z.number(),
      price: z.number(),
    })).mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
      const booking = await loadBookingForAccess(input.bookingId);
      await assertEmployeeOrOwnerKennel(ctx.user, booking.kennelId);
      console.log(`[auth] bookingAddOn.addToBooking ok userId=${ctx.user.id} bookingId=${input.bookingId} kennelId=${booking.kennelId}`);
      return db.addBookingAddOn(input.bookingId, input.addOnId, input.dogId, input.price);
    }),
    markComplete: employeeProcedure.input(z.object({
      bookingId: z.number(),
      addOnId: z.number(),
    })).mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
      const booking = await loadBookingForAccess(input.bookingId);
      await assertEmployeeOrOwnerKennel(ctx.user, booking.kennelId);
      console.log(`[auth] bookingAddOn.markComplete ok userId=${ctx.user.id} bookingId=${input.bookingId} kennelId=${booking.kennelId}`);
      const patch = { completed: true, task_status: 'completed' as const };
      let { error } = await supabase
        .from('booking_add_ons')
        .update(patch)
        .eq('booking_id', input.bookingId)
        .eq('add_on_id', input.addOnId);
      if (error && (String(error.message).includes('task_status') || String(error).includes('task_status'))) {
        ({ error } = await supabase
          .from('booking_add_ons')
          .update({ completed: true })
          .eq('booking_id', input.bookingId)
          .eq('add_on_id', input.addOnId));
      }
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      return { success: true };
    }),
    /** Update task workflow for a booking add-on row (pending / in_progress / completed) */
    setTaskStatus: employeeProcedure.input(z.object({
      id: z.number(),
      status: z.enum(['pending', 'in_progress', 'completed']),
    })).mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
      const { data: baRow, error: baErr } = await supabase
        .from("booking_add_ons")
        .select("booking_id")
        .eq("id", input.id)
        .maybeSingle();
      if (baErr) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: baErr.message });
      if (!baRow) throw new TRPCError({ code: "NOT_FOUND", message: "Booking add-on not found" });
      const booking = await loadBookingForAccess(Number(baRow.booking_id));
      await assertEmployeeOrOwnerKennel(ctx.user, booking.kennelId);
      console.log(`[auth] bookingAddOn.setTaskStatus ok userId=${ctx.user.id} rowId=${input.id} kennelId=${booking.kennelId}`);
      const completed = input.status === 'completed';
      const withStatus = { completed, task_status: input.status };
      let { error } = await supabase.from('booking_add_ons').update(withStatus).eq('id', input.id);
      if (error && (String(error.message).includes('task_status') || String(error).includes('task_status'))) {
        ({ error } = await supabase.from('booking_add_ons').update({ completed }).eq('id', input.id));
      }
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      return { success: true };
    }),
  }),

  ownerBilling: router({
    access: ownerProcedure.input(z.object({ kennelId: z.number() })).query(async ({ ctx, input }) => {
      await assertOwnerOwnsKennelId(ctx.user, input.kennelId);
      const kennel = await db.getKennelById(input.kennelId);
      const row = kennel as Record<string, unknown>;
      const enforced = isOwnerSubscriptionEnforced();
      const hasAccess = !enforced || kennelRowHasOwnerAppAccess(row);
      const showTrialBanner = enforced && kennelShowTrialUpgradeBanner(row);
      const statusLower = String(row.subscription_status ?? row.subscriptionStatus ?? "").toLowerCase();
      const trialRaw = row.trial_ends_at ?? row.trialEndsAt;
      const everHadTrial = trialRaw != null && String(trialRaw).trim() !== "";
      const canStartAppTrial =
        enforced &&
        statusLower !== "active" &&
        statusLower !== "trialing" &&
        !everHadTrial;
      const { stripe } = await import("./stripe");
      const { getOwnerSubscriptionPriceId } = await import("./stripeOwnerSubscription");
      const { kennelCanReceiveBookingDestinations } = await import("./stripeConnect");
      const connectRow = row;
      return {
        enforced,
        hasAccess,
        subscriptionStatus: row.subscription_status ?? row.subscriptionStatus ?? null,
        trialEndsAt: row.trial_ends_at ?? row.trialEndsAt ?? null,
        showTrialBanner,
        canStartAppTrial,
        stripeConfigured: Boolean(stripe),
        subscriptionPriceConfigured: Boolean(getOwnerSubscriptionPriceId()),
        /** Customer booking Checkout can use Connect destination (vs platform-only legacy). */
        bookingPaymentsReady: kennelCanReceiveBookingDestinations(connectRow),
        stripeConnectedAccountId:
          (connectRow.stripe_connected_account_id ?? connectRow.stripeConnectedAccountId ?? null) as string | null,
        stripeConnectChargesEnabled: Boolean(
          connectRow.stripe_connect_charges_enabled ?? connectRow.stripeConnectChargesEnabled,
        ),
        stripeConnectPayoutsEnabled: Boolean(
          connectRow.stripe_connect_payouts_enabled ?? connectRow.stripeConnectPayoutsEnabled,
        ),
      };
    }),
    createSubscriptionCheckout: ownerProcedure
      .input(z.object({ kennelId: z.number(), origin: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        await assertOwnerOwnsKennelId(ctx.user, input.kennelId);
        console.log(`[ownerBilling.checkout] userId=${ctx.user.id} kennelId=${input.kennelId}`);
        const { stripe } = await import("./stripe");
        const { createOwnerSubscriptionCheckoutSession, getOwnerSubscriptionPriceId } = await import("./stripeOwnerSubscription");
        if (!stripe) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message:
              "Stripe is not configured (STRIPE_SECRET_KEY). For local/demo, set OWNER_SUBSCRIPTION_ENFORCE=off or leave STRIPE_SECRET_KEY unset so onboarding does not require checkout. Otherwise configure Stripe and STRIPE_OWNER_SUBSCRIPTION_PRICE_ID.",
          });
        }
        if (!getOwnerSubscriptionPriceId()) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message:
              "Set STRIPE_OWNER_SUBSCRIPTION_PRICE_ID on the server to enable subscription checkout, or use “Skip for now” to start a trial (requires kennels.trial_ends_at — run MIGRATION_R30_kennel_stripe_subscription.sql on your Supabase project if missing).",
          });
        }
        const url = await createOwnerSubscriptionCheckoutSession({
          kennelId: input.kennelId,
          userId: ctx.user.id,
          userEmail: ctx.user.email,
          origin: input.origin,
        });
        if (!url) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Could not create Stripe checkout session (customer or session creation failed).",
          });
        }
        return { url };
      }),
    startTrial: ownerProcedure.input(z.object({ kennelId: z.number() })).mutation(async ({ ctx, input }) => {
      await assertOwnerOwnsKennelId(ctx.user, input.kennelId);
      console.log(`[ownerBilling.startTrial] userId=${ctx.user.id} kennelId=${input.kennelId}`);
      const row = await db.getKennelById(input.kennelId);
      const r = row as Record<string, unknown>;
      const status = String(r.subscription_status ?? r.subscriptionStatus ?? "").toLowerCase();
      if (status === "active" || status === "trialing") {
        return { success: true as const, trialEndsAt: r.trial_ends_at ?? r.trialEndsAt ?? null };
      }
      const now = Date.now();
      const existingRaw = r.trial_ends_at ?? r.trialEndsAt;
      if (existingRaw != null && String(existingRaw) !== "") {
        const existingEnd = new Date(String(existingRaw)).getTime();
        if (Number.isFinite(existingEnd) && existingEnd > now) {
          return { success: true as const, trialEndsAt: existingRaw };
        }
      }
      const trialEnd = new Date();
      trialEnd.setUTCDate(trialEnd.getUTCDate() + 7);
      const iso = trialEnd.toISOString();
      try {
        await db.updateKennel(input.kennelId, { trial_ends_at: iso });
      } catch (e: unknown) {
        if (isMissingKennelColumnError(e, "trial_ends_at")) {
          try {
            await db.updateKennel(input.kennelId, { subscription_status: "trialing" });
          } catch (e2: unknown) {
            throw new TRPCError({
              code: "PRECONDITION_FAILED",
              message:
                "Database is missing kennels.trial_ends_at (and subscription update failed). Run MIGRATION_R30_kennel_stripe_subscription.sql or the kennels ALTER block in SUPABASE_SCHEMA.sql in the Supabase SQL Editor, then reload the API schema cache.",
            });
          }
          return { success: true as const, trialEndsAt: iso };
        }
        const msg = e instanceof Error ? e.message : String(e);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: msg || "Could not start trial" });
      }
      return { success: true as const, trialEndsAt: iso };
    }),
  }),

  /** Stripe Connect: onboard kennel to receive customer booking payments (separate from owner SaaS subscription). */
  stripeConnect: router({
    status: ownerProcedure.input(z.object({ kennelId: z.number() })).query(async ({ ctx, input }) => {
      await assertOwnerOwnsKennelId(ctx.user, input.kennelId);
      const { stripe } = await import("./stripe");
      const {
        kennelCanReceiveBookingDestinations,
        bookingPaymentsRequireConnect,
        stripeConnectModuleAvailable,
      } = await import("./stripeConnect");
      const kennel = await db.getKennelById(input.kennelId);
      const row = kennel as Record<string, unknown>;
      const accountId =
        (row.stripe_connected_account_id ?? row.stripeConnectedAccountId ?? null) as string | null;
      const cleanId = accountId && String(accountId).trim() ? String(accountId).trim() : null;
      return {
        stripeConfigured: Boolean(stripe),
        moduleAvailable: stripeConnectModuleAvailable(),
        accountId: cleanId,
        chargesEnabled: Boolean(row.stripe_connect_charges_enabled ?? row.stripeConnectChargesEnabled),
        payoutsEnabled: Boolean(row.stripe_connect_payouts_enabled ?? row.stripeConnectPayoutsEnabled),
        detailsSubmitted: Boolean(row.stripe_connect_details_submitted ?? row.stripeConnectDetailsSubmitted),
        canAcceptBookingPayments: kennelCanReceiveBookingDestinations(row),
        bookingsRequireConnect: bookingPaymentsRequireConnect(),
      };
    }),
    createOnboardingLink: ownerProcedure
      .input(z.object({ kennelId: z.number(), origin: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        await assertOwnerOwnsKennelId(ctx.user, input.kennelId);
        const { stripe } = await import("./stripe");
        if (!stripe) {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Stripe is not configured (STRIPE_SECRET_KEY)." });
        }
        const { createStripeConnectOnboardingLink } = await import("./stripeConnect");
        const base = input.origin.replace(/\/$/, "");
        try {
          const url = await createStripeConnectOnboardingLink({
            kennelId: input.kennelId,
            ownerEmail: ctx.user.email,
            returnUrl: `${base}/settings?connect=return`,
            refreshUrl: `${base}/settings?connect=refresh`,
          });
          return { url };
        } catch (err) {
          console.error("[stripeConnect] createOnboardingLink failed:", err);
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: ownerFacingStripeConnectMessage(err),
          });
        }
      }),
    /** Pull latest Connect flags from Stripe (e.g. after onboarding return URL). */
    syncFromStripe: ownerProcedure.input(z.object({ kennelId: z.number() })).mutation(async ({ ctx, input }) => {
      await assertOwnerOwnsKennelId(ctx.user, input.kennelId);
      const { stripe } = await import("./stripe");
      if (!stripe) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Stripe is not configured." });
      }
      const kennel = await db.getKennelById(input.kennelId);
      const row = kennel as Record<string, unknown>;
      const id = row.stripe_connected_account_id ?? row.stripeConnectedAccountId;
      if (!id || String(id).trim() === "") {
        return { synced: false as const };
      }
      const { syncConnectAccountFromStripe } = await import("./stripeConnect");
      try {
        await syncConnectAccountFromStripe(String(id).trim());
        return { synced: true as const };
      } catch (err) {
        console.error("[stripeConnect] syncFromStripe failed:", err);
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: ownerFacingStripeConnectMessage(err),
        });
      }
    }),
  }),
});

export type AppRouter = typeof appRouter;
