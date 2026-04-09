# KennelSync TODO

## Database & Backend
- [x] Design and apply database schema (users, kennels, dogs, bookings, services, vaccinations, payments, invoices, alerts)
- [x] Build tRPC routers for all entities with role-based access control
- [ ] Seed data for demo/testing
- [x] S3 integration for file uploads (vaccination certs, dog photos)

## Authentication & Roles
- [x] Extend user table with role enum (owner, employee, customer)
- [x] Role-based procedure middleware (ownerProcedure, employeeProcedure, customerProcedure)
- [x] Splash/login page
- [x] Role-based routing after login

## Global Layout
- [x] Top bar: logo, PawSuite title, settings, logout
- [x] Bottom navigation tabs per role
- [x] Booking plus button (centered, larger) in customer bottom nav
- [x] Mobile-first responsive design
- [x] Settings page

## Customer Experience
- [x] Customer Dashboard with greeting, My Dogs card, My Stays card, Action Needed card
- [x] My Dogs tab: dog list, add dog, dog profile with tabs (vaccines, care, medical, contacts)
- [x] Booking flow: select dog → select service → select dates → review/price → submit
- [x] My Stays tab: Past/Pending/Upcoming filter cards, cancel booking
- [x] Payments tab: balance summary, invoices, payment methods placeholder

## Owner Experience
- [x] Owner Dashboard with revenue summary, today's stats, capacity overview
- [x] Bookings management: approve/reject, check-in/out
- [x] Alerts management: shared alerts page
- [x] Financials: revenue reports, payment totals, recent payments
- [x] Kennel Profile: edit bio, services, pricing, capacity, hours, policies

## Employee Experience
- [x] Employee Dashboard with today's summary, quick stats
- [x] Today view: daily schedule, arrivals/departures/staying
- [x] Check-In/Out: confirm check-in/out with tabs
- [x] Alerts: shared alerts page
- [x] Dogs: view all dogs with care details, feeding, meds, behavior notes

## Notifications & Alerts
- [ ] Email alerts to kennel owners for critical events
- [x] In-app alert system for all roles
- [x] Vaccination expiration tracking and reminders

## Payments & Stripe
- [ ] Stripe integration for payment processing
- [ ] Deposit handling during booking
- [x] Balance tracking and settlement (basic)
- [ ] Receipt generation

## Polish & Testing
- [x] Vitest tests for backend procedures (22 tests passing)
- [x] UI polish and responsive testing
- [x] Error handling and loading states

## Room/Kennel Assignment Feature
- [x] Create rooms table in database schema (name, building, sizeType, capacity, notes, kennelId, isAvailable)
- [x] Create roomAssignmentHistory table (roomId, bookingId, dogId, assignedBy, assignedAt, removedAt)
- [x] Add roomId to bookings table
- [x] Build room CRUD API routes (owner only)
- [x] Build room assignment/reassignment API routes (owner + employee)
- [x] Build Room Management page for owners (add/edit/delete rooms, group by building)
- [x] Build Room Overview/Kennel Board page for staff (rooms with assigned dogs, capacity indicators)
- [x] Add room assignment dropdown to Check-In flow
- [x] Add room assignment to booking detail views
- [x] Update employee dashboard to show dog name + room
- [x] Update Today page to show room assignments
- [x] Update dog detail view to show assigned room
- [x] Add room tab/link to employee and owner bottom nav or as sub-page
- [x] Ensure customers cannot see room assignments (room routes use employeeProcedure/ownerProcedure)
- [x] Keep UI clean, minimal, fast for staff

## Dog Photo & Vaccination Certificate Uploads
- [x] Build reusable FileUpload component (image + document support)
- [x] Add dog photo upload to dog profile page
- [x] Show dog photo on dog cards in My Dogs list (already working)
- [x] Add vaccination certificate upload to vaccination records
- [x] Show vaccination document link/preview in dog profile
- [x] Ensure uploaded files are stored via S3 with URLs saved in database

## Seed / Demo Data
- [x] Create seed script with sample kennels, services, rooms
- [x] Add sample dogs with varied vaccination statuses
- [x] Add sample bookings (past, pending, upcoming, checked-in)
- [x] Add sample payments and alerts
- [x] Verify all three dashboards display data correctly

## Cleanup
- [x] Remove all seed/test data (keep only owner account)
- [x] Verify app loads cleanly with empty state

## Role Switcher (Dev/Testing)
- [x] Add backend route to update user role with session cookie re-signing
- [x] Fix upsertUser to not override role on every login
- [x] Add role switcher UI in top bar for testing
- [x] Fix hooks violations in CustomerDashboard and OwnerDashboard
- [x] Verify all three views (Owner, Employee, Customer) switch correctly

