import express from 'express'
import cors from 'cors'

const app = express()

app.use(cors())
app.use(express.json())

app.get('/api/health', (request, response) => {
  response.json({
    success: true,
    message: 'Student AI System API is running',
  })
})

export default app
