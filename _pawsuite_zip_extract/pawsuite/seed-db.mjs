/**
 * KennelSync Database Seed Script
 * Populates the database with realistic sample data for testing all dashboards.
 * 
 * Run: node seed-db.mjs
 */

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const connection = await mysql.createConnection(DATABASE_URL);
const db = drizzle(connection);

// Helper to run raw SQL
async function sql(query, params = []) {
  const [rows] = await connection.execute(query, params);
  return rows;
}

// Get the owner user (the logged-in project owner)
const [ownerUser] = await sql("SELECT id, openId FROM users WHERE role = 'owner' LIMIT 1");
if (!ownerUser) {
  console.error("No owner user found. Please log in first, then run this script.");
  await connection.end();
  process.exit(1);
}
const OWNER_ID = ownerUser.id;
console.log(`Found owner user: ID=${OWNER_ID}`);

// ===== CLEAN EXISTING SEED DATA =====
console.log("Cleaning existing data...");
await sql("DELETE FROM roomAssignmentHistory");
await sql("DELETE FROM kennelFavorites");
await sql("DELETE FROM alerts");
await sql("DELETE FROM payments");
await sql("DELETE FROM bookings");
await sql("DELETE FROM vaccinations");
await sql("DELETE FROM dogs");
await sql("DELETE FROM rooms");
await sql("DELETE FROM services");
await sql("DELETE FROM kennels");
await sql("DELETE FROM users WHERE role != 'owner'");
console.log("Cleaned.");

