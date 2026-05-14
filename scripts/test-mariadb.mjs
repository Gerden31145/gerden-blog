// scripts/test-mariadb.mjs
import 'dotenv/config'
import mariadb from 'mariadb'

const pool = mariadb.createPool({
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT ?? 3306),
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  connectionLimit: 5,
  connectTimeout: 5000,
  acquireTimeout: 10000,
  allowPublicKeyRetrieval: true,
})

let conn

try {
  console.log('trying to connect...', {
    host: process.env.DATABASE_HOST,
    port: process.env.DATABASE_PORT ?? 3306,
    user: process.env.DATABASE_USER,
    database: process.env.DATABASE_NAME,
    hasPassword: Boolean(process.env.DATABASE_PASSWORD),
  })

  conn = await pool.getConnection()
  console.log('driver connected')

  const rows = await conn.query('SELECT 1 AS ok')
  console.log(rows)
} catch (err) {
  console.error('direct mariadb driver error:')
  console.error(err)
} finally {
  if (conn) conn.release()
  await pool.end()
}