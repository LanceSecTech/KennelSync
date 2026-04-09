import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, decimal, date } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["owner", "employee", "customer"]).default("customer").notNull(),
  kennelId: int("kennelId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const kennels = mysqlTable("kennels", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 50 }),
  zip: varchar("zip", { length: 20 }),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 320 }),
  logoUrl: text("logoUrl"),
  totalCapacity: int("totalCapacity").default(20).notNull(),
  hoursOpen: varchar("hoursOpen", { length: 10 }).default("07:00"),
  hoursClose: varchar("hoursClose", { length: 10 }).default("19:00"),
  policies: text("policies"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Kennel = typeof kennels.$inferSelect;

export const services = mysqlTable("services", {
  id: int("id").autoincrement().primaryKey(),
  kennelId: int("kennelId").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  type: mysqlEnum("type", ["boarding", "daycare", "grooming", "bath"]).notNull(),
  description: text("description"),
  pricePerUnit: decimal("pricePerUnit", { precision: 10, scale: 2 }).notNull(),
  unitType: mysqlEnum("unitType", ["per_night", "per_day", "per_session"]).default("per_day").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Service = typeof services.$inferSelect;

export const dogs = mysqlTable("dogs", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  breed: varchar("breed", { length: 100 }),
  age: int("age"),
  weight: decimal("weight", { precision: 5, scale: 1 }),
  sex: mysqlEnum("sex", ["male", "female"]),
  isSpayedNeutered: boolean("isSpayedNeutered").default(false),
  photoUrl: text("photoUrl"),
  feedingInstructions: text("feedingInstructions"),
  medications: text("medications"),
  behaviorNotes: text("behaviorNotes"),
  specialNeeds: text("specialNeeds"),
  vetName: varchar("vetName", { length: 200 }),
  vetPhone: varchar("vetPhone", { length: 20 }),
  emergencyContactName: varchar("emergencyContactName", { length: 200 }),
  emergencyContactPhone: varchar("emergencyContactPhone", { length: 20 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Dog = typeof dogs.$inferSelect;

export const vaccinations = mysqlTable("vaccinations", {
  id: int("id").autoincrement().primaryKey(),
  dogId: int("dogId").notNull(),
  vaccineName: varchar("vaccineName", { length: 100 }).notNull(),
  dateAdministered: date("dateAdministered"),
  expirationDate: date("expirationDate"),
  documentUrl: text("documentUrl"),
  status: mysqlEnum("status", ["current", "expiring_soon", "expired", "missing"]).default("missing").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Vaccination = typeof vaccinations.$inferSelect;

export const bookings = mysqlTable("bookings", {
  id: int("id").autoincrement().primaryKey(),
  kennelId: int("kennelId").notNull(),
  customerId: int("customerId").notNull(),
  dogId: int("dogId").notNull(),
  serviceId: int("serviceId").notNull(),
  status: mysqlEnum("status", ["pending", "confirmed", "checked_in", "checked_out", "cancelled", "completed"]).default("pending").notNull(),
  checkInDate: date("checkInDate").notNull(),
  checkOutDate: date("checkOutDate"),
  totalPrice: decimal("totalPrice", { precision: 10, scale: 2 }),
  notes: text("notes"),
  checkedInAt: timestamp("checkedInAt"),
  checkedOutAt: timestamp("checkedOutAt"),
  checkedInBy: int("checkedInBy"),
  checkedOutBy: int("checkedOutBy"),
  roomId: int("roomId"),
  paymentOption: mysqlEnum("paymentOption", ["pay_now", "pay_later"]).default("pay_later").notNull(),
  paymentStatus: mysqlEnum("paymentStatus", ["unpaid", "deposit_paid", "paid", "partial"]).default("unpaid").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Booking = typeof bookings.$inferSelect;

export const payments = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(),
  bookingId: int("bookingId").notNull(),
  customerId: int("customerId").notNull(),
  kennelId: int("kennelId").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  type: mysqlEnum("type", ["full", "deposit", "balance", "refund"]).default("full").notNull(),
  status: mysqlEnum("status", ["pending", "completed", "failed", "refunded"]).default("pending").notNull(),
  stripePaymentId: varchar("stripePaymentId", { length: 255 }),
  stripeCheckoutSessionId: varchar("stripeCheckoutSessionId", { length: 255 }),
  paidAt: timestamp("paidAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Payment = typeof payments.$inferSelect;

export const alerts = mysqlTable("alerts", {
  id: int("id").autoincrement().primaryKey(),
  kennelId: int("kennelId").notNull(),
  targetUserId: int("targetUserId"),
  type: mysqlEnum("type", ["vaccination_expiring", "vaccination_expired", "booking_conflict", "payment_due", "check_in_reminder", "capacity_warning", "general"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message"),
  severity: mysqlEnum("severity", ["info", "warning", "critical"]).default("info").notNull(),
  isRead: boolean("isRead").default(false).notNull(),
  relatedDogId: int("relatedDogId"),
  relatedBookingId: int("relatedBookingId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Alert = typeof alerts.$inferSelect;

export const rooms = mysqlTable("rooms", {
  id: int("id").autoincrement().primaryKey(),
  kennelId: int("kennelId").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  building: varchar("building", { length: 100 }),
  sizeType: mysqlEnum("sizeType", ["small", "medium", "large", "mixed", "special_care"]).default("mixed").notNull(),
  capacity: int("capacity").default(1).notNull(),
  notes: text("notes"),
  isAvailable: boolean("isAvailable").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Room = typeof rooms.$inferSelect;

export const roomAssignmentHistory = mysqlTable("roomAssignmentHistory", {
  id: int("id").autoincrement().primaryKey(),
  roomId: int("roomId").notNull(),
  bookingId: int("bookingId").notNull(),
  dogId: int("dogId").notNull(),
  assignedBy: int("assignedBy").notNull(),
  assignedAt: timestamp("assignedAt").defaultNow().notNull(),
  removedAt: timestamp("removedAt"),
  notes: text("notes"),
});

export type RoomAssignmentHistory = typeof roomAssignmentHistory.$inferSelect;

export const kennelFavorites = mysqlTable("kennelFavorites", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  kennelId: int("kennelId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// Kennel required vaccines - each kennel can define which vaccines are required
export const kennelRequiredVaccines = mysqlTable("kennelRequiredVaccines", {
  id: int("id").autoincrement().primaryKey(),
  kennelId: int("kennelId").notNull(),
  vaccineName: varchar("vaccineName", { length: 100 }).notNull(),
  isRequired: boolean("isRequired").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type KennelRequiredVaccine = typeof kennelRequiredVaccines.$inferSelect;

// Booking-dogs join table: supports multiple dogs per booking/stay
export const bookingDogs = mysqlTable("bookingDogs", {
  id: int("id").autoincrement().primaryKey(),
  bookingId: int("bookingId").notNull(),
  dogId: int("dogId").notNull(),
  roomId: int("roomId"),
});

export type BookingDog = typeof bookingDogs.$inferSelect;

// Customer-kennel association for multi-kennel support
export const customerKennels = mysqlTable("customerKennels", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  kennelId: int("kennelId").notNull(),
  isFavorite: boolean("isFavorite").default(false).notNull(),
  isDefault: boolean("isDefault").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CustomerKennel = typeof customerKennels.$inferSelect;

// Checkout add-ons (baths, nails, etc.) - owner-managed per kennel
export const checkoutAddOns = mysqlTable("checkoutAddOns", {
  id: int("id").autoincrement().primaryKey(),
  kennelId: int("kennelId").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CheckoutAddOn = typeof checkoutAddOns.$inferSelect;

// Booking add-ons: tracks which add-ons were selected for a booking during checkout
export const bookingAddOns = mysqlTable("bookingAddOns", {
  id: int("id").autoincrement().primaryKey(),
  bookingId: int("bookingId").notNull(),
  addOnId: int("addOnId").notNull(),
  dogId: int("dogId"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  completed: boolean("completed").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type BookingAddOn = typeof bookingAddOns.$inferSelect;

// Business hours per day of week for each kennel
export const businessHours = mysqlTable("businessHours", {
  id: int("id").autoincrement().primaryKey(),
  kennelId: int("kennelId").notNull(),
  dayOfWeek: int("dayOfWeek").notNull(), // 0=Sunday, 1=Monday, ..., 6=Saturday
  openTime: varchar("openTime", { length: 10 }), // e.g. "07:00"
  closeTime: varchar("closeTime", { length: 10 }), // e.g. "19:00"
  isClosed: boolean("isClosed").default(false).notNull(),
});

export type BusinessHours = typeof businessHours.$inferSelect;