// ===== CREATE KENNEL =====
console.log("Creating kennel...");
await sql(`INSERT INTO kennels (ownerId, name, description, address, city, state, zip, phone, email, totalCapacity, hoursOpen, hoursClose, policies) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
  OWNER_ID,
  "Happy Tails Boarding & Daycare",
  "A premium dog boarding and daycare facility offering personalized care in a safe, fun environment. Our experienced staff treats every dog like family. We provide spacious indoor/outdoor play areas, comfortable sleeping quarters, and 24/7 supervision.",
  "1234 Paw Print Lane",
  "Austin",
  "TX",
  "78701",
  "(512) 555-0199",
  "info@happytails.com",
  25,
  "06:30",
  "20:00",
  "All dogs must be up to date on vaccinations (Rabies, DHPP, Bordetella). Dogs must be spayed/neutered if over 6 months. Aggressive dogs will not be accepted. 48-hour cancellation policy for full refund. Check-in is between 7:00 AM - 10:00 AM. Check-out is between 3:00 PM - 7:00 PM."
]);
const [kennel] = await sql("SELECT id FROM kennels ORDER BY id DESC LIMIT 1");
const KENNEL_ID = kennel.id;
console.log(`Kennel created: ID=${KENNEL_ID}`);

// ===== CREATE SERVICES =====
console.log("Creating services...");
const serviceData = [
  [KENNEL_ID, "Overnight Boarding", "boarding", "Comfortable overnight stays with bedtime snacks, cozy bedding, and evening walks.", "45.00", "per_night"],
  [KENNEL_ID, "Full Day Daycare", "daycare", "A full day of supervised play, socialization, and rest. Includes lunch and afternoon nap.", "35.00", "per_day"],
  [KENNEL_ID, "Half Day Daycare", "daycare", "Morning or afternoon session of supervised play and socialization.", "22.00", "per_day"],
  [KENNEL_ID, "Full Grooming", "grooming", "Bath, haircut, nail trim, ear cleaning, and teeth brushing.", "65.00", "per_session"],
  [KENNEL_ID, "Bath & Brush", "bath", "Warm bath, blow dry, brushing, and nail trim.", "35.00", "per_session"],
  [KENNEL_ID, "Luxury Spa Bath", "bath", "Premium shampoo, conditioner, blow dry, brushing, nail trim, ear cleaning, and cologne.", "55.00", "per_session"],
];
for (const s of serviceData) {
  await sql("INSERT INTO services (kennelId, name, type, description, pricePerUnit, unitType) VALUES (?, ?, ?, ?, ?, ?)", s);
}
const servicesResult = await sql("SELECT id, name, type, pricePerUnit FROM services WHERE kennelId = ?", [KENNEL_ID]);
console.log(`Created ${servicesResult.length} services`);

// ===== CREATE ROOMS =====
console.log("Creating rooms...");
const roomData = [
  [KENNEL_ID, "Suite A1", "Main Building", "large", 2, "Spacious suite with window view"],
  [KENNEL_ID, "Suite A2", "Main Building", "large", 2, "Corner suite, extra quiet"],
  [KENNEL_ID, "Suite A3", "Main Building", "medium", 1, "Standard suite"],
  [KENNEL_ID, "Room B1", "Main Building", "medium", 1, "Near play area"],
  [KENNEL_ID, "Room B2", "Main Building", "medium", 1, "Near play area"],
  [KENNEL_ID, "Room B3", "Main Building", "small", 1, "Cozy room for small dogs"],
  [KENNEL_ID, "Room B4", "Main Building", "small", 1, "Cozy room for small dogs"],
  [KENNEL_ID, "Cottage C1", "Garden Cottages", "large", 2, "Private cottage with yard access"],
  [KENNEL_ID, "Cottage C2", "Garden Cottages", "large", 2, "Private cottage with yard access"],
  [KENNEL_ID, "Cottage C3", "Garden Cottages", "medium", 1, "Garden view cottage"],
  [KENNEL_ID, "Special Care D1", "Medical Wing", "special_care", 1, "For dogs needing medication or special attention"],
  [KENNEL_ID, "Special Care D2", "Medical Wing", "special_care", 1, "Quiet, climate-controlled room"],
];
for (const r of roomData) {
  await sql("INSERT INTO rooms (kennelId, name, building, sizeType, capacity, notes) VALUES (?, ?, ?, ?, ?, ?)", r);
}
const roomsResult = await sql("SELECT id, name FROM rooms WHERE kennelId = ?", [KENNEL_ID]);
console.log(`Created ${roomsResult.length} rooms`);

// ===== CREATE EMPLOYEE USERS =====
console.log("Creating employee users...");
await sql("INSERT INTO users (openId, name, email, phone, role, kennelId) VALUES (?, ?, ?, ?, ?, ?)", [
  "emp-sarah-001", "Sarah Mitchell", "sarah@happytails.com", "(512) 555-0201", "employee", KENNEL_ID
]);
await sql("INSERT INTO users (openId, name, email, phone, role, kennelId) VALUES (?, ?, ?, ?, ?, ?)", [
  "emp-jake-002", "Jake Rodriguez", "jake@happytails.com", "(512) 555-0202", "employee", KENNEL_ID
]);
const employees = await sql("SELECT id, name FROM users WHERE role = 'employee'");
console.log(`Created ${employees.length} employees`);

// ===== CREATE CUSTOMER USERS =====
console.log("Creating customer users...");
const customerData = [
  ["cust-emily-001", "Emily Chen", "emily.chen@email.com", "(512) 555-1001"],
  ["cust-marcus-002", "Marcus Johnson", "marcus.j@email.com", "(512) 555-1002"],
  ["cust-lisa-003", "Lisa Patel", "lisa.patel@email.com", "(512) 555-1003"],
  ["cust-david-004", "David Kim", "david.kim@email.com", "(512) 555-1004"],
  ["cust-rachel-005", "Rachel Thompson", "rachel.t@email.com", "(512) 555-1005"],
];
for (const c of customerData) {
  await sql("INSERT INTO users (openId, name, email, phone, role) VALUES (?, ?, ?, ?, 'customer')", c);
}
const customers = await sql("SELECT id, name FROM users WHERE role = 'customer'");
console.log(`Created ${customers.length} customers`);

// ===== CREATE DOGS =====
console.log("Creating dogs...");
const dogData = [
  // Emily's dogs
  [customers[0].id, "Bella", "Golden Retriever", 3, "65.5", "female", true,
    "2 cups dry food morning and evening. Add warm water to soften. Loves carrots as treats.",
    null, "Very friendly, loves other dogs. Knows basic commands. Gets excited during walks.",
    null, "Dr. Sarah Williams", "(512) 555-8001", "Tom Chen", "(512) 555-9001"],
  [customers[0].id, "Max", "Labrador Mix", 5, "72.0", "male", true,
    "1.5 cups dry food twice daily. Sensitive stomach - no chicken-based food.",
    "Glucosamine supplement with morning meal for joint health.",
    "Calm and gentle. Good with all dogs. Prefers shade in hot weather.",
    "Mild hip dysplasia - avoid excessive jumping", "Dr. Sarah Williams", "(512) 555-8001", "Tom Chen", "(512) 555-9001"],
  // Marcus's dog
  [customers[1].id, "Luna", "German Shepherd", 2, "58.0", "female", true,
    "3 cups high-protein food split into two meals. Needs fresh water frequently.",
    null, "High energy, needs lots of exercise. Can be shy with new dogs initially but warms up. Very treat-motivated.",
    null, "Dr. Mike Torres", "(512) 555-8002", "Sandra Johnson", "(512) 555-9002"],
  // Lisa's dogs
  [customers[2].id, "Charlie", "French Bulldog", 4, "25.0", "male", true,
    "1 cup small-breed formula twice daily. No grains.",
    "Allergy medication (Apoquel) - 1 tablet with dinner.",
    "Playful but tires easily. Keep away from extreme heat. Snores loudly.",
    "Brachycephalic - monitor breathing in heat", "Dr. Amy Lee", "(512) 555-8003", "Raj Patel", "(512) 555-9003"],
  [customers[2].id, "Daisy", "Poodle Mix", 6, "15.0", "female", true,
    "3/4 cup senior formula twice daily. Loves blueberries as treats.",
    null, "Sweet and calm. Gets along with everyone. Prefers quiet areas for napping.",
    null, "Dr. Amy Lee", "(512) 555-8003", "Raj Patel", "(512) 555-9003"],
  // David's dog
  [customers[3].id, "Rocky", "Boxer", 3, "68.0", "male", true,
    "2 cups performance formula morning and evening. Needs slow-feeder bowl.",
    null, "Very energetic and playful. Loves fetch. Can be mouthy when excited - redirect with toys.",
    null, "Dr. James Park", "(512) 555-8004", "Susan Kim", "(512) 555-9004"],
  // Rachel's dogs
  [customers[4].id, "Coco", "Cavalier King Charles", 7, "18.0", "female", true,
    "1 cup heart-healthy formula twice daily. No table scraps.",
    "Heart medication (Vetmedin) - 1/2 tablet morning and evening. CRITICAL - do not miss doses.",
    "Gentle and affectionate. Loves lap time. Gets anxious during thunderstorms.",
    "Heart murmur - Grade III. Monitor for coughing or lethargy.", "Dr. Lisa Brown", "(512) 555-8005", "Mike Thompson", "(512) 555-9005"],
  [customers[4].id, "Buddy", "Beagle", 4, "30.0", "male", false,
    "1.5 cups standard formula twice daily. Will eat ANYTHING - watch closely.",
    null, "Friendly and curious. Howls occasionally. Strong nose - will follow scents. Not neutered.",
    "Not neutered - keep separate from females in heat", "Dr. Lisa Brown", "(512) 555-8005", "Mike Thompson", "(512) 555-9005"],
];

for (const d of dogData) {
  await sql(`INSERT INTO dogs (ownerId, name, breed, age, weight, sex, isSpayedNeutered, feedingInstructions, medications, behaviorNotes, specialNeeds, vetName, vetPhone, emergencyContactName, emergencyContactPhone) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, d);
}
const allDogs = await sql("SELECT id, name, ownerId FROM dogs ORDER BY id");
console.log(`Created ${allDogs.length} dogs`);

