import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

async function main() {
  const connection = await mysql.createConnection(DATABASE_URL);
  
  // Check the column type for checkInDate
  const [cols] = await connection.execute("DESCRIBE bookings");
  console.log("Bookings columns:");
  for (const col of cols) {
    if (col.Field === 'checkInDate' || col.Field === 'checkOutDate') {
      console.log(`  ${col.Field}: type=${col.Type}, null=${col.Null}`);
    }
  }
  
  // Check if there are any bookings to look at
  const [rows] = await connection.execute("SELECT id, checkInDate, checkOutDate FROM bookings LIMIT 5");
  console.log("\nExisting bookings:", rows);
  
  // The key issue: when you store "2026-04-05" as a DATE in MySQL,
  // and then read it back with a JS driver, it may come back as a Date object
  // which gets timezone-shifted. Let's test:
  console.log("\n--- Timezone test ---");
  console.log("Server timezone offset:", new Date().getTimezoneOffset(), "minutes");
  console.log("TZ env:", process.env.TZ);
  
  // Insert a test booking and read it back
  // Actually let's just test date parsing
  const testDate = "2026-04-05";
  const parsed = new Date(testDate);
  console.log(`\nParsing "${testDate}":`);
  console.log("  new Date('2026-04-05'):", parsed.toString());
  console.log("  .toISOString():", parsed.toISOString());
  console.log("  .toLocaleDateString():", parsed.toLocaleDateString());
  console.log("  .toISOString().split('T')[0]:", parsed.toISOString().split("T")[0]);
  
  // The fix: parse with T00:00:00 to avoid timezone shift
  const parsedLocal = new Date(testDate + "T00:00:00");
  console.log(`\nParsing "${testDate}T00:00:00":`);
  console.log("  new Date('2026-04-05T00:00:00'):", parsedLocal.toString());
  console.log("  .toISOString():", parsedLocal.toISOString());
  console.log("  .toLocaleDateString():", parsedLocal.toLocaleDateString());
  console.log("  .toISOString().split('T')[0]:", parsedLocal.toISOString().split("T")[0]);
  
  // What about when MySQL returns a Date object?
  const [tzResult] = await connection.execute("SELECT @@session.time_zone, @@global.time_zone");
  console.log("\nMySQL timezone:", tzResult);
  
  await connection.end();
}

main().catch(err => { console.error(err); process.exit(1); });
