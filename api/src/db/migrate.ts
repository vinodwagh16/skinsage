import fs from "fs";
import path from "path";
import { db } from "./client";

export async function runMigrations() {
  const dir = path.join(__dirname, "migrations");
  const files = fs.readdirSync(dir).sort();
  for (const file of files) {
    if (!file.endsWith(".sql")) continue;
    const sql = fs.readFileSync(path.join(dir, file), "utf8");
    await db.query(sql);
    console.log(`Migration applied: ${file}`);
  }
}
