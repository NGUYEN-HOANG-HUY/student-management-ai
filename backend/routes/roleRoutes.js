import { Router } from 'express'
import {
  getAdminDashboard,
  getStudentDashboard,
  getStudentAiAnalysis,
  getStudentGrades,
  getStudentProfile,
  getTeacherDashboard,
  listTeacherStudents,
  listUsers,
} from '../controllers/roleController.js'
import {
  requireAdmin,
  requireAdminOrTeacher,
  requireAuth,
} from '../middleware/authMiddleware.js'
import scoreRouter from './scoreRoutes.js'

const adminRouter = Router()
adminRouter.get('/dashboard', getAdminDashboard)
adminRouter.get('/users', listUsers)

const teacherRouter = Router()
teacherRouter.get('/dashboard', getTeacherDashboard)
teacherRouter.get('/students', listTeacherStudents)
teacherRouter.use('/scores', scoreRouter)

const studentRouterForOwnData = Router()
studentRouterForOwnData.get('/dashboard', getStudentDashboard)
studentRouterForOwnData.get('/profile', getStudentProfile)
studentRouterForOwnData.get('/grades', getStudentGrades)
studentRouterForOwnData.get('/ai-analysis', getStudentAiAnalysis)

export function registerRoleRoutes(app) {
  app.use('/api/admin', requireAuth, requireAdmin, adminRouter)
  app.use('/api/teacher', requireAuth, requireAdminOrTeacher, teacherRouter)
  app.use('/api/student', requireAuth, (request, response, next) => {
    if (request.user.role !== 'student') {
      return response.status(403).json({ success: false, message: 'Bạn không có quyền truy cập' })
    }
    next()
  }, studentRouterForOwnData)
}
