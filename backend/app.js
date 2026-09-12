import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import aiRouter from './routes/aiRoutes.js'
import analyticsRouter from './routes/analyticsRoutes.js'
import authRouter from './routes/authRoutes.js'
import classRouter from './routes/classRoutes.js'
import healthRouter from './routes/healthRoutes.js'
import { requireAdmin, requireAdminOrTeacher, requireAuth } from './middleware/authMiddleware.js'
import scoreRouter from './routes/scoreRoutes.js'
import semesterRouter from './routes/semesterRoutes.js'
import studentRouter from './routes/studentRoutes.js'
import subjectRouter from './routes/subjectRoutes.js'

dotenv.config()

const app = express()
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'

app.use(cors({ origin: frontendUrl }))
app.use(express.json({ limit: '100kb' }))

app.get('/', (_request, response) => {
  response.json({
    success: true,
    message: 'Student Management AI API',
  })
})

app.use('/api/health', healthRouter)
app.use('/api/auth', authRouter)
app.use('/api/classes', requireAuth, requireAdminOrTeacher, classRouter)
app.use('/api/analytics', requireAuth, analyticsRouter)
app.use('/api/ai', requireAuth, aiRouter)
app.use('/api/subjects', requireAuth, subjectRouter)
app.use('/api/semesters', requireAuth, semesterRouter)
app.use('/api/students', requireAuth, studentRouter)
app.use('/api/scores', requireAuth, scoreRouter)

app.use((_request, response) => {
  response.status(404).json({
    success: false,
    message: 'Endpoint not found',
  })
})

app.use((error, _request, response, _next) => {
  console.error(error)
  if (error instanceof SyntaxError && error.status === 400 && error.type === 'entity.parse.failed') {
    return response.status(400).json({
      success: false,
      message: 'JSON request không hợp lệ',
    })
  }

  response.status(500).json({
    success: false,
    message: 'Internal server error',
  })
})

export default app