// ===== CREATE VACCINATIONS =====
console.log("Creating vaccinations...");
const today = new Date();
const daysAgo = (n) => { const d = new Date(today); d.setDate(d.getDate() - n); return d.toISOString().split('T')[0]; };
const daysFromNow = (n) => { const d = new Date(today); d.setDate(d.getDate() + n); return d.toISOString().split('T')[0]; };

for (const dog of allDogs) {
  // Rabies - most dogs current
  if (dog.name === "Buddy") {
    // Buddy has expired rabies
    await sql("INSERT INTO vaccinations (dogId, vaccineName, dateAdministered, expirationDate, status) VALUES (?, ?, ?, ?, ?)",
      [dog.id, "Rabies", daysAgo(400), daysAgo(35), "expired"]);
  } else if (dog.name === "Coco") {
    // Coco expiring soon
    await sql("INSERT INTO vaccinations (dogId, vaccineName, dateAdministered, expirationDate, status) VALUES (?, ?, ?, ?, ?)",
      [dog.id, "Rabies", daysAgo(350), daysFromNow(15), "expiring_soon"]);
  } else {
    await sql("INSERT INTO vaccinations (dogId, vaccineName, dateAdministered, expirationDate, status) VALUES (?, ?, ?, ?, ?)",
      [dog.id, "Rabies", daysAgo(90), daysFromNow(275), "current"]);
  }

  // DHPP
  if (dog.name === "Rocky") {
    // Rocky missing DHPP
    await sql("INSERT INTO vaccinations (dogId, vaccineName, status) VALUES (?, ?, ?)",
      [dog.id, "DHPP (Distemper)", "missing"]);
  } else {
    await sql("INSERT INTO vaccinations (dogId, vaccineName, dateAdministered, expirationDate, status) VALUES (?, ?, ?, ?, ?)",
      [dog.id, "DHPP (Distemper)", daysAgo(60), daysFromNow(305), "current"]);
  }

  // Bordetella
  if (dog.name === "Daisy") {
    // Daisy's bordetella expiring soon
    await sql("INSERT INTO vaccinations (dogId, vaccineName, dateAdministered, expirationDate, status) VALUES (?, ?, ?, ?, ?)",
      [dog.id, "Bordetella", daysAgo(340), daysFromNow(25), "expiring_soon"]);
  } else if (dog.name === "Buddy") {
    // Buddy missing bordetella too
    await sql("INSERT INTO vaccinations (dogId, vaccineName, status) VALUES (?, ?, ?)",
      [dog.id, "Bordetella", "missing"]);
  } else {
    await sql("INSERT INTO vaccinations (dogId, vaccineName, dateAdministered, expirationDate, status) VALUES (?, ?, ?, ?, ?)",
      [dog.id, "Bordetella", daysAgo(120), daysFromNow(245), "current"]);
  }

  // Canine Influenza - only some dogs
  if (["Bella", "Luna", "Charlie", "Coco"].includes(dog.name)) {
    await sql("INSERT INTO vaccinations (dogId, vaccineName, dateAdministered, expirationDate, status) VALUES (?, ?, ?, ?, ?)",
      [dog.id, "Canine Influenza", daysAgo(180), daysFromNow(185), "current"]);
  }
}
const vaxCount = await sql("SELECT COUNT(*) as cnt FROM vaccinations");
console.log(`Created ${vaxCount[0].cnt} vaccination records`);

