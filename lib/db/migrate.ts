import Database from "better-sqlite3"
import { drizzle } from "drizzle-orm/better-sqlite3"
import { migrate } from "drizzle-orm/better-sqlite3/migrator"
import path from "path"
import fs from "fs"

const dbDir = path.join(process.cwd(), "data")
const dbPath = path.join(dbDir, "sqlite.db")

// データディレクトリが存在しない場合は作成
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true })
}

const sqlite = new Database(dbPath)
const db = drizzle(sqlite)

async function main() {
  console.log("Running migrations...")
  await migrate(db, { migrationsFolder: "./lib/db/migrations" })
  console.log("Migrations completed!")
  sqlite.close()
}

main().catch((err) => {
  console.error("Migration failed!", err)
  process.exit(1)
})
