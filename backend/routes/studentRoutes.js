import { Router } from 'express'
import {
  createStudent,
  deleteStudent,
  getStudentById,
  listStudents,
  updateStudent,
} from '../controllers/studentController.js'
import {
  requireAdmin,
  requireAdminOrOwnStudent,
  requireAdminOrTeacher,
} from '../middleware/authMiddleware.js'

const studentRouter = Router()

studentRouter.get('/', requireAdminOrTeacher, listStudents)
studentRouter.post('/', requireAdmin, createStudent)
studentRouter.get('/:id', requireAdminOrOwnStudent, getStudentById)
studentRouter.put('/:id', requireAdmin, updateStudent)
studentRouter.delete('/:id', requireAdmin, deleteStudent)

export default studentRouter
