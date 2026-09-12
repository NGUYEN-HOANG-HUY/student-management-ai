import { createDatabase } from './connection.js'
import { seedDatabase } from './seed.js'

const database = await createDatabase()
await seedDatabase(database)
await database.close()
console.log('SQLite database initialized and seeded')
