import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

async function main() {
  const connection = await mysql.createConnection(DATABASE_URL);

  console.log('Cleaning all data (keeping owner account)...\n');

  // Delete in correct order to respect foreign key-like dependencies
  // (leaf tables first, then parent tables)
  const tables = [
    'roomAssignmentHistory',
    'kennelFavorites',
    'payments',
    'alerts',
    'vaccinations',
    'bookings',
    'rooms',
    'dogs',
    'services',
    'kennels',
  ];

  for (const table of tables) {
    const [result] = await connection.execute(`DELETE FROM \`${table}\``);
    console.log(`  Cleared ${table}: ${result.affectedRows} rows deleted`);
  }

  // Remove all users except the owner (user ID 1 / the first user)
  const [ownerRow] = await connection.execute('SELECT id, name, role FROM users ORDER BY id ASC LIMIT 1');
  if (ownerRow.length > 0) {
    const ownerId = ownerRow[0].id;
    const [userResult] = await connection.execute('DELETE FROM users WHERE id != ?', [ownerId]);
    console.log(`  Cleared users: ${userResult.affectedRows} test users deleted (kept owner: ${ownerRow[0].name})`);
    
    // Reset owner's kennelId to null since we deleted all kennels
    await connection.execute('UPDATE users SET kennelId = NULL WHERE id = ?', [ownerId]);
    console.log(`  Reset owner kennelId to NULL`);
  }

  console.log('\n========================================');
  console.log('  DATABASE CLEANED SUCCESSFULLY');
  console.log('  Only owner account remains');
  console.log('========================================');

  await connection.end();
}

main().catch(err => { console.error(err); process.exit(1); });
