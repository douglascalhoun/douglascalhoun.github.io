import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

let ensured = false;

export async function ensurePresenterSchema(db) {
  if (ensured) return;
  const here = dirname(fileURLToPath(import.meta.url));
  const sqlPath = join(here, '../../../../db/migrate-presenter.sql');
  const sql = await readFile(sqlPath, 'utf8');
  await db.query(sql);
  ensured = true;
}