// ===== CREATE BOOKINGS =====
console.log("Creating bookings...");

// Get service IDs
const boardingService = servicesResult.find(s => s.name === "Overnight Boarding");
const daycareService = servicesResult.find(s => s.name === "Full Day Daycare");
const groomingService = servicesResult.find(s => s.name === "Full Grooming");
const bathService = servicesResult.find(s => s.name === "Bath & Brush");

// Past completed bookings
await sql(`INSERT INTO bookings (kennelId, customerId, dogId, serviceId, status, checkInDate, checkOutDate, totalPrice, checkedInAt, checkedOutAt, checkedInBy, checkedOutBy, roomId) VALUES (?, ?, ?, ?, 'completed', ?, ?, ?, ?, ?, ?, ?, ?)`, [
  KENNEL_ID, customers[0].id, allDogs[0].id, boardingService.id,
  daysAgo(30), daysAgo(27), "135.00",
  new Date(Date.now() - 30*86400000), new Date(Date.now() - 27*86400000),
  employees[0].id, employees[0].id, roomsResult[0].id
]);

await sql(`INSERT INTO bookings (kennelId, customerId, dogId, serviceId, status, checkInDate, checkOutDate, totalPrice, checkedInAt, checkedOutAt, checkedInBy, checkedOutBy, roomId) VALUES (?, ?, ?, ?, 'completed', ?, ?, ?, ?, ?, ?, ?, ?)`, [
  KENNEL_ID, customers[1].id, allDogs[2].id, daycareService.id,
  daysAgo(14), daysAgo(14), "35.00",
  new Date(Date.now() - 14*86400000), new Date(Date.now() - 14*86400000),
  employees[1].id, employees[1].id, roomsResult[3].id
]);

