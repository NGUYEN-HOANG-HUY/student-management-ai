import app from './app.js'
import { createDatabase } from './database/connection.js'
import { seedDatabase } from './database/seed.js'

if (process.env.NODE_ENV === 'production'
  && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)) {
  throw new Error('JWT_SECRET must contain at least 32 characters in production')
}

const port = Number(process.env.PORT) || 5000

const database = await createDatabase()
await seedDatabase(database)
app.set('database', database)

app.listen(port, () => {
  console.log(`Backend is running at http://localhost:${port}`)
})
