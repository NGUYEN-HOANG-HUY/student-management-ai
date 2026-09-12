import 'dotenv/config'
import app from './app.js'

const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
  console.log(`Student AI System API is running at http://localhost:${PORT}`)
})