await sql(`INSERT INTO bookings (kennelId, customerId, dogId, serviceId, status, checkInDate, checkOutDate, totalPrice, checkedInAt, checkedOutAt, checkedInBy, checkedOutBy) VALUES (?, ?, ?, ?, 'completed', ?, ?, ?, ?, ?, ?, ?)`, [
  KENNEL_ID, customers[2].id, allDogs[3].id, groomingService.id,
  daysAgo(7), daysAgo(7), "65.00",
  new Date(Date.now() - 7*86400000), new Date(Date.now() - 7*86400000),
  employees[0].id, employees[0].id
]);

await sql(`INSERT INTO bookings (kennelId, customerId, dogId, serviceId, status, checkInDate, checkOutDate, totalPrice, checkedInAt, checkedOutAt, checkedInBy, checkedOutBy, roomId) VALUES (?, ?, ?, ?, 'completed', ?, ?, ?, ?, ?, ?, ?, ?)`, [
  KENNEL_ID, customers[3].id, allDogs[5].id, boardingService.id,
  daysAgo(21), daysAgo(16), "225.00",
  new Date(Date.now() - 21*86400000), new Date(Date.now() - 16*86400000),
  employees[1].id, employees[0].id, roomsResult[7].id
]);

// Currently checked-in bookings (active today)
await sql(`INSERT INTO bookings (kennelId, customerId, dogId, serviceId, status, checkInDate, checkOutDate, totalPrice, checkedInAt, checkedInBy, roomId) VALUES (?, ?, ?, ?, 'checked_in', ?, ?, ?, ?, ?, ?)`, [
  KENNEL_ID, customers[0].id, allDogs[0].id, boardingService.id,
  daysAgo(2), daysFromNow(3), "225.00",
  new Date(Date.now() - 2*86400000), employees[0].id, roomsResult[0].id
]);

await sql(`INSERT INTO bookings (kennelId, customerId, dogId, serviceId, status, checkInDate, checkOutDate, totalPrice, checkedInAt, checkedInBy, roomId) VALUES (?, ?, ?, ?, 'checked_in', ?, ?, ?, ?, ?, ?)`, [
  KENNEL_ID, customers[0].id, allDogs[1].id, boardingService.id,
  daysAgo(2), daysFromNow(3), "225.00",
  new Date(Date.now() - 2*86400000), employees[0].id, roomsResult[1].id
]);

await sql(`INSERT INTO bookings (kennelId, customerId, dogId, serviceId, status, checkInDate, checkOutDate, totalPrice, checkedInAt, checkedInBy, roomId) VALUES (?, ?, ?, ?, 'checked_in', ?, ?, ?, ?, ?, ?)`, [
  KENNEL_ID, customers[2].id, allDogs[3].id, boardingService.id,
  daysAgo(1), daysFromNow(2), "135.00",
  new Date(Date.now() - 1*86400000), employees[1].id, roomsResult[5].id
]);

// Today's daycare (checked in)
await sql(`INSERT INTO bookings (kennelId, customerId, dogId, serviceId, status, checkInDate, checkOutDate, totalPrice, checkedInAt, checkedInBy, roomId) VALUES (?, ?, ?, ?, 'checked_in', ?, ?, ?, ?, ?, ?)`, [
  KENNEL_ID, customers[1].id, allDogs[2].id, daycareService.id,
  daysAgo(0), daysAgo(0), "35.00",
  new Date(), employees[0].id, roomsResult[3].id
]);

