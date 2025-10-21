import { createClient } from "@libsql/client"
import { drizzle } from "drizzle-orm/libsql"
import { migrate } from "drizzle-orm/libsql/migrator"

const client = createClient({
  url: process.env.DATABASE_URL!,
  authToken: process.env.DATABASE_AUTH_TOKEN,
})

const db = drizzle(client)

async function main() {
  console.log("Running migrations...")
  await migrate(db, { migrationsFolder: "./lib/db/migrations" })
  console.log("Migrations completed!")
  client.close()
}

main().catch((err) => {
  console.error("Migration failed!", err)
  process.exit(1)
})
