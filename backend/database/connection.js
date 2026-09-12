import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sqlite3 from 'sqlite3'
import { open } from 'sqlite'

const currentDirectory = path.dirname(fileURLToPath(import.meta.url))
const defaultDatabasePath = path.resolve(currentDirectory, '../../database/database.sqlite')
const schemaPath = path.join(currentDirectory, 'schema.sql')

async function runMigrations(database) {
  const classColumns = await database.all('PRAGMA table_info(classes)')
  if (classColumns.some((column) => column.name === 'department') && !classColumns.some((column) => column.name === 'department_id')) {
    await database.exec('PRAGMA foreign_keys = OFF')
    await database.exec('CREATE TABLE IF NOT EXISTS departments (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT NOT NULL UNIQUE, name TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)')
    await database.run(`INSERT OR IGNORE INTO departments (code, name) SELECT 'LEGACY-' || lower(replace(department, ' ', '-')), department FROM classes`)
    await database.exec(`CREATE TABLE classes_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      department_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (department_id) REFERENCES departments(id) ON UPDATE CASCADE ON DELETE RESTRICT
    )`)
    await database.exec(`INSERT INTO classes_new (id, code, name, department_id)
      SELECT classes.id, classes.code, classes.name, departments.id
      FROM classes JOIN departments ON departments.name = classes.department`)
    await database.exec('DROP TABLE classes')
    await database.exec('ALTER TABLE classes_new RENAME TO classes')
    await database.exec('PRAGMA foreign_keys = ON')
  }
  const userColumns = await database.all('PRAGMA table_info(users)')
  if (!userColumns.some((column) => column.name === 'student_id')) {
    await database.exec('ALTER TABLE users ADD COLUMN student_id INTEGER REFERENCES students(id) ON DELETE CASCADE')
    await database.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_student_id ON users(student_id) WHERE student_id IS NOT NULL')
  }

  const refreshedUserColumns = await database.all('PRAGMA table_info(users)')
  if (!refreshedUserColumns.some((column) => column.name === 'teacher_id')) {
    await database.exec('DROP TABLE IF EXISTS class_teachers')
    await database.exec('DROP TABLE IF EXISTS teachers')
    await database.exec('PRAGMA foreign_keys = OFF')
    await database.exec('ALTER TABLE users RENAME TO users_legacy')
    await database.exec(`CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'teacher', 'student')),
      student_id INTEGER UNIQUE,
      teacher_id INTEGER UNIQUE,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
    )`)
    await database.exec(`INSERT INTO users
      (id, username, password_hash, role, student_id, created_at, updated_at)
      SELECT id, username, password_hash, role, student_id, created_at, updated_at
      FROM users_legacy`)
    await database.exec('DROP TABLE users_legacy')
    await database.exec('PRAGMA foreign_keys = ON')
  }

  const teacherForeignKeys = await database.all('PRAGMA foreign_key_list(teachers)')
  if (teacherForeignKeys.some((foreignKey) => foreignKey.table === 'users_legacy')) {
    await database.exec('DROP TABLE IF EXISTS class_teachers')
    await database.exec('DROP TABLE IF EXISTS teachers')
  }

  await database.exec(`CREATE TABLE IF NOT EXISTS teachers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    teacher_code TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    department_id INTEGER NOT NULL,
    user_id INTEGER UNIQUE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE RESTRICT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  )`)
  await database.exec(`CREATE TABLE IF NOT EXISTS class_teachers (
    class_id INTEGER NOT NULL,
    teacher_id INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (class_id, teacher_id),
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE
  )`)
  await database.exec('CREATE INDEX IF NOT EXISTS idx_teachers_department_id ON teachers(department_id)')
  await database.exec('CREATE INDEX IF NOT EXISTS idx_class_teachers_teacher_id ON class_teachers(teacher_id)')
}

export async function createDatabase() {
  const databasePath = process.env.DATABASE_PATH
    ? path.resolve(process.cwd(), process.env.DATABASE_PATH)
    : defaultDatabasePath

  await fs.mkdir(path.dirname(databasePath), { recursive: true })

  const database = await open({
    filename: databasePath,
    driver: sqlite3.Database,
  })

  await database.exec('PRAGMA foreign_keys = ON;')
  await database.exec(await fs.readFile(schemaPath, 'utf8'))
  await runMigrations(database)

  return database
}