// Confirmed upcoming bookings
await sql(`INSERT INTO bookings (kennelId, customerId, dogId, serviceId, status, checkInDate, checkOutDate, totalPrice, roomId) VALUES (?, ?, ?, ?, 'confirmed', ?, ?, ?, ?)`, [
  KENNEL_ID, customers[3].id, allDogs[5].id, boardingService.id,
  daysFromNow(3), daysFromNow(7), "180.00", roomsResult[7].id
]);

await sql(`INSERT INTO bookings (kennelId, customerId, dogId, serviceId, status, checkInDate, checkOutDate, totalPrice) VALUES (?, ?, ?, ?, 'confirmed', ?, ?, ?)`, [
  KENNEL_ID, customers[4].id, allDogs[6].id, boardingService.id,
  daysFromNow(5), daysFromNow(10), "225.00"
]);

await sql(`INSERT INTO bookings (kennelId, customerId, dogId, serviceId, status, checkInDate, checkOutDate, totalPrice) VALUES (?, ?, ?, ?, 'confirmed', ?, ?, ?)`, [
  KENNEL_ID, customers[2].id, allDogs[4].id, groomingService.id,
  daysFromNow(2), daysFromNow(2), "65.00"
]);

// Pending bookings (awaiting approval)
await sql(`INSERT INTO bookings (kennelId, customerId, dogId, serviceId, status, checkInDate, checkOutDate, totalPrice) VALUES (?, ?, ?, ?, 'pending', ?, ?, ?)`, [
  KENNEL_ID, customers[4].id, allDogs[7].id, daycareService.id,
  daysFromNow(7), daysFromNow(7), "35.00"
]);

await sql(`INSERT INTO bookings (kennelId, customerId, dogId, serviceId, status, checkInDate, checkOutDate, totalPrice) VALUES (?, ?, ?, ?, 'pending', ?, ?, ?)`, [
  KENNEL_ID, customers[1].id, allDogs[2].id, bathService.id,
  daysFromNow(4), daysFromNow(4), "35.00"
]);

// Cancelled booking
await sql(`INSERT INTO bookings (kennelId, customerId, dogId, serviceId, status, checkInDate, checkOutDate, totalPrice) VALUES (?, ?, ?, ?, 'cancelled', ?, ?, ?)`, [
  KENNEL_ID, customers[3].id, allDogs[5].id, daycareService.id,
  daysAgo(3), daysAgo(3), "35.00"
]);

const bookingsResult = await sql("SELECT id, status FROM bookings WHERE kennelId = ?", [KENNEL_ID]);
console.log(`Created ${bookingsResult.length} bookings`);

// ===== CREATE ROOM ASSIGNMENT HISTORY =====
console.log("Creating room assignment history...");
const checkedInBookings = await sql("SELECT id, dogId, roomId FROM bookings WHERE status = 'checked_in' AND roomId IS NOT NULL");
for (const b of checkedInBookings) {
  await sql("INSERT INTO roomAssignmentHistory (roomId, bookingId, dogId, assignedBy) VALUES (?, ?, ?, ?)", [
    b.roomId, b.id, b.dogId, employees[0].id
  ]);
}

// ===== CREATE PAYMENTS =====
console.log("Creating payments...");

// Payments for completed bookings
const completedBookings = await sql("SELECT id, customerId, totalPrice FROM bookings WHERE status = 'completed'");
for (const b of completedBookings) {
  await sql("INSERT INTO payments (bookingId, customerId, kennelId, amount, type, status, paidAt) VALUES (?, ?, ?, ?, 'full', 'completed', ?)", [
    b.id, b.customerId, KENNEL_ID, b.totalPrice, new Date(Date.now() - Math.random() * 30*86400000)
  ]);
}

// Payments for checked-in bookings (deposits paid)
const activeBookings = await sql("SELECT id, customerId, totalPrice FROM bookings WHERE status = 'checked_in'");
for (const b of activeBookings) {
  const depositAmount = (parseFloat(b.totalPrice) * 0.5).toFixed(2);
  await sql("INSERT INTO payments (bookingId, customerId, kennelId, amount, type, status, paidAt) VALUES (?, ?, ?, ?, 'deposit', 'completed', ?)", [
    b.id, b.customerId, KENNEL_ID, depositAmount, new Date(Date.now() - 3*86400000)
  ]);
}

