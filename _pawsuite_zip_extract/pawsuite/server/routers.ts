import { publicProcedure, protectedProcedure, router, ownerProcedure, employeeProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";
import { storagePut, storageDelete } from "./storage";
import { supabase } from "./_core/supabase";

export const appRouter = router({
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
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
      
      const kennel = await db.createKennel(ctx.user.id, input.name, input.address || '');
      
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
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateKennel(id, data);
      return { success: true };
    }),
    linkToKennel: protectedProcedure.input(z.object({ kennelId: z.number() })).mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
      const { error } = await supabase
        .from('kennel_customers')
        .insert([{ kennel_id: input.kennelId, customer_id: ctx.user.id }]);
      if (error && error.code !== 'PGRST103') {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }
      return { success: true };
    }),
    unlinkFromKennel: protectedProcedure.input(z.object({ kennelId: z.number() })).mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
      const { error } = await supabase
        .from('kennel_customers')
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
      pricePerUnit: z.union([z.number(), z.string()]).transform(v => parseFloat(String(v))),
      // description and unitType are accepted from frontend but only written to DB after migration
      description: z.string().optional(),
      unitType: z.enum(['per_night', 'per_day', 'per_session']).optional(),
    })).mutation(async ({ input }) => {
      return db.createService(input.kennelId, input.name, input.type, input.pricePerUnit);
    }),
    update: ownerProcedure.input(z.object({
      id: z.number(),
      name: z.string().optional(),
      type: z.enum(['boarding', 'daycare', 'grooming']).optional(),
      pricePerUnit: z.union([z.number(), z.string()]).transform(v => parseFloat(String(v))).optional(),
      description: z.string().optional(),
      unitType: z.enum(['per_night', 'per_day', 'per_session']).optional(),
      isActive: z.boolean().optional(),
    })).mutation(async ({ input }) => {
      const { id, pricePerUnit, description: _desc, unitType: _unit, ...rest } = input;
      // Only send columns that exist in the current schema
      const updates: Record<string, any> = {};
      if (rest.name !== undefined) updates.name = rest.name;
      if (rest.type !== undefined) updates.type = rest.type;
      if (rest.isActive !== undefined) updates.is_active = rest.isActive;
      if (pricePerUnit !== undefined) updates.price_per_unit = pricePerUnit;
      return db.updateService(id, updates);
    }),
    delete: ownerProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
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
      const { data, error } = await supabase
        .from('dogs')
        .select('*')
        .eq('kennel_id', input.kennelId);
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      return data || [];
    }),
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return db.getDogById(input.id);
    }),
    create: protectedProcedure.input(z.object({
      name: z.string(),
      breed: z.string().optional(),
      age: z.number().optional(),
      weight: z.number().optional(),
      sex: z.enum(['male', 'female']).optional(),
      isSpayedNeutered: z.boolean().optional(),
      feedingInstructions: z.string().optional(),
      medications: z.string().optional(),
      behaviorNotes: z.string().optional(),
      vetName: z.string().optional(),
      vetPhone: z.string().optional(),
      emergencyContactName: z.string().optional(),
      emergencyContactPhone: z.string().optional(),
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
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      return db.updateDog(id, data);
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
      vaccineName: z.string(),
      dateAdministered: z.string().optional(),
      expirationDate: z.string(),
      documentUrl: z.string().optional(),
    })).mutation(async ({ input }) => {
      return db.createVaccination(input.dogId, input.vaccineName, input.expirationDate, input.dateAdministered, input.documentUrl);
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

      return booking;
    }),
    updateStatus: protectedProcedure.input(z.object({
      id: z.number(),
      status: z.enum(['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'completed']).optional(),
      paymentStatus: z.enum(['unpaid', 'deposit_paid', 'paid', 'partial']).optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      return db.updateBooking(id, data);
    }),
    edit: protectedProcedure.input(z.object({
      id: z.number(),
      checkInDate: z.string().optional(),
      checkOutDate: z.string().optional(),
      notes: z.string().optional(),
      serviceId: z.number().optional(),
    })).mutation(async ({ input }) => {
      const { id, checkInDate, checkOutDate, notes, serviceId } = input;
      const updates: Record<string, any> = {};
      if (checkInDate) updates.check_in_date = checkInDate;
      if (checkOutDate) updates.check_out_date = checkOutDate;
      if (notes !== undefined) updates.notes = notes;
      if (serviceId) updates.service_id = serviceId;
      return db.updateBooking(id, updates);
    }),
    cancel: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      return db.updateBooking(input.id, { status: 'cancelled' });
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(),
      status: z.enum(['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'completed']).optional(),
      paymentStatus: z.enum(['unpaid', 'deposit_paid', 'paid', 'partial']).optional(),
      checkedInAt: z.string().optional(),
      checkedOutAt: z.string().optional(),
    })).mutation(async ({ input }) => {
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
    byKennel: ownerProcedure.input(z.object({ kennelId: z.number() })).query(async ({ input }) => {
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
        .filter(b => b.status !== 'cancelled' && (b.payment_status === 'unpaid' || b.payment_status === 'partial'))
        .reduce((sum: number, b: any) => sum + parseFloat(String(b.total_price || 0)), 0);

      const upcomingCharges = bookings
        .filter(b => b.status === 'confirmed' || b.status === 'pending')
        .reduce((sum: number, b: any) => sum + parseFloat(String(b.total_price || 0)), 0);

      const paidThisMonth = payments
        .filter((p: any) => new Date(p.created_at) >= startOfMonth && p.status === 'completed')
        .reduce((sum: number, p: any) => sum + parseFloat(String(p.amount || 0)), 0);

      return { balanceDue, upcomingCharges, paidThisMonth };
    }),
    createCheckoutSession: protectedProcedure.input(z.object({
      bookingId: z.number(),
      origin: z.string(),
    })).mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
      const { stripe } = await import('./stripe');
      if (!stripe) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Stripe is not configured' });

      const booking = await db.getBookingById(input.bookingId);
      if (!booking) throw new TRPCError({ code: 'NOT_FOUND', message: 'Booking not found' });

      const amount = Math.round(parseFloat(String(booking.total_price || 0)) * 100);
      if (amount < 50) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Minimum payment amount is $0.50' });

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        customer_email: ctx.user.email || undefined,
        client_reference_id: ctx.user.id,
        metadata: {
          booking_id: String(input.bookingId),
          customer_id: ctx.user.id,
          kennel_id: String(booking.kennel_id),
          user_id: ctx.user.id,
          customer_email: ctx.user.email || '',
        },
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: { name: `Kennel Stay #${input.bookingId}` },
            unit_amount: amount,
          },
          quantity: 1,
        }],
        success_url: `${input.origin}/payments?payment=success`,
        cancel_url: `${input.origin}/payments?payment=cancelled`,
        allow_promotion_codes: true,
      });

      return { url: session.url };
    }),
    create: protectedProcedure.input(z.object({
      bookingId: z.number(),
      kennelId: z.number(),
      amount: z.number(),
      stripePaymentId: z.string(),
    })).mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
      return db.createPayment(input.bookingId, ctx.user.id, input.kennelId, input.amount, input.stripePaymentId);
    }),
  }),

  // ===== ROOMS ROUTES =====
  room: router({
    list: protectedProcedure.input(z.object({ kennelId: z.number() })).query(async ({ input }) => {
      return db.getRoomsByKennelId(input.kennelId);
    }),
    byKennel: protectedProcedure.input(z.object({ kennelId: z.number() })).query(async ({ input }) => {
      return db.getRoomsByKennelId(input.kennelId);
    }),
    currentAssignments: protectedProcedure.input(z.object({ kennelId: z.number() })).query(async ({ input }) => {
      // Return bookings that are currently checked in, with their room assignments
      const { data, error } = await supabase
        .from('bookings')
        .select('id, room_id, dog_id, status')
        .eq('kennel_id', input.kennelId)
        .eq('status', 'checked_in');
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      return (data || []).map((b: any) => ({ bookingId: b.id, roomId: b.room_id, dogId: b.dog_id }));
    }),
    assign: employeeProcedure.input(z.object({
      bookingId: z.number(),
      roomId: z.number().nullable(),
    })).mutation(async ({ input }) => {
      const { error } = await supabase
        .from('bookings')
        .update({ room_id: input.roomId })
        .eq('id', input.bookingId);
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      return { success: true };
    }),
    create: ownerProcedure.input(z.object({
      kennelId: z.number(),
      name: z.string(),
      building: z.string().optional(),
      sizeType: z.enum(['small', 'medium', 'large', 'mixed', 'special_care']).optional(),
      capacity: z.number().optional(),
      notes: z.string().optional(),
    })).mutation(async ({ input }) => {
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
    })).mutation(async ({ input }) => {
      const { id, isAvailable, sizeType, ...rest } = input;
      const updates: Record<string, any> = { ...rest };
      if (isAvailable !== undefined) updates.is_available = isAvailable;
      if (sizeType !== undefined) updates.size_type = sizeType;
      return db.updateRoom(id, updates);
    }),
    delete: ownerProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteRoom(input.id);
      return { success: true };
    }),
    dailyAvailability: protectedProcedure.input(z.object({
      kennelId: z.number(),
      startDate: z.string(),
      endDate: z.string(),
    })).query(async ({ input }) => {
      const rooms = await db.getRoomsByKennelId(input.kennelId);
      const { data: bookings } = await supabase
        .from('bookings')
        .select('id, room_id, dog_id, check_in_date, check_out_date, status')
        .eq('kennel_id', input.kennelId)
        .in('status', ['confirmed', 'checked_in'])
        .lte('check_in_date', input.endDate)
        .gte('check_out_date', input.startDate);

      // Build date range
      const dates: string[] = [];
      const cur = new Date(input.startDate);
      const end = new Date(input.endDate);
      while (cur <= end) {
        dates.push(cur.toISOString().split('T')[0]);
        cur.setDate(cur.getDate() + 1);
      }

      return dates.map(date => ({
        date,
        rooms: rooms.map((room: any) => {
          const dayBookings = (bookings || []).filter((b: any) =>
            b.room_id === room.id &&
            b.check_in_date <= date &&
            (b.check_out_date >= date || !b.check_out_date)
          );
          return {
            roomId: room.id,
            roomName: room.name,
            building: room.building || 'Unassigned',
            capacity: room.capacity || 1,
            occupancy: dayBookings.length,
            booked: dayBookings.length >= (room.capacity || 1),
            bookingIds: dayBookings.map((b: any) => b.id),
            dogNames: [],
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
    })).mutation(async ({ input }) => {
      return db.createCheckoutAddOn(input.kennelId, input.name, input.price);
    }),
    update: ownerProcedure.input(z.object({
      id: z.number(),
      name: z.string().optional(),
      price: z.number().optional(),
      isActive: z.boolean().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      return db.updateCheckoutAddOn(id, data);
    }),
    delete: ownerProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteCheckoutAddOn(input.id);
      return { success: true };
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
    })).mutation(async ({ input }) => {
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
    })).mutation(async ({ input }) => {
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
      const [dogs, bookings] = await Promise.all([
        db.getDogsByOwnerId(ctx.user.id),
        db.getBookingsByCustomerId(ctx.user.id),
      ]);

      // Build dog statuses
      const dogStatuses = await Promise.all(dogs.map(async (dog: any) => {
        const vax = await db.getVaccinationsByDogId(dog.id);
        const hasIssue = (vax as any[]).some((v: any) => v.status === 'expired' || v.status === 'missing');
        return { dogId: dog.id, dogName: dog.name, status: hasIssue ? 'action_needed' : 'ready' };
      }));

      const upcomingStays = bookings.filter((b: any) => b.check_in_date > today && b.status !== 'cancelled').length;
      const activeStays = bookings.filter((b: any) => b.status === 'checked_in').length;

      // Build action items
      const actionItems: { message: string; severity: string; dogId?: number }[] = [];
      for (const ds of dogStatuses) {
        if (ds.status === 'action_needed') {
          actionItems.push({ message: `${ds.dogName} has vaccination issues`, severity: 'critical', dogId: ds.dogId });
        }
      }
      const unpaidBookings = bookings.filter((b: any) => b.payment_status === 'unpaid' && b.status !== 'cancelled');
      if (unpaidBookings.length > 0) {
        actionItems.push({ message: `${unpaidBookings.length} unpaid booking(s)`, severity: 'warning' });
      }

      return { dogsCount: dogs.length, dogStatuses, upcomingStays, activeStays, actionItems };
    }),
    ownerDashboard: ownerProcedure.input(z.object({ kennelId: z.number() })).query(async ({ input }) => {
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
        b.check_in_date <= today && (b.check_out_date >= today || !b.check_out_date) &&
        (b.status === 'confirmed' || b.status === 'checked_in')
      );
      const todayOccupancy = todayBookings.length;
      const totalCapacity = rooms.reduce((sum: number, r: any) => sum + (r.capacity || 1), 0) || 20;

      const monthPayments = (payments as any[]).filter((p: any) => p.created_at >= monthStart && p.status === 'completed');
      const monthRevenue = monthPayments.reduce((sum: number, p: any) => sum + parseFloat(String(p.amount || 0)), 0);
      const totalRevenue = (payments as any[]).filter((p: any) => p.status === 'completed').reduce((sum: number, p: any) => sum + parseFloat(String(p.amount || 0)), 0);

      const pendingBookings = bookings.filter((b: any) => b.status === 'pending').length;
      const upcomingBookings = bookings.filter((b: any) => b.check_in_date > today && b.status !== 'cancelled').length;

      const activeBookings = bookings.filter((b: any) => b.status === 'checked_in').length;
      const totalBookings = bookings.length;

      return { todayOccupancy, totalCapacity, monthRevenue, totalRevenue, pendingBookings, upcomingBookings, activeBookings, totalBookings };
    }),
  }),

  // ===== ALERTS ROUTES =====
  alert: router({
    list: employeeProcedure.input(z.object({ kennelId: z.number() })).query(async ({ input }) => {
      return db.getAlertsByKennelId(input.kennelId);
    }),
    byKennel: protectedProcedure.input(z.object({ kennelId: z.number() })).query(async ({ input }) => {
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
      if (error) return [];
      return (data || []).map((a: any) => ({
        id: a.id,
        type: a.type,
        severity: a.severity,
        title: a.title,
        message: a.message,
        isRead: a.is_read,
        createdAt: a.created_at,
      }));
    }),
    markRead: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      const { error } = await supabase
        .from('alerts')
        .update({ is_read: true })
        .eq('id', input.id);
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      return { success: true };
    }),
    missingDogInfo: protectedProcedure.input(z.object({ kennelId: z.number() })).query(async ({ input }) => {
      // Find bookings with dogs that have missing vaccination or info issues
      const { data: bookings } = await supabase
        .from('bookings')
        .select('id, dog_id, status, check_in_date')
        .eq('kennel_id', input.kennelId)
        .in('status', ['pending', 'confirmed']);
      if (!bookings) return [];
      const issues: { bookingId: number; dogName: string; details: string; checkInDate: string; bookingStatus: string }[] = [];
      for (const b of bookings) {
        const { data: dog } = await supabase.from('dogs').select('name').eq('id', b.dog_id).single();
        const { data: vax } = await supabase.from('vaccinations').select('status').eq('dog_id', b.dog_id);
        const missingVax = (vax || []).filter((v: any) => v.status === 'missing' || v.status === 'expired');
        if (missingVax.length > 0) {
          issues.push({ bookingId: b.id, dogName: dog?.name || 'Unknown', details: `${missingVax.length} vaccination issue(s)`, checkInDate: b.check_in_date || '', bookingStatus: b.status || '' });
        }
      }
      return issues;
    }),
  }),

  // ===== CUSTOMER KENNEL ROUTES =====
  customerKennel: router({
    myLinkedKennels: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
      const { data, error } = await supabase
        .from('kennel_customers')
        .select('kennel_id, is_favorite, kennels(id, name, phone, email)')
        .eq('customer_id', ctx.user.id);
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      return (data || []).map((row: any) => ({
        kennelId: row.kennel_id,
        kennelName: row.kennels?.name || `Kennel #${row.kennel_id}`,
        kennelPhone: row.kennels?.phone || null,
        kennelEmail: row.kennels?.email || null,
        isFavorite: row.is_favorite || false,
      }));
    }),
    link: protectedProcedure.input(z.object({ kennelId: z.number() })).mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
      const { error } = await supabase
        .from('kennel_customers')
        .upsert([{ kennel_id: input.kennelId, customer_id: ctx.user.id }], { onConflict: 'kennel_id,customer_id' });
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      return { success: true };
    }),
    unlink: protectedProcedure.input(z.object({ kennelId: z.number() })).mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
      const { error } = await supabase
        .from('kennel_customers')
        .delete()
        .eq('kennel_id', input.kennelId)
        .eq('customer_id', ctx.user.id);
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      return { success: true };
    }),
    toggleFavorite: protectedProcedure.input(z.object({ kennelId: z.number() })).mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
      // Get current state
      const { data: existing } = await supabase
        .from('kennel_customers')
        .select('is_favorite')
        .eq('kennel_id', input.kennelId)
        .eq('customer_id', ctx.user.id)
        .single();
      const newFav = !(existing?.is_favorite || false);
      const { error } = await supabase
        .from('kennel_customers')
        .update({ is_favorite: newFav })
        .eq('kennel_id', input.kennelId)
        .eq('customer_id', ctx.user.id);
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      return { success: true, isFavorite: newFav };
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
    add: ownerProcedure.input(z.object({ kennelId: z.number(), vaccineName: z.string() })).mutation(async ({ input }) => {
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
      return data;
    }),
    remove: ownerProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
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
    list: protectedProcedure.input(z.object({ bookingId: z.number() })).query(async ({ input }) => {
      return db.getBookingAddOns(input.bookingId);
    }),
    addToBooking: employeeProcedure.input(z.object({
      bookingId: z.number(),
      addOnId: z.number(),
      dogId: z.number(),
      price: z.number(),
    })).mutation(async ({ input }) => {
      return db.addBookingAddOn(input.bookingId, input.addOnId, input.dogId, input.price);
    }),
    markComplete: employeeProcedure.input(z.object({
      bookingId: z.number(),
      addOnId: z.number(),
    })).mutation(async ({ input }) => {
      const { error } = await supabase
        .from('booking_add_ons')
        .update({ completed: true })
        .eq('booking_id', input.bookingId)
        .eq('add_on_id', input.addOnId);
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      return { success: true };
    })
  }),
});

export type AppRouter = typeof appRouter;
