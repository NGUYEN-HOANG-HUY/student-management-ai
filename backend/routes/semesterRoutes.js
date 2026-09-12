import { Router } from 'express'
import { requireAdmin, requireAdminOrTeacher } from '../middleware/authMiddleware.js'
import {
  createSemester,
  deleteSemester,
  listSemesters,
  updateSemester,
} from '../controllers/semesterController.js'

const semesterRouter = Router()

semesterRouter.get('/', requireAdminOrTeacher, listSemesters)
semesterRouter.post('/', requireAdmin, createSemester)
semesterRouter.put('/:id', requireAdmin, updateSemester)
semesterRouter.delete('/:id', requireAdmin, deleteSemester)

export default semesterRouter
