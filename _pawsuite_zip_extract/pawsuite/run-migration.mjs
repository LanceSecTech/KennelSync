import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const statements = [
  `CREATE TABLE IF NOT EXISTS \`checkoutAddOns\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`kennelId\` int NOT NULL,
    \`name\` varchar(100) NOT NULL,
    \`price\` decimal(10,2) NOT NULL,
    \`isActive\` boolean NOT NULL DEFAULT true,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    CONSTRAINT \`checkoutAddOns_id\` PRIMARY KEY(\`id\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`bookingAddOns\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`bookingId\` int NOT NULL,
    \`addOnId\` int NOT NULL,
    \`dogId\` int,
    \`price\` decimal(10,2) NOT NULL,
    \`completed\` boolean NOT NULL DEFAULT false,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    CONSTRAINT \`bookingAddOns_id\` PRIMARY KEY(\`id\`)
  )`,
];

for (const stmt of statements) {
  try {
    await conn.execute(stmt);
    console.log('OK:', stmt.substring(0, 80) + '...');
  } catch (e) {
    if (e.code === 'ER_TABLE_EXISTS_ERROR') {
      console.log('SKIP (already exists):', stmt.substring(0, 80) + '...');
    } else {
      console.error('ERROR:', e.message);
    }
  }
}

await conn.end();
console.log('Migration complete!');
