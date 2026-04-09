import { supabase } from './_core/supabase';

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
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
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

export async function createKennel(ownerId: string, name: string, address: string) {
  const { data, error } = await supabase
    .from('kennels')
    .insert([{ owner_id: ownerId, name, address }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateKennel(id: number, updates: Record<string, any>) {
  const { data, error } = await supabase
    .from('kennels')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
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
  return data || [];
}

export async function getServiceById(id: number) {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function createService(kennelId: number, name: string, type: string, pricePerUnit: number, description?: string, unitType?: string) {
  const insertData: Record<string, any> = { kennel_id: kennelId, name, type, price_per_unit: pricePerUnit };
  if (description) insertData.description = description;
  if (unitType) insertData.unit_type = unitType;
  const { data, error } = await supabase
    .from('services')
    .insert([insertData])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateService(id: number, updates: Record<string, any>) {
  const { data, error } = await supabase
    .from('services')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteService(id: number) {
  const { error } = await supabase
    .from('services')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ============ DOGS ============

export async function getDogById(id: number) {
  const { data, error } = await supabase
    .from('dogs')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function getDogsByOwnerId(ownerId: string) {
  const { data, error } = await supabase
    .from('dogs')
    .select('*')
    .eq('owner_id', ownerId)
    .eq('is_active', true);
  if (error) throw error;
  return data || [];
}

export async function createDog(ownerId: string, input: Record<string, any>) {
  const { data, error } = await supabase
    .from('dogs')
    .insert([{ 
      owner_id: ownerId, 
      name: input.name,
      breed: input.breed || null,
      age: input.age || null,
      weight: input.weight || null,
      sex: input.sex || null,
      is_spayed_neutered: input.isSpayedNeutered || false,
      feeding_instructions: input.feedingInstructions || null,
      medications: input.medications || null,
      behavior_notes: input.behaviorNotes || null,
      vet_name: input.vetName || null,
      vet_phone: input.vetPhone || null,
      emergency_contact_name: input.emergencyContactName || null,
      emergency_contact_phone: input.emergencyContactPhone || null,
    }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateDog(id: number, updates: Record<string, any>) {
  const { data, error } = await supabase
    .from('dogs')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ============ VACCINATIONS ============

export async function getVaccinationsByDogId(dogId: number) {
  const { data, error } = await supabase
    .from('vaccinations')
    .select('*')
    .eq('dog_id', dogId);
  if (error) throw error;
  return data || [];
}

export async function createVaccination(dogId: number, vaccineName: string, expirationDate: string, dateAdministered?: string, documentUrl?: string) {
  const insertData: Record<string, any> = { dog_id: dogId, vaccine_name: vaccineName, expiration_date: expirationDate, status: 'current' };
  if (dateAdministered) insertData.date_administered = dateAdministered;
  if (documentUrl) insertData.document_url = documentUrl;
  const { data, error } = await supabase
    .from('vaccinations')
    .insert([insertData])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateVaccination(id: number, updates: Record<string, any>) {
  const { data, error } = await supabase
    .from('vaccinations')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ============ BOOKINGS ============

export async function getBookingById(id: number) {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function getBookingsByKennelId(kennelId: number) {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('kennel_id', kennelId)
    .order('check_in_date', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getBookingsByCustomerId(customerId: string) {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('customer_id', customerId)
    .order('check_in_date', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getTodayBookings(kennelId: number) {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('kennel_id', kennelId)
    .gte('check_in_date', today)
    .lte('check_in_date', today);
  if (error) throw error;
  return data || [];
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
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateBooking(id: number, updates: Record<string, any>) {
  const { data, error } = await supabase
    .from('bookings')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
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

export async function getAlertsByKennelId(kennelId: number) {
  const { data, error } = await supabase
    .from('alerts')
    .select('*')
    .eq('kennel_id', kennelId)
    .eq('is_read', false);
  if (error) throw error;
  return data || [];
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
  const { data, error } = await supabase
    .from('rooms')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
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
  const { data, error } = await supabase
    .from('checkout_add_ons')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
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

export async function updateBookingAddOn(id: number, updates: Record<string, any>) {
  const { data, error } = await supabase
    .from('booking_add_ons')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
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
