import Database from "better-sqlite3"
import { drizzle } from "drizzle-orm/better-sqlite3"
import * as schema from "./schema"
import path from "path"
import fs from "fs"

const dbDir = path.join(process.cwd(), "data")
const dbPath = path.join(dbDir, "sqlite.db")

// データディレクトリが存在しない場合は作成
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true })
}

const sqlite = new Database(dbPath)
export const db = drizzle(sqlite, { schema })

export type DB = typeof db
