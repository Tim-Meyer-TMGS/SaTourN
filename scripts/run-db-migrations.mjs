import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const databaseUrl = String(process.env.DATABASE_URL || '').trim();
if (!databaseUrl) throw new Error('DATABASE_URL is required.');

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const migrationsDirectory = path.resolve(scriptDirectory, '../db/migrations');
const migrationFiles = (await readdir(migrationsDirectory))
  .filter((fileName) => fileName.endsWith('.sql'))
  .sort((left, right) => left.localeCompare(right));

const sql = neon(databaseUrl);

function splitSqlStatements(source) {
  const statements = [];
  let current = '';
  let quote = '';
  let inLineComment = false;
  let inBlockComment = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const nextCharacter = source[index + 1] || '';

    if (inLineComment) {
      current += character;
      if (character === '\n') inLineComment = false;
      continue;
    }

    if (inBlockComment) {
      current += character;
      if (character === '*' && nextCharacter === '/') {
        current += nextCharacter;
        index += 1;
        inBlockComment = false;
      }
      continue;
    }

    if (!quote && character === '-' && nextCharacter === '-') {
      current += character + nextCharacter;
      index += 1;
      inLineComment = true;
      continue;
    }

    if (!quote && character === '/' && nextCharacter === '*') {
      current += character + nextCharacter;
      index += 1;
      inBlockComment = true;
      continue;
    }

    if (quote) {
      current += character;
      if (character === quote) {
        if (nextCharacter === quote) {
          current += nextCharacter;
          index += 1;
        } else {
          quote = '';
        }
      }
      continue;
    }

    if (character === "'" || character === '"') {
      quote = character;
      current += character;
      continue;
    }

    if (character === ';') {
      if (current.trim()) statements.push(current.trim());
      current = '';
      continue;
    }

    current += character;
  }

  if (quote || inBlockComment) throw new Error('Migration contains an unterminated SQL block.');
  if (current.trim()) statements.push(current.trim());
  return statements;
}

for (const fileName of migrationFiles) {
  const migration = await readFile(path.join(migrationsDirectory, fileName), 'utf8');
  const statements = splitSqlStatements(migration);
  for (const statement of statements) {
    await sql.query(statement);
  }
  console.log(`Applied ${fileName} (${statements.length} statements)`);
}
