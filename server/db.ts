import { supabase } from './_core/supabase';
import { requiredVaccineIssueForStay } from './vaccinationCompliance';
import { resolveDisplayNamesForUsers } from './lib/ownerDisplayName';

function isEmptyUpdates(updates: Record<string, any>): boolean {
  return Object.keys(updates).length === 0;
}

function mapServiceRow(row: Record<string, any>) {
  if (!row) return row;
  return {
    id: row.id,
    kennelId: row.kennel_id,
    name: row.name,
    type: row.type,
    pricePerUnit: row.price_per_unit != null ? Number(row.price_per_unit) : undefined,
    description: row.description ?? undefined,
    unitType: row.unit_type ?? undefined,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ============ USERS ============

export async function getUserById(id: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function getUserByEmail(email: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

export async function createUser(id: string, email: string, name: string, role: 'owner' | 'employee' | 'customer' = 'customer') {
  const { data, error } = await supabase
    .from('users')
    .insert([{ id, email, name, role }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateUser(id: string, updates: Record<string, any>) {
  if (isEmptyUpdates(updates)) {
    return getUserById(id);
  }
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', id)
    .select()
    .maybeSingle();
  if (error) throw error;
  if (!data) return getUserById(id);
  return data;
}

// ============ KENNELS ============

export async function getKennelById(id: number) {
  const { data, error } = await supabase
    .from('kennels')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function getKennelsByOwnerId(ownerId: string) {
  const { data, error } = await supabase
    .from('kennels')
    .select('*')
    .eq('owner_id', ownerId);
  if (error) throw error;
  return data || [];
}

export async function createKennel(
  ownerId: string,
  input: {
    name: string;
    description?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    phone?: string;
    email?: string;
    policies?: string;
  }
) {
  const { data, error } = await supabase
    .from('kennels')
    .insert([{
      owner_id: ownerId,
      name: input.name,
      description: input.description || null,
      address: input.address || null,
      city: input.city || null,
      state: input.state || null,
      zip: input.zip || null,
      phone: input.phone || null,
      email: input.email || null,
      policies: input.policies || null,
    }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateKennel(id: number, updates: Record<string, any>) {
  if (isEmptyUpdates(updates)) {
    return getKennelById(id);
  }
  const { data, error } = await supabase
    .from('kennels')
    .update(updates)
    .eq('id', id)
    .select()
    .maybeSingle();
  if (error) throw error;
  if (!data) return getKennelById(id);
  return data;
}

export async function getKennelByStripeSubscriptionId(stripeSubscriptionId: string) {
  const { data, error } = await supabase
    .from('kennels')
    .select('*')
    .eq('stripe_subscription_id', stripeSubscriptionId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getKennelByStripeConnectedAccountId(connectedAccountId: string) {
  const { data, error } = await supabase
    .from('kennels')
    .select('*')
    .eq('stripe_connected_account_id', connectedAccountId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// ============ SERVICES ============

export async function getServicesByKennelId(kennelId: number) {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('kennel_id', kennelId)
    .eq('is_active', true);
  if (error) throw error;
  return (data || []).map(mapServiceRow);
}

export async function getServiceById(id: number) {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return mapServiceRow(data);
}

export async function createService(kennelId: number, name: string, type: string, pricePerUnit: number, description?: string, unitType?: string) {
  const insertData: Record<string, any> = { kennel_id: kennelId, name, type, price_per_unit: pricePerUnit };
  if (description !== undefined) insertData.description = description === '' ? null : description;
  if (unitType !== undefined) insertData.unit_type = unitType;
  const { data, error } = await supabase
    .from('services')
    .insert([insertData])
    .select()
    .single();
  if (error) throw error;
  return mapServiceRow(data);
}

export async function updateService(id: number, updates: Record<string, any>) {
  if (isEmptyUpdates(updates)) {
    return getServiceById(id);
  }
  const { data, error } = await supabase
    .from('services')
    .update(updates)
    .eq('id', id)
    .select()
    .maybeSingle();
  if (error) throw error;
  if (!data) return getServiceById(id);
  return mapServiceRow(data);
}

export async function deleteService(id: number) {
  const { error } = await supabase
    .from('services')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ============ DOGS ============

export function mapDogRow(row: Record<string, any>) {
  if (!row) return row;
  return {
    id: row.id,
    ownerId: row.owner_id,
    kennelId: row.kennel_id,
    name: row.name,
    breed: row.breed,
    age: row.age,
    weight: row.weight,
    birthday: row.birthday ?? null,
    sex: row.sex,
    isSpayedNeutered: row.is_spayed_neutered,
    photoUrl: row.photo_url,
    feedingInstructions: row.feeding_instructions,
    medications: row.medications,
    behaviorNotes: row.behavior_notes,
    vetName: row.vet_name,
    vetPhone: row.vet_phone,
    emergencyContactName: row.emergency_contact_name,
    emergencyContactPhone: row.emergency_contact_phone,
    /** Not in base schema; reserved for future column or extensions */
    specialNeeds: row.special_needs ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getDogById(id: number) {
  const { data, error } = await supabase
    .from('dogs')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return mapDogRow(data);
}

export async function getDogsByOwnerId(ownerId: string) {
  const { data, error } = await supabase
    .from('dogs')
    .select('*')
    .eq('owner_id', ownerId);
  if (error) throw error;
  return (data || []).map(mapDogRow);
}

export async function createDog(ownerId: string, input: Record<string, any>) {
  const baseInsert: Record<string, any> = {
    owner_id: ownerId,
    name: input.name,
    breed: input.breed || null,
    age: input.age || null,
    weight: input.weight || null,
    birthday: input.birthday || null,
    sex: input.sex || null,
    is_spayed_neutered: input.isSpayedNeutered || false,
    feeding_instructions: input.feedingInstructions || null,
    medications: input.medications || null,
    behavior_notes: input.behaviorNotes || null,
    vet_name: input.vetName || null,
    vet_phone: input.vetPhone || null,
    emergency_contact_name: input.emergencyContactName || null,
    emergency_contact_phone: input.emergencyContactPhone || null,
    special_needs: input.specialNeeds !== undefined ? input.specialNeeds : null,
  };

  const runInsert = async (payload: Record<string, any>) =>
    supabase.from('dogs').insert([payload]).select().single();

  let { data, error } = await runInsert(baseInsert);
  if (error) {
    const msg = String(error.message || "").toLowerCase();
    // Backward compatibility: allow environments where dogs.birthday is not migrated yet.
    if (msg.includes("birthday") && msg.includes("schema cache")) {
      const fallback = { ...baseInsert };
      delete fallback.birthday;
      const retry = await runInsert(fallback);
      data = retry.data;
      error = retry.error;
    }
  }
  if (error) throw error;
  return mapDogRow(data);
}

export async function updateDog(id: number, updates: Record<string, any>) {
  if (isEmptyUpdates(updates)) {
    return getDogById(id);
  }
  const runUpdate = async (payload: Record<string, any>) =>
    supabase
      .from('dogs')
      .update(payload)
      .eq('id', id)
      .select('*')
      .maybeSingle();

  let { data, error } = await runUpdate(updates);
  if (error) {
    const msg = String(error.message || "").toLowerCase();
    // Backward compatibility: allow environments where dogs.birthday is not migrated yet.
    if (msg.includes("birthday") && msg.includes("schema cache")) {
      const fallback = { ...updates };
      delete fallback.birthday;
      if (!isEmptyUpdates(fallback)) {
        const retry = await runUpdate(fallback);
        data = retry.data;
        error = retry.error;
      }
    }
  }
  if (error) throw error;
  if (!data) {
    return getDogById(id);
  }
  return mapDogRow(data);
}

// ============ VACCINATIONS ============

function mapVaccinationRow(row: Record<string, any>) {
  if (!row) return row;
  return {
    id: row.id,
    dogId: row.dog_id,
    vaccineName: row.vaccine_name ?? '',
    dateAdministered: row.date_administered ?? undefined,
    expirationDate: row.expiration_date ?? undefined,
    documentUrl: row.document_url ?? undefined,
    status: row.status ?? 'current',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getVaccinationsByDogId(dogId: number) {
  const { data, error } = await supabase
    .from('vaccinations')
    .select('*')
    .eq('dog_id', dogId);
  if (error) throw error;
  return (data || []).map(mapVaccinationRow);
}

const VACCINATION_STATUSES = ['current', 'expiring_soon', 'expired', 'missing'] as const;

export async function createVaccination(
  dogId: number,
  vaccineName: string,
  expirationDate: string,
  dateAdministered?: string,
  documentUrl?: string,
  status?: string,
) {
  const st =
    status && VACCINATION_STATUSES.includes(status as (typeof VACCINATION_STATUSES)[number])
      ? status
      : 'current';
  const insertData: Record<string, any> = { dog_id: dogId, vaccine_name: vaccineName, expiration_date: expirationDate, status: st };
  if (dateAdministered) insertData.date_administered = dateAdministered;
  if (documentUrl) insertData.document_url = documentUrl;
  const { data, error } = await supabase
    .from('vaccinations')
    .insert([insertData])
    .select()
    .single();
  if (error) throw error;
  return mapVaccinationRow(data);
}

export async function updateVaccination(id: number, updates: Record<string, any>) {
  if (isEmptyUpdates(updates)) {
    const { data, error } = await supabase.from('vaccinations').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    if (!data) throw new Error(`Vaccination ${id} not found`);
    return mapVaccinationRow(data);
  }
  const { data, error } = await supabase
    .from('vaccinations')
    .update(updates)
    .eq('id', id)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    const { data: row, error: e2 } = await supabase.from('vaccinations').select('*').eq('id', id).maybeSingle();
    if (e2) throw e2;
    if (!row) throw new Error(`Vaccination ${id} not found`);
    return mapVaccinationRow(row);
  }
  return mapVaccinationRow(data);
}

// ============ BOOKINGS ============

/** PostgREST embed: dog + service on each booking row */
const BOOKING_SELECT_ENRICHED = `
  *,
  dogs (*),
  services (id, name, type)
`;

/** Normalize a booking row (with optional joined `dogs`, `services`) to API camelCase + display fields */
export function mapBookingRow(row: Record<string, any>, roomIdOverride?: number | null) {
  if (!row) return row;
  const dogRow = row.dogs;
  const serviceRow = row.services;
  const dogMapped =
    dogRow && typeof dogRow === 'object' && !Array.isArray(dogRow) ? mapDogRow(dogRow) : null;
  const dogName = dogMapped?.name ?? null;

  return {
    id: row.id,
    kennelId: row.kennel_id,
    customerId: row.customer_id,
    dogId: row.dog_id,
    serviceId: row.service_id,
    checkInDate: row.check_in_date,
    checkOutDate: row.check_out_date,
    status: row.status,
    paymentStatus: row.payment_status ?? undefined,
    totalPrice: row.total_price != null ? Number(row.total_price) : undefined,
    checkedInAt: row.checked_in_at ?? undefined,
    checkedOutAt: row.checked_out_at ?? undefined,
    notes: row.notes ?? undefined,
    roomId: (roomIdOverride ?? row.room_id) ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    dogName: dogName ?? undefined,
    dogNames: dogName ? [dogName] : undefined,
    dogBreed: dogMapped?.breed ?? undefined,
    dog: dogMapped ?? undefined,
    serviceName: serviceRow?.name ?? undefined,
    serviceType: serviceRow?.type ?? undefined,
  };
}

async function getActiveRoomMapForBookingIds(bookingIds: number[]) {
  const map = new Map<number, number>();
  if (!bookingIds.length) return map;
  const { data, error } = await supabase
    .from("room_assignments")
    .select("booking_id, room_id, assigned_at")
    .in("booking_id", bookingIds)
    .is("unassigned_at", null)
    .order("assigned_at", { ascending: false });
  if (error) return map;
  for (const row of data || []) {
    if (!map.has(row.booking_id)) {
      map.set(row.booking_id, row.room_id);
    }
  }
  return map;
}

function isMissingRoomAssignmentDaysTable(err: unknown): boolean {
  const m = String((err as { message?: string })?.message ?? err ?? "").toLowerCase();
  return (
    m.includes("schema cache") ||
    m.includes("could not find the table") ||
    (m.includes("does not exist") && m.includes("room_assignment_days"))
  );
}

/** Per-booking room overrides from room_assignment_days for one calendar date. */
async function fetchDayRoomOverridesForDate(bookingIds: number[], stayDate: string): Promise<Map<number, number>> {
  const map = new Map<number, number>();
  if (!bookingIds.length) return map;
  const { data, error } = await supabase
    .from("room_assignment_days")
    .select("booking_id, room_id")
    .in("booking_id", bookingIds)
    .eq("stay_date", stayDate);
  if (error) {
    if (isMissingRoomAssignmentDaysTable(error)) return map;
    throw error;
  }
  for (const row of data || []) {
    map.set(row.booking_id as number, row.room_id as number);
  }
  return map;
}

/**
 * Bookings overlapping stayDate (confirmed + checked_in) with effective room:
 * day override (room_assignment_days) if present, else active stay-wide room_assignments row.
 */
export async function getEffectiveRoomPlacementsForDate(kennelId: number, stayDate: string) {
  const { data: bookings, error } = await supabase
    .from("bookings")
    .select("id, dog_id, check_in_date, check_out_date, status")
    .eq("kennel_id", kennelId)
    .in("status", ["confirmed", "checked_in"])
    .lte("check_in_date", stayDate)
    .gte("check_out_date", stayDate);
  if (error) throw error;
  const list = bookings || [];
  const ids = list.map((b: { id: number }) => b.id);
  const roomByBooking = await getActiveRoomMapForBookingIds(ids);
  const dayOverrides = await fetchDayRoomOverridesForDate(ids, stayDate);

  function effectiveRoomId(bookingId: number): number | null {
    if (dayOverrides.has(bookingId)) return dayOverrides.get(bookingId)!;
    const g = roomByBooking.get(bookingId);
    return g !== undefined ? g : null;
  }

  return list.map((b: { id: number; dog_id: number }) => ({
    bookingId: b.id,
    dogId: b.dog_id,
    roomId: effectiveRoomId(b.id),
  }));
}

/**
 * Extra dogs per booking from `booking_dogs` (excluding `bookings.dog_id`).
 * If the table is missing, returns empty so the primary dog still loads; run MIGRATION_R26_booking_dogs.sql.
 */
async function loadExtraDogIdsByBookingId(bookingIds: number[]): Promise<Map<number, number[]>> {
  const map = new Map<number, number[]>();
  if (!bookingIds.length) return map;
  const { data, error } = await supabase
    .from("booking_dogs")
    .select("booking_id, dog_id")
    .in("booking_id", bookingIds);
  if (error || !data) return map;
  for (const row of data as { booking_id: number; dog_id: number }[]) {
    const bid = row.booking_id;
    const did = row.dog_id;
    if (!map.has(bid)) map.set(bid, []);
    map.get(bid)!.push(did);
  }
  return map;
}

/**
 * Adds `dogNames`, `dogIdsOnBooking`, `vaccineStatus`, `missingVaccines`, `vaccineIssueRows`
 * using kennel required vaccines and on-file vaccinations.
 */
export async function enrichBookingsMultiDogAndVaccines(bookings: any[], kennelId: number) {
  if (!bookings.length) return;
  const ids = bookings.map((b) => b.id);
  const extraMap = await loadExtraDogIdsByBookingId(ids);

  const allDogIds = new Set<number>();
  for (const b of bookings) {
    if (b.dogId) allDogIds.add(b.dogId);
    for (const d of extraMap.get(b.id) || []) allDogIds.add(d);
  }
  const dogIdList = Array.from(allDogIds);

  const { data: dogRows } = await supabase
    .from("dogs")
    .select("id, name")
    .in("id", dogIdList.length ? dogIdList : [-1]);
  const dogNamesById = new Map<number, string>((dogRows || []).map((r: any) => [r.id as number, String(r.name ?? "")]));

  const { data: reqVax, error: reqErr } = await supabase
    .from("kennel_required_vaccines")
    .select("vaccine_name")
    .eq("kennel_id", kennelId);
  const requiredLabels =
    reqErr || !reqVax
      ? []
      : (reqVax as any[]).map((r) => String(r.vaccine_name || "").trim()).filter(Boolean);

  const { data: vaxRows } = await supabase
    .from("vaccinations")
    .select("dog_id, vaccine_name, status, expiration_date")
    .in("dog_id", dogIdList.length ? dogIdList : [-1]);
  const vaxByDog = new Map<number, any[]>();
  for (const v of vaxRows || []) {
    const did = v.dog_id as number;
    if (!vaxByDog.has(did)) vaxByDog.set(did, []);
    vaxByDog.get(did)!.push(v);
  }

  for (const b of bookings) {
    const dogIds = Array.from(new Set([b.dogId, ...(extraMap.get(b.id) || [])].filter(Boolean)));
    const names = dogIds.map((id) => dogNamesById.get(id) || b.dogName || `Dog #${id}`);
    const uniqueNames = Array.from(new Set(names.filter(Boolean)));
    b.dogNames = uniqueNames.length ? uniqueNames : b.dogName ? [b.dogName] : [];
    b.dogIdsOnBooking = dogIds;

    b.vaccineIssueRows = [] as { dogId: number; dogName: string; vaccineLabel: string; kind: string; detail: string }[];
    if (requiredLabels.length === 0) {
      b.vaccineStatus = "complete";
      b.missingVaccines = [];
      continue;
    }

    for (const did of dogIds) {
      const dname = dogNamesById.get(did) || b.dogName || `Dog #${did}`;
      const rows = vaxByDog.get(did) || [];
      for (const req of requiredLabels) {
        const issue = requiredVaccineIssueForStay(req, rows, b.checkInDate);
        if (issue) {
          b.vaccineIssueRows.push({
            dogId: did,
            dogName: dname,
            vaccineLabel: issue.label,
            kind: issue.kind,
            detail: issue.detail,
          });
        }
      }
    }

    if (b.vaccineIssueRows.length) {
      b.vaccineStatus = "incomplete";
      b.missingVaccines = Array.from(new Set(b.vaccineIssueRows.map((r: any) => r.detail)));
    } else {
      b.vaccineStatus = "complete";
      b.missingVaccines = [];
    }
  }
}

async function enrichBookingsCustomerDisplayNames(bookings: any[]) {
  if (!bookings.length) return;
  const ids = Array.from(new Set(bookings.map((b) => b.customerId).filter(Boolean))) as string[];
  if (!ids.length) return;
  const { data, error } = await supabase.from("users").select("id,email,name,full_name").in("id", ids);
  if (error) {
    console.warn("[db] enrichBookingsCustomerDisplayNames:", error.message);
    return;
  }
  const resolved = await resolveDisplayNamesForUsers(supabase, data || []);
  const emailById = new Map((data || []).map((u: any) => [String(u.id), u.email ?? null]));
  for (const b of bookings) {
    if (!b.customerId) continue;
    const cid = String(b.customerId);
    b.customerName = resolved.get(cid);
    b.customerEmail = emailById.get(cid) ?? null;
  }
}

async function mapAndEnrichKennelBookings(rows: any[], kennelId: number) {
  const roomMap = await getActiveRoomMapForBookingIds(rows.map((r: any) => r.id));
  const mapped = rows.map((row: any) => mapBookingRow(row, roomMap.get(row.id)));
  await enrichBookingsMultiDogAndVaccines(mapped, kennelId);
  await enrichBookingsCustomerDisplayNames(mapped);
  return mapped;
}

export async function getBookingById(id: number) {
  const { data, error } = await supabase
    .from('bookings')
    .select(BOOKING_SELECT_ENRICHED)
    .eq('id', id)
    .single();
  if (error) throw error;
  const roomMap = await getActiveRoomMapForBookingIds(data ? [data.id] : []);
  const mapped = mapBookingRow(data, roomMap.get(data.id));
  await enrichBookingsMultiDogAndVaccines([mapped], mapped.kennelId);
  return mapped;
}

export async function getBookingsByKennelId(kennelId: number) {
  const { data, error } = await supabase
    .from('bookings')
    .select(BOOKING_SELECT_ENRICHED)
    .eq('kennel_id', kennelId)
    .order('check_in_date', { ascending: false });
  if (error) throw error;
  const rows = data || [];
  return mapAndEnrichKennelBookings(rows, kennelId);
}

export async function getBookingsByCustomerId(customerId: string) {
  const { data, error } = await supabase
    .from('bookings')
    .select(BOOKING_SELECT_ENRICHED)
    .eq('customer_id', customerId)
    .order('check_in_date', { ascending: false });
  if (error) throw error;
  const rows = data || [];
  const byKennel = new Map<number, any[]>();
  for (const row of rows) {
    const kid = row.kennel_id as number;
    if (!byKennel.has(kid)) byKennel.set(kid, []);
    byKennel.get(kid)!.push(row);
  }
  const out: any[] = [];
  for (const [kid, group] of Array.from(byKennel.entries())) {
    const mapped = await mapAndEnrichKennelBookings(group, kid);
    out.push(...mapped);
  }
  out.sort((a, b) => String(b.checkInDate).localeCompare(String(a.checkInDate)));
  return out;
}

export async function getTodayBookings(kennelId: number) {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('bookings')
    .select(BOOKING_SELECT_ENRICHED)
    .eq('kennel_id', kennelId)
    .gte('check_in_date', today)
    .lte('check_in_date', today);
  if (error) throw error;
  const rows = data || [];
  return mapAndEnrichKennelBookings(rows, kennelId);
}

export async function createBooking(kennelId: number, customerId: string, dogId: number, serviceId: number, checkInDate: string, checkOutDate: string, totalPrice: number) {
  const { data, error } = await supabase
    .from('bookings')
    .insert([{
      kennel_id: kennelId,
      customer_id: customerId,
      dog_id: dogId,
      service_id: serviceId,
      check_in_date: checkInDate,
      check_out_date: checkOutDate,
      total_price: totalPrice,
      status: 'pending'
    }])
    .select(BOOKING_SELECT_ENRICHED)
    .single();
  if (error) throw error;
  const mapped = mapBookingRow(data);
  await enrichBookingsMultiDogAndVaccines([mapped], kennelId);
  return mapped;
}

export async function updateBooking(id: number, updates: Record<string, any>) {
  if (isEmptyUpdates(updates)) {
    return getBookingById(id);
  }
  const patch: Record<string, any> = { ...updates };
  if ('paymentStatus' in patch) {
    patch.payment_status = patch.paymentStatus;
    delete patch.paymentStatus;
  }
  if ('checkedInAt' in patch) {
    patch.checked_in_at = patch.checkedInAt;
    delete patch.checkedInAt;
  }
  if ('checkedOutAt' in patch) {
    patch.checked_out_at = patch.checkedOutAt;
    delete patch.checkedOutAt;
  }
  const { data, error } = await supabase
    .from('bookings')
    .update(patch)
    .eq('id', id)
    .select(BOOKING_SELECT_ENRICHED)
    .maybeSingle();
  if (error) throw error;
  if (!data) return getBookingById(id);
  const roomMap = await getActiveRoomMapForBookingIds([id]);
  const mapped = mapBookingRow(data, roomMap.get(id));
  await enrichBookingsMultiDogAndVaccines([mapped], mapped.kennelId);
  return mapped;
}

/**
 * Dogs tied to a kennel (kennel_id) plus any dog referenced by a booking at that kennel.
 * Customer dogs often have kennel_id null until linked; bookings still reference them by dog_id.
 */
export async function getDogsForKennelWithBookings(kennelId: number) {
  const { data: bookingRows, error: be } = await supabase
    .from('bookings')
    .select('id, dog_id')
    .eq('kennel_id', kennelId);
  if (be) throw be;
  const bookingIds = (bookingRows || []).map((r: { id: number }) => r.id).filter(Boolean);
  const extraByBooking = await loadExtraDogIdsByBookingId(bookingIds);
  const bookedIdsSet = new Set<number>();
  for (const r of bookingRows || []) {
    if (r.dog_id) bookedIdsSet.add(r.dog_id as number);
    for (const d of extraByBooking.get((r as { id: number }).id) || []) bookedIdsSet.add(d);
  }
  const bookedIds = Array.from(bookedIdsSet);

  const { data: kennelDogs, error: e1 } = await supabase
    .from('dogs')
    .select('*')
    .eq('kennel_id', kennelId);
  if (e1) throw e1;

  let bookedDogs: Record<string, any>[] = [];
  if (bookedIds.length > 0) {
    const { data: bd, error: e2 } = await supabase.from('dogs').select('*').in('id', bookedIds);
    if (e2) throw e2;
    bookedDogs = bd || [];
  }

  const byId = new Map<number, Record<string, any>>();
  for (const d of kennelDogs || []) byId.set(d.id, d);
  for (const d of bookedDogs) byId.set(d.id, d);
  return Array.from(byId.values()).map(mapDogRow);
}

// ============ PAYMENTS ============

export async function getPaymentsByCustomerId(customerId: string) {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

/** Idempotency for Stripe Checkout: `stripe_payment_id` stores the Checkout Session id. */
export async function getPaymentByStripeSessionId(stripePaymentId: string) {
  const { data, error } = await supabase
    .from('payments')
    .select('id, booking_id')
    .eq('stripe_payment_id', stripePaymentId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createPayment(bookingId: number, customerId: string, kennelId: number, amount: number, stripePaymentId: string) {
  const { data, error } = await supabase
    .from('payments')
    .insert([{
      booking_id: bookingId,
      customer_id: customerId,
      kennel_id: kennelId,
      amount,
      stripe_payment_id: stripePaymentId,
      status: 'completed'
    }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ============ ALERTS ============

export type ClientAlertRow = {
  id: number;
  type: string;
  severity: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  dogId: number | null;
  bookingId: number | null;
  dogName: string | null;
};

function severityForAlertType(type: string): string {
  const t = String(type || "").toLowerCase();
  if (t.includes("expired") || t === "vaccination_missing" || t === "dog_info_incomplete") return "critical";
  if (
    t.includes("expiring") ||
    t.includes("payment") ||
    t.includes("pending") ||
    t.includes("warning") ||
    t.includes("missing")
  )
    return "warning";
  return "info";
}

/** Map DB alert rows to API shape; batch-loads dog names when `dog_id` is set. */
export async function mapRawAlertsToClientRows(raw: any[]): Promise<ClientAlertRow[]> {
  if (!raw.length) return [];
  const dogIds: number[] = [];
  for (const r of raw) {
    const x = r.dog_id;
    if (x == null || x === "") continue;
    const n = Number(x);
    if (!Number.isFinite(n)) continue;
    if (dogIds.indexOf(n) === -1) dogIds.push(n);
  }
  const names = new Map<number, string>();
  if (dogIds.length) {
    const { data: dogs, error: dogErr } = await supabase.from("dogs").select("id,name").in("id", dogIds);
    if (!dogErr) {
      for (const d of dogs || []) names.set(Number((d as any).id), String((d as any).name || "Dog"));
    }
  }
  return raw.map((a: any) => {
    const type = a.type || "general";
    const rawTitle = a.title;
    const fallbackTitle = String(type).replaceAll("_", " ");
    const title = rawTitle && String(rawTitle).trim() ? String(rawTitle) : fallbackTitle;
    const did = a.dog_id != null && a.dog_id !== "" ? Number(a.dog_id) : null;
    const bid = a.booking_id != null && a.booking_id !== "" ? Number(a.booking_id) : null;
    return {
      id: a.id,
      type,
      severity: String(a.severity || "").trim() || severityForAlertType(type),
      title,
      message: a.message || "",
      isRead: Boolean(a.is_read ?? a.is_resolved ?? false),
      createdAt: a.created_at,
      dogId: did != null && Number.isFinite(did) ? did : null,
      bookingId: bid != null && Number.isFinite(bid) ? bid : null,
      dogName: did != null && Number.isFinite(did) ? names.get(did) ?? null : null,
    };
  });
}

export async function getAlertsByKennelId(kennelId: number) {
  let { data, error } = await supabase
    .from("alerts")
    .select("*")
    .eq("kennel_id", kennelId)
    .eq("is_resolved", false)
    .order("created_at", { ascending: false });
  if (error) {
    const msg = String(error.message || "").toLowerCase();
    // Backward compatibility if is_resolved doesn't exist in older schemas.
    if (msg.includes("is_resolved") && msg.includes("does not exist")) {
      const retry = await supabase
        .from("alerts")
        .select("*")
        .eq("kennel_id", kennelId)
        .order("created_at", { ascending: false });
      data = retry.data;
      error = retry.error;
    }
  }
  if (error) throw error;
  return mapRawAlertsToClientRows(data || []);
}

export async function createAlert(kennelId: number, type: string, title: string, message: string, severity: string = 'info') {
  const { data, error } = await supabase
    .from('alerts')
    .insert([{ kennel_id: kennelId, type, title, message, severity }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ============ ROOMS ============

export async function getRoomsByKennelId(kennelId: number) {
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('kennel_id', kennelId);
  if (error) throw error;
  return data || [];
}

/** Client/API shape: camelCase, defaults so UI never treats "missing column" as maintenance */
export function mapRoomRow(row: Record<string, any>, currentOccupancy = 0) {
  return {
    id: row.id,
    kennelId: row.kennel_id,
    name: row.name,
    building: row.building ?? undefined,
    sizeType: (row.size_type as string) || 'mixed',
    capacity: row.capacity ?? 1,
    /** Explicit false = maintenance/off; null/undefined = available (legacy rows) */
    isAvailable: row.is_available !== false,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    currentOccupancy,
  };
}

/**
 * Rooms with per-room occupancy.
 * - No asOfDate: checked-in bookings only, stay-wide room_assignments (legacy check-in / capacity UX).
 * - With asOfDate: confirmed + checked_in overlapping that date, effective room = day override ?? stay-wide assignment (matches availability calendar).
 */
export async function getRoomsByKennelIdWithOccupancy(kennelId: number, opts?: { asOfDate?: string }) {
  const rooms = await getRoomsByKennelId(kennelId);
  if (!opts?.asOfDate) {
    const { data: bookings, error } = await supabase
      .from("bookings")
      .select("id")
      .eq("kennel_id", kennelId)
      .eq("status", "checked_in");
    if (error) throw error;
    const roomMap = await getActiveRoomMapForBookingIds((bookings || []).map((b: { id: number }) => b.id));
    const counts = new Map<number, number>();
    for (const b of bookings || []) {
      const rid = roomMap.get(b.id);
      if (!rid) continue;
      counts.set(rid, (counts.get(rid) || 0) + 1);
    }
    return rooms.map((r: Record<string, any>) => mapRoomRow(r, counts.get(r.id) || 0));
  }

  const placements = await getEffectiveRoomPlacementsForDate(kennelId, opts.asOfDate);
  const counts = new Map<number, number>();
  for (const p of placements) {
    if (p.roomId == null) continue;
    counts.set(p.roomId, (counts.get(p.roomId) || 0) + 1);
  }
  return rooms.map((r: Record<string, any>) => mapRoomRow(r, counts.get(r.id) || 0));
}

export async function createRoom(kennelId: number, name: string, capacity: number = 1, building?: string, sizeType?: string, notes?: string) {
  const insertData: Record<string, any> = { kennel_id: kennelId, name, capacity, is_available: true };
  if (building) insertData.building = building;
  if (sizeType) insertData.size_type = sizeType;
  if (notes) insertData.notes = notes;
  const { data, error } = await supabase
    .from('rooms')
    .insert([insertData])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteRoom(id: number) {
  const { error } = await supabase
    .from('rooms')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function updateRoom(id: number, updates: Record<string, any>) {
  if (isEmptyUpdates(updates)) {
    const { data, error } = await supabase.from('rooms').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    if (!data) throw new Error(`Room ${id} not found`);
    return data;
  }
  const { data, error } = await supabase
    .from('rooms')
    .update(updates)
    .eq('id', id)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    const { data: row, error: e2 } = await supabase.from('rooms').select('*').eq('id', id).maybeSingle();
    if (e2) throw e2;
    if (!row) throw new Error(`Room ${id} not found`);
    return row;
  }
  return data;
}

// ============ CHECKOUT ADD-ONS ============

export async function getCheckoutAddOnsByKennelId(kennelId: number) {
  const { data, error } = await supabase
    .from('checkout_add_ons')
    .select('*')
    .eq('kennel_id', kennelId)
    .eq('is_active', true);
  if (error) throw error;
  return data || [];
}

export async function createCheckoutAddOn(kennelId: number, name: string, price: number) {
  const { data, error } = await supabase
    .from('checkout_add_ons')
    .insert([{ kennel_id: kennelId, name, price }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCheckoutAddOn(id: number, updates: Record<string, any>) {
  if (isEmptyUpdates(updates)) {
    const { data, error } = await supabase.from('checkout_add_ons').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    if (!data) throw new Error(`Add-on ${id} not found`);
    return data;
  }
  const { data, error } = await supabase
    .from('checkout_add_ons')
    .update(updates)
    .eq('id', id)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    const { data: row, error: e2 } = await supabase.from('checkout_add_ons').select('*').eq('id', id).maybeSingle();
    if (e2) throw e2;
    if (!row) throw new Error(`Add-on ${id} not found`);
    return row;
  }
  return data;
}

export async function deleteCheckoutAddOn(id: number) {
  const { error } = await supabase
    .from('checkout_add_ons')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ============ BOOKING ADD-ONS ============

export async function getBookingAddOns(bookingId: number) {
  const { data, error } = await supabase
    .from('booking_add_ons')
    .select('*')
    .eq('booking_id', bookingId);
  if (error) throw error;
  return data || [];
}

export async function addBookingAddOn(bookingId: number, addOnId: number, dogId: number, price: number) {
  const { data, error } = await supabase
    .from('booking_add_ons')
    .insert([{ booking_id: bookingId, add_on_id: addOnId, dog_id: dogId, price }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Remove all add-on rows for a booking (e.g. before owner replaces selection). */
export async function deleteBookingAddOnsByBookingId(bookingId: number) {
  const { error } = await supabase.from('booking_add_ons').delete().eq('booking_id', bookingId);
  if (error) throw error;
}

export async function updateBookingAddOn(id: number, updates: Record<string, any>) {
  if (isEmptyUpdates(updates)) {
    const { data, error } = await supabase.from('booking_add_ons').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    if (!data) throw new Error(`Booking add-on ${id} not found`);
    return data;
  }
  const { data, error } = await supabase
    .from('booking_add_ons')
    .update(updates)
    .eq('id', id)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    const { data: row, error: e2 } = await supabase.from('booking_add_ons').select('*').eq('id', id).maybeSingle();
    if (e2) throw e2;
    if (!row) throw new Error(`Booking add-on ${id} not found`);
    return row;
  }
  return data;
}

// ============ BUSINESS HOURS ============

export async function getBusinessHours(kennelId: number) {
  const { data, error } = await supabase
    .from('business_hours')
    .select('*')
    .eq('kennel_id', kennelId)
    .order('day_of_week', { ascending: true });
  if (error) throw error;
  return (data || []).map((row: any) => ({
    id: row.id,
    kennelId: row.kennel_id,
    dayOfWeek: row.day_of_week,
    openTime: row.open_time,
    closeTime: row.close_time,
    isClosed: row.is_closed,
  }));
}

export async function updateBusinessHours(kennelId: number, dayOfWeek: number, openTime: string, closeTime: string, isClosed: boolean) {
  // Use onConflict to match the unique constraint (kennel_id, day_of_week)
  // This updates the existing row instead of inserting a duplicate
  const { data, error } = await supabase
    .from('business_hours')
    .upsert(
      [{ kennel_id: kennelId, day_of_week: dayOfWeek, open_time: openTime, close_time: closeTime, is_closed: isClosed }],
      { onConflict: 'kennel_id,day_of_week' }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ============ CUSTOMER KENNELS ============

export async function getCustomerKennels(userId: string) {
  const { data, error } = await supabase
    .from('customer_kennels')
    .select('kennel_id')
    .eq('user_id', userId);
  if (error) throw error;
  return data?.map(row => row.kennel_id) || [];
}

export async function addCustomerKennel(userId: string, kennelId: number) {
  const { data, error } = await supabase
    .from('customer_kennels')
    .insert([{ user_id: userId, kennel_id: kennelId }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ============ KENNEL FAVORITES ============

export async function getFavoriteKennels(userId: string) {
  const { data, error } = await supabase
    .from('kennel_favorites')
    .select('kennel_id')
    .eq('user_id', userId);
  if (error) throw error;
  return data?.map(row => row.kennel_id) || [];
}

export async function addFavoriteKennel(userId: string, kennelId: number) {
  const { data, error } = await supabase
    .from('kennel_favorites')
    .insert([{ user_id: userId, kennel_id: kennelId }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function removeFavoriteKennel(userId: string, kennelId: number) {
  const { error } = await supabase
    .from('kennel_favorites')
    .delete()
    .eq('user_id', userId)
    .eq('kennel_id', kennelId);
  if (error) throw error;
}
