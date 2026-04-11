/**
 * URL-encode each path segment so filenames with spaces work in production.
 * All paths are under `client/public/`.
 */
export function marketingPublicImage(relativePath: string): string {
  const trimmed = relativePath.replace(/^\/+/, "");
  return "/" + trimmed.split("/").map((seg) => encodeURIComponent(seg)).join("/");
}

/** Central list — swap files here to change marketing screenshots site-wide. */
export const marketingImages = {
  landing: {
    dashboard: marketingPublicImage("images/landing/Dashboard.png"),
    availWeek: marketingPublicImage("images/landing/Avail Cal Week.png"),
    bookTab: marketingPublicImage("images/landing/Book Tab.png"),
    bookingsMonth: marketingPublicImage("images/landing/Bookings month View.png"),
    financials: marketingPublicImage("images/landing/Financials .png"),
  },
  owners: {
    dashboard: marketingPublicImage("images/owners/Dashboard.png"),
    availWeek: marketingPublicImage("images/owners/Avail Cal Week.png"),
    bookingsMonth: marketingPublicImage("images/owners/Bookings month View.png"),
    financials: marketingPublicImage("images/owners/Financials .png"),
    reports: marketingPublicImage("images/owners/Reports tab.png"),
  },
  employees: {
    today: marketingPublicImage("images/employees/Today Tab.png"),
    dogs: marketingPublicImage("images/employees/Dogs Tab.png"),
    checkIn: marketingPublicImage("images/employees/Check in Tab.png"),
    checkOut: marketingPublicImage("images/employees/Check out Tab.png"),
    dashboard: marketingPublicImage("images/employees/employee dashboard.png"),
  },
  customers: {
    book: marketingPublicImage("images/customers/Book Tab.png"),
    dogProfile: marketingPublicImage("images/customers/Dog Profile Tab.png"),
    myStays: marketingPublicImage("images/customers/My Stays Tab.png"),
    myDogs: marketingPublicImage("images/customers/My dogs Tab.png"),
    dashboard: marketingPublicImage("images/customers/Dashboard.png"),
  },
  customersMobile: {
    newBooking: marketingPublicImage("images/mobile/customer/New Booking Tab.png"),
  },
} as const;
