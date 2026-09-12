import { Router } from 'express'
import { requireAdmin, requireAdminOrOwnStudent, requireAdminOrTeacher } from '../middleware/authMiddleware.js'
import {
  createScore,
  deleteScore,
  listScoresByStudent,
  updateScore,
} from '../controllers/scoreController.js'

const scoreRouter = Router()

scoreRouter.get('/student/:studentId', requireAdminOrOwnStudent, listScoresByStudent)
scoreRouter.post('/', requireAdminOrTeacher, createScore)
scoreRouter.put('/:id', requireAdminOrTeacher, updateScore)
scoreRouter.delete('/:id', requireAdmin, deleteScore)

export default scoreRouter
