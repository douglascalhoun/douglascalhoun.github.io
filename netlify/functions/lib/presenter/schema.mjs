import { PRESENTER_MIGRATION_SQL } from './migrationSql.mjs';

let ensured = false;

export async function ensurePresenterSchema(db) {
  if (ensured) return;
  await db.query(PRESENTER_MIGRATION_SQL);
  ensured = true;
}