// One upcoming booking fully paid
const upcomingPaid = await sql("SELECT id, customerId, totalPrice FROM bookings WHERE status = 'confirmed' LIMIT 1");
if (upcomingPaid.length > 0) {
  await sql("INSERT INTO payments (bookingId, customerId, kennelId, amount, type, status, paidAt) VALUES (?, ?, ?, ?, 'full', 'completed', ?)", [
    upcomingPaid[0].id, upcomingPaid[0].customerId, KENNEL_ID, upcomingPaid[0].totalPrice, new Date()
  ]);
}

// One failed payment
const pendingBookings = await sql("SELECT id, customerId, totalPrice FROM bookings WHERE status = 'pending' LIMIT 1");
if (pendingBookings.length > 0) {
  await sql("INSERT INTO payments (bookingId, customerId, kennelId, amount, type, status) VALUES (?, ?, ?, ?, 'full', 'failed')", [
    pendingBookings[0].id, pendingBookings[0].customerId, KENNEL_ID, pendingBookings[0].totalPrice
  ]);
}

const paymentCount = await sql("SELECT COUNT(*) as cnt FROM payments");
console.log(`Created ${paymentCount[0].cnt} payments`);

// ===== CREATE ALERTS =====
console.log("Creating alerts...");

// Vaccination alerts
const buddyDog = allDogs.find(d => d.name === "Buddy");
const cocoDog = allDogs.find(d => d.name === "Coco");
const daisyDog = allDogs.find(d => d.name === "Daisy");
const rockyDog = allDogs.find(d => d.name === "Rocky");

await sql("INSERT INTO alerts (kennelId, targetUserId, type, title, message, severity, relatedDogId) VALUES (?, ?, ?, ?, ?, ?, ?)", [
  KENNEL_ID, OWNER_ID, "vaccination_expired", "Expired Vaccination - Buddy",
  "Buddy (Beagle) has an expired Rabies vaccination. Contact owner Rachel Thompson to update records before next visit.",
  "critical", buddyDog.id
]);

await sql("INSERT INTO alerts (kennelId, targetUserId, type, title, message, severity, relatedDogId) VALUES (?, ?, ?, ?, ?, ?, ?)", [
  KENNEL_ID, OWNER_ID, "vaccination_expired", "Missing Vaccinations - Buddy",
  "Buddy (Beagle) is missing Bordetella vaccination. Cannot accept for boarding until records are updated.",
  "critical", buddyDog.id
]);

await sql("INSERT INTO alerts (kennelId, targetUserId, type, title, message, severity, relatedDogId) VALUES (?, ?, ?, ?, ?, ?, ?)", [
  KENNEL_ID, OWNER_ID, "vaccination_expiring", "Vaccination Expiring Soon - Coco",
  "Coco (Cavalier King Charles) Rabies vaccination expires in 15 days. Remind owner Rachel Thompson.",
  "warning", cocoDog.id
]);

await sql("INSERT INTO alerts (kennelId, targetUserId, type, title, message, severity, relatedDogId) VALUES (?, ?, ?, ?, ?, ?, ?)", [
  KENNEL_ID, OWNER_ID, "vaccination_expiring", "Vaccination Expiring Soon - Daisy",
  "Daisy (Poodle Mix) Bordetella vaccination expires in 25 days. Remind owner Lisa Patel.",
  "warning", daisyDog.id
]);

await sql("INSERT INTO alerts (kennelId, targetUserId, type, title, message, severity, relatedDogId) VALUES (?, ?, ?, ?, ?, ?, ?)", [
  KENNEL_ID, OWNER_ID, "vaccination_expired", "Missing DHPP - Rocky",
  "Rocky (Boxer) is missing DHPP vaccination record. Contact owner David Kim.",
  "warning", rockyDog.id
]);

// Booking alerts
await sql("INSERT INTO alerts (kennelId, targetUserId, type, title, message, severity) VALUES (?, ?, ?, ?, ?, ?)", [
  KENNEL_ID, OWNER_ID, "general", "New Booking Request",
  "Buddy (Beagle) - Daycare requested for " + daysFromNow(7) + ". Pending your approval.",
  "info"
]);