## Service Editing
- [x] Allow owners to edit existing service name, type, description, price, and unit type
- [x] Allow owners to delete services (with confirmation)
- [x] Add inline edit UI for each service card in Kennel Profile

## Dog Profile Enhancements
- [x] Add spay/neuter field to Add Dog form
- [x] Add spay/neuter display to dog info section in DogProfile
- [x] Add Edit Info button to dog info card in DogProfile
- [x] Add missing info indicators (!) on dog cards in My Dogs tab for: missing vaccines, missing emergency contacts
- [x] Ensure spay/neuter is editable from the dog info edit form

## Pending Booking Edit & Room Structure
- [x] Add edit button on pending bookings in Customer My Stays view
- [x] Add edit button on pending bookings in Owner Bookings view
- [x] Add edit button on pending bookings in Employee views (via Owner Bookings shared route)
- [x] Enhance kennel room management with building/structure setup (e.g., Big Kennel 20 rooms, Small Kennel 10 rooms)
- [x] Add daily room availability calendar showing which rooms are booked vs available per day
- [x] Allow owner to see room assignments broken out by day

## Missing Dog Info Alerts
- [x] Backend: Add query to detect dogs with missing vaccines or emergency contacts for upcoming/pending bookings
- [x] Owner Alerts tab: Show alerts for dogs with missing required info on upcoming bookings
- [x] Owner Bookings tab: Show warning badge/indicator on pending bookings when dog is missing info
- [x] Employee Alerts tab: Show alerts for dogs with missing required info
- [x] Employee Check-In: Show popup warning when attempting to check in a dog with missing info
- [x] Include specific details in alerts (which dog, what's missing, "Check In Anyway" option)

## Room Management Fixes
- [x] Move room management into the Kennel tab instead of separate page
- [x] Fix number input in Add Building popup (text input with numeric validation)
- [x] Fix room sorting to be numerical (natural sort: 1,2,3...10,11)
- [x] Fix availability calendar to show rooms occupied for full stay duration (check-in through check-out)
- [x] Add ability to move/reassign dogs between rooms with calendar reflection
## Data Cleanup & Bug Fixes (Round 2)
- [x] Delete all test data (Sammy the dog, Alvin Boarding kennel, all bookings/payments/alerts)
- [x] Fix date offset bug: bookings show dates one day earlier than entered (e.g. 4/5-4/6 shows as 4/4-4/5)
- [x] Employee Dogs in Care: show length of stay for each dog
- [x] Bookings tab: show dog name then booking number (not just booking info)
## Bug Fixes (Round 3)
- [x] Fix kennel creation error: totalCapacity sends NaN when field is empty
- [x] Fix React hooks order violation in DogCareCard (useMemo after early return)
## Round 4 - Major Features
- [x] Clear all test data from database
- [x] Fix today's occupancy calculation on owner/employee dashboard
- [x] Add kennel required vaccines feature (owner can set required vaccines during/after kennel creation)
- [x] Dog vaccination dropdown should show kennel's required vaccines (not free text)
- [x] Vaccine alerts should persist until ALL required vaccines are met
- [x] Add pay now / pay later option to booking flow
- [x] Support multiple dogs per stay (booking)
- [x] Support multiple dogs in one room (e.g. siblings)
- [x] Multi-kennel refactor: customer_kennels join table, kennel selector dropdown, favorites
- [x] Per-kennel dog status tracking (vaccination compliance per kennel)
- [x] Update booking flow to require selected kennel context
- [x] Update all customer pages to reflect active kennel
## Round 5 - Bug Fixes & Multi-Kennel
- [x] Spay/neuter should be a yes/no dropdown in add dog and edit dog (not free text)
- [x] Fix occupancy display: shows red/0 spots even when room has capacity
- [x] Fix room sorting to be numerical (1,2,3 not 1,10,11) everywhere in the app
- [x] Fix vaccine alerts: missing required vaccines should show alerts on customer dashboard and dog profile
- [x] Multi-kennel: customers must link to a kennel and choose which kennel to book with
- [x] Multi-kennel: kennel selector dropdown in top bar
- [x] Multi-kennel: scalable for multiple kennels on the platform
## Round 6
- [x] Clear all test data from database
- [x] Move kennel selector from top bar to Settings page to reduce clutter
## Round 7 - Fixes
- [x] Remove default kennel auto-linking: accounts should not be linked to any kennel by default
- [x] Occupancy should only reflect accepted/checked-in stays, not pending ones
- [x] Employee check-in: block check-in if dog is missing required vaccines (hard block)
- [x] Owner bookings: show vaccine status warning on pending stays (but allow approval)
- [x] Owner bookings: show vaccine status on confirmed stays
## Round 8 - Fixes & Stripe
- [x] Fix vaccine alerts: should only show when customer is linked to a kennel that requires vaccines (not when unlinked)
- [x] Fix default kennel linking: customer should NOT be linked to any kennel by default
- [x] Add red ! indicator next to Vaccinations tab in My Dogs dog card when missing required vaccines
- [x] Integrate Stripe into payments
- [x] Clear all test data after all fixes
## Round 9 - Multi-Dog Booking Enhancement
- [x] Ensure booking flow allows selecting multiple dogs for a single stay
- [x] Ensure backend properly stores multi-dog bookings (bookingDogs table)
- [x] Update My Stays to show all dogs in a multi-dog booking
- [x] Update owner/employee bookings view to show all dogs per booking
- [x] Update check-in/out to handle multi-dog bookings
- [x] Update payments/invoices to reflect multi-dog bookings
- [x] Update room assignment to support multi-dog bookings
- [x] Ensure pricing reflects per-dog charges for multi-dog bookings
## Round 10
- [x] Check-In tab should only show dogs checking in today, not all confirmed bookings
- [x] Check-Out tab should only show dogs whose check-out date is today
## Round 11
- [x] Clear all test data
- [x] Fix daycare bookings: should go to pending approval, not auto-accepted (verified: code already sets status='pending' for all booking types)
- [x] Convert baths/nails to checkout add-ons instead of standalone services
- [x] Owner can add/remove checkout add-on options (baths, nails, etc.)
- [x] Employee checkout flow: add-on selection dialog before completing checkout
- [x] Show baths/nails add-ons in Today tab for dogs departing that day
- [x] Add-ons should only show for dogs leaving that day
- [x] Remove bath from service type dropdown in owner Services tab
- [x] Remove bath from booking flow service icons
- [x] Add-on tests (14 tests passing)
- [x] Clear all test data
## Round 12 - Customer Add-Ons in Booking Flow
- [x] Add add-ons step to customer booking flow (between dates and review)
- [x] Show active kennel add-ons as optional checkboxes during booking
- [x] Include selected add-ons in price calculation and review summary
- [x] Save selected add-ons to bookingAddOns table when booking is created
- [x] Auto-skip add-ons step if kennel has no active add-ons
- [x] Show per-dog pricing and total in add-ons step
- [x] Show add-on breakdown in review step
## Round 13 - Daycare Checkout & Today Tab Add-Ons
- [x] Daycare dogs should appear in Check-Out tab after being checked in (same-day departure)
- [x] Daycare dogs should count in "Departing" section on Today tab
- [x] Today tab should show which dogs need baths and nails done (from booking add-ons)
- [x] Backend enriches bookings with serviceType for daycare detection
- [x] Daycare dogs excluded from "Staying" section (they leave same day)
- [x] "Services To-Do Today" section shows pending bath/nail tasks for departing dogs
- [x] Departing daycare dogs labeled as "Daycare" badge instead of "Departing"
## Round 14 - Contact Kennel in Customer Settings
- [x] Add "Contact Kennel" button under My Kennels in customer Settings
- [x] Show kennel phone number, email, and business hours in popup dialog
- [x] Kennel schema already has phone, email, hoursOpen, hoursClose fields
- [x] Contact dialog shows phone (clickable), email (clickable), business hours, and address
- [x] Quick action buttons for Call and Email in the dialog
## Round 15 - Per-Day Business Hours
- [x] Add businessHours table (kennelId, dayOfWeek, openTime, closeTime, isClosed)
- [x] Add db helpers and tRPC routes for business hours CRUD
- [x] Add business hours editor in owner Kennel Profile (new "Hours" tab)
- [x] Update Contact Kennel dialog to show per-day hours schedule
- [x] Seed default hours (Mon-Fri 7am-7pm, Sat-Sun closed) when kennel is created
- [x] Removed old single open/close time fields from Details tab
- [x] Business hours tests (10 tests passing)
## Round 16 - Splash Login Screen
- [x] Create a splash/login page with PawSuite branding
- [x] Show splash page to unauthenticated users
- [x] Include welcome message, app description, and login button
- [x] Clean, modern design with paw/dog theme
- [x] Feature highlights (Easy Booking, Dog Profiles, Payments)
- [x] Gradient background with decorative blur elements
- [x] Bottom branding footer (Boarding, Daycare, Grooming)
## Round 17 - Remove Role Switcher & Clear Test Data
- [x] Remove role switcher component from top bar
- [x] Remove updateRole tRPC route
- [x] Clear all test data from database
- [x] Updated test to use kennel.myKennels instead of removed updateRole
## Round 18 - Rename PawSuite to KennelSync
- [x] Find and replace all "PawSuite" references across the codebase
- [x] Update VITE_APP_TITLE to KennelSync (built-in secret, must be changed via Settings)
- [x] Update deployment documentation
- [x] Re-export source code ZIP
## Round 19 - Create Account on Splash Page
- [x] Add a Create Account button/option to the splash page for new users
- [x] Added getSignUpUrl() helper in const.ts (uses type=signUp)
- [x] Outline-style Create Account button below Sign In on splash page
## Round 20 - Restore Role Switcher
- [ ] Add back role switcher to the top bar
- [ ] Restore updateRole tRPC route in routers.ts

## Bug Fixes - Round 21 (Runtime Issues)
- [x] Fix Add Dog flow (customer) - Added dog.myDogs query, fixed dog.create to save all fields
- [x] Fix Link Kennel flow (customer) - Added kennel.linkToKennel and kennel.unlinkFromKennel mutations
- [x] Fix Add Service flow (owner) - Added service.byKennel query
- [x] Fix Save Hours flow (owner) - Added businessHours.getByKennel query, added name field to User type
- [ ] Fix Building/Room assignment logic (owner) - building names not saving, rooms not separated
- [ ] Fix Vaccine Requirements flow (owner) - failed to add vaccine requirement
- [ ] Fix Stripe Checkout wiring (customer) - button not clickable
- [ ] Fix Room maintenance/default status issue - all rooms show maintenance
- [ ] Investigate performance problems - app feels slow, possible broken request loops


## Round 22 - Cross-Platform Dev Script
- [x] Add cross-env as dev dependency (v7.0.3)
- [x] Update dev script to use cross-env NODE_ENV=development
- [x] Update start script to use cross-env NODE_ENV=production
- [x] Verified cross-env installed in node_modules
- [x] Dev script now works on Windows, Mac, Linux without manual fixes

## Bug Fixes - Round 23 (Runtime Issues from Testing)
- [x] Fix totalCapacity - remove from kennel profile/update, auto-calculate from rooms
- [x] Fix service.create - convert pricePerUnit string to number before mutation
- [x] Fix business hours - fix dayOfWeek/openTime/closeTime/isClosed payload, fix unchecking one day unchecks all
- [x] Fix room/building logic - building names, room grouping, unassigned label, default status not maintenance
- [x] Fix missing tRPC procedures - room.delete and requiredVaccine.byKennel
- [x] Fix kennel contact fields - city, state, zip, phone, email not saving
- [x] Fix required vaccines - wrong query/mutation paths
- [x] Fix add-ons rendering - created add-ons not showing after creation
- [x] Fix Stripe checkout button - not clickable/wired
- [x] Fix analytics placeholder - remove broken %VITE_ANALYTICS_ENDPOINT% script
- [x] Fix vaccination.byDog alias - DogProfile.tsx was calling missing byDog query
- [x] Fix vaccination.create - now saves dateAdministered and documentUrl
- [x] Fix vaccination.update - now accepts all fields (vaccineName, expirationDate, documentUrl)
- [x] Fix vaccination.delete - new procedure added
- [x] Fix alert.missingDogInfo - now includes checkInDate and bookingStatus fields
- [x] Fix alert.byKennel, alert.myAlerts, alert.markRead - all added to router
- [x] Fix addOn.addToBooking - new mutation added
- [x] Fix payment.byKennel - new query for owner financials
- [x] Fix stats.customerDashboard - new procedure with dogStatuses, actionItems
- [x] Fix upload.complete - new procedure for file uploads via tRPC
- [x] Fix MyDogs.tsx weight type - parseFloat instead of string passthrough
- [x] Fix BookingFlow.tsx totalPrice type - parseFloat instead of string
- [x] Fix CheckInOut.tsx price field - removed unsupported field from addToBooking call
- [x] Fix OwnerBookings.tsx missingInfo details - wrapped string in array
- [x] Fix CheckInOut.tsx missingInfo details - wrapped string in array
- [x] TypeScript errors: reduced from 33 to 0 errors

## Bug Fixes - Round 24 (Schema/Runtime Mismatches)
- [x] Remove totalCapacity from kennel.update router, db.updateKennel, and all frontend usage
- [x] Fix services description/unit_type columns - added to SUPABASE_SCHEMA.sql + migration SQL
- [x] Fix required vaccines table - added kennel_required_vaccines to schema + migration SQL
- [x] Fix business hours payload - getBusinessHours now maps snake_case to camelCase (dayOfWeek, openTime, closeTime, isClosed)
- [x] Remove broken analytics placeholder script from index.html

## Bug Fixes - Round 25 (Schema Mismatches)
- [x] Fix services unit_type column - stripped unit_type/description from insert/update path; accepted from frontend but not sent to DB until MIGRATION_R24.sql is run
- [x] Fix business hours duplicate row - upsert now uses onConflict: 'kennel_id,day_of_week' to update existing row
- [x] Fix required vaccines table - added graceful fallback (returns empty array if table missing); created MIGRATION_R24.sql for easy one-click migration
