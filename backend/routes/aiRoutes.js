import { Router } from 'express'
import { analyzeClass, analyzeStudent, recommendStudent } from '../controllers/aiController.js'
import { requireAdminOrAssignedClass, requireAdminOrOwnStudent } from '../middleware/authMiddleware.js'

const aiRouter = Router()

aiRouter.post('/analyze/:studentId', requireAdminOrOwnStudent, analyzeStudent)
aiRouter.post('/recommend/:studentId', requireAdminOrOwnStudent, recommendStudent)
aiRouter.post('/analyze-class/:classId', requireAdminOrAssignedClass, analyzeClass)

export default aiRouter