await sql("INSERT INTO alerts (kennelId, targetUserId, type, title, message, severity) VALUES (?, ?, ?, ?, ?, ?)", [
  KENNEL_ID, OWNER_ID, "general", "New Booking Request",
  "Luna (German Shepherd) - Bath & Brush requested for " + daysFromNow(4) + ". Pending your approval.",
  "info"
]);

await sql("INSERT INTO alerts (kennelId, targetUserId, type, title, message, severity) VALUES (?, ?, ?, ?, ?, ?)", [
  KENNEL_ID, OWNER_ID, "capacity_warning", "Approaching Capacity",
  "The kennel is at 60% capacity this week. Consider limiting new bookings for peak days.",
  "warning"
]);

await sql("INSERT INTO alerts (kennelId, targetUserId, type, title, message, severity) VALUES (?, ?, ?, ?, ?, ?)", [
  KENNEL_ID, OWNER_ID, "check_in_reminder", "Check-In Reminder",
  "Rocky (Boxer) is confirmed for check-in on " + daysFromNow(3) + ". Room assignment needed.",
  "info"
]);

// Customer-facing alerts
await sql("INSERT INTO alerts (kennelId, targetUserId, type, title, message, severity, relatedDogId) VALUES (?, ?, ?, ?, ?, ?, ?)", [
  KENNEL_ID, customers[4].id, "vaccination_expired", "Action Required: Buddy's Vaccinations",
  "Buddy's Rabies vaccination has expired and Bordetella is missing. Please update vaccination records before the next booking.",
  "critical", buddyDog.id
]);

await sql("INSERT INTO alerts (kennelId, targetUserId, type, title, message, severity) VALUES (?, ?, ?, ?, ?, ?)", [
  KENNEL_ID, customers[4].id, "payment_due", "Payment Due",
  "A payment of $35.00 for Buddy's upcoming daycare visit failed. Please update your payment method.",
  "warning"
]);

const alertCount = await sql("SELECT COUNT(*) as cnt FROM alerts");
console.log(`Created ${alertCount[0].cnt} alerts`);

// ===== ADD KENNEL FAVORITES =====
console.log("Adding kennel favorites...");
for (const c of customers) {
  await sql("INSERT INTO kennelFavorites (userId, kennelId) VALUES (?, ?)", [c.id, KENNEL_ID]);
}

// ===== SUMMARY =====
console.log("\n========================================");
console.log("  SEED DATA COMPLETE!");
console.log("========================================");
console.log(`  Kennel: Happy Tails Boarding & Daycare`);
console.log(`  Services: ${servicesResult.length}`);
console.log(`  Rooms: ${roomsResult.length} (across 3 buildings)`);
console.log(`  Employees: ${employees.length}`);
console.log(`  Customers: ${customers.length}`);
console.log(`  Dogs: ${allDogs.length}`);
console.log(`  Vaccinations: ${vaxCount[0].cnt}`);
console.log(`  Bookings: ${bookingsResult.length}`);
console.log(`  Payments: ${paymentCount[0].cnt}`);
console.log(`  Alerts: ${alertCount[0].cnt}`);
console.log("========================================");
console.log("\nDog status highlights:");
console.log("  - Buddy (Beagle): EXPIRED rabies, MISSING bordetella & DHPP");
console.log("  - Coco (Cavalier): Rabies EXPIRING SOON (15 days)");
console.log("  - Daisy (Poodle Mix): Bordetella EXPIRING SOON (25 days)");
console.log("  - Rocky (Boxer): MISSING DHPP vaccination");
console.log("  - All others: Fully up to date");
console.log("\nBooking status breakdown:");
const statusCounts = {};
bookingsResult.forEach(b => { statusCounts[b.status] = (statusCounts[b.status] || 0) + 1; });
Object.entries(statusCounts).forEach(([s, c]) => console.log(`  - ${s}: ${c}`));
console.log("========================================\n");

await connection.end();
console.log("Database connection closed. Done!");
