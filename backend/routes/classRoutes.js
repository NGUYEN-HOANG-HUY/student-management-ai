import { Router } from 'express'
import { listClasses } from '../controllers/classController.js'

const classRouter = Router()
classRouter.get('/', listClasses)

export default classRouter
