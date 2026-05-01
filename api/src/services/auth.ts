import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { db } from "../db/client";

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function generateJwt(payload: { userId: string }): string {
  return jwt.sign(payload, config.JWT_SECRET, { expiresIn: "30d" });
}

export function verifyJwt(token: string): { userId: string } {
  return jwt.verify(token, config.JWT_SECRET) as { userId: string };
}

export async function createUserWithEmail(
  name: string,
  email: string,
  password: string
): Promise<{ id: string; email: string; name: string }> {
  const hash = await hashPassword(password);
  const result = await db.query(
    `INSERT INTO users (name, email, password_hash, auth_methods)
     VALUES ($1, $2, $3, '["email"]')
     RETURNING id, email, name`,
    [name, email, hash]
  );
  return result.rows[0];
}

export async function findUserByEmail(email: string) {
  const result = await db.query(`SELECT * FROM users WHERE email = $1`, [email]);
  return result.rows[0] ?? null;
}

export async function createOrUpdateUserWithPhone(phone: string, name?: string) {
  const result = await db.query(
    `INSERT INTO users (phone, name, auth_methods)
     VALUES ($1, $2, '["phone"]')
     ON CONFLICT (phone) DO UPDATE SET updated_at = NOW()
     RETURNING id, phone, name`,
    [phone, name ?? "User"]
  );
  return result.rows[0];
}
