import { Router } from 'express'
import { requireAdminOrTeacher, requireAdminOrOwnStudent } from '../middleware/authMiddleware.js'
import {
  getDashboardAnalyticsHandler,
  getStudentAnalyticsHandler,
} from '../controllers/analyticsController.js'

const analyticsRouter = Router()

analyticsRouter.get('/dashboard', requireAdminOrTeacher, getDashboardAnalyticsHandler)
analyticsRouter.get('/student/:studentId', requireAdminOrOwnStudent, getStudentAnalyticsHandler)

export default analyticsRouter
