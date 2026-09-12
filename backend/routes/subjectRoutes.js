import { Router } from 'express'
import { requireAdmin, requireAdminOrTeacher } from '../middleware/authMiddleware.js'
import {
  createSubject,
  deleteSubject,
  listSubjects,
  updateSubject,
} from '../controllers/subjectController.js'

const subjectRouter = Router()

subjectRouter.get('/', requireAdminOrTeacher, listSubjects)
subjectRouter.post('/', requireAdmin, createSubject)
subjectRouter.put('/:id', requireAdmin, updateSubject)
subjectRouter.delete('/:id', requireAdmin, deleteSubject)

export default subjectRouter
