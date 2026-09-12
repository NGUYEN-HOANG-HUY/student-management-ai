import { Router } from 'express'

const healthRouter = Router()

healthRouter.get('/', (_request, response) => {
  response.json({
    success: true,
    message: 'Student AI System API is running',
    service: 'student-management-ai-backend',
    timestamp: new Date().toISOString(),
  })
})

export default healthRouter
