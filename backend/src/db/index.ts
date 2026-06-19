// src/db/index.ts — Cliente Drizzle sobre postgres-js
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "../config/env.js";
import * as schema from "./schema.js";

// Una sola conexion compartida por proceso (API y worker crean la suya).
export const queryClient = postgres(env.DATABASE_URL, { max: 10 });

export const db = drizzle(queryClient, { schema });

export type DB = typeof db;
export { schema };
