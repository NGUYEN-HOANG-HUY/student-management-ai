import { z } from 'zod'

const studentSchema = z.object({
  studentCode: z.string().trim().min(1).max(30),
  fullName: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(150),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'dateOfBirth must use YYYY-MM-DD'),
  gender: z.enum(['male', 'female', 'other']),
  classId: z.coerce.number().int().positive(),
})

const studentFields = `
  s.id,
  s.student_code AS studentCode,
  s.full_name AS fullName,
  s.email,
  s.date_of_birth AS dateOfBirth,
  s.gender,
  s.class_id AS classId,
  c.code AS classCode,
  c.name AS className,
  d.name AS department,
  s.created_at AS createdAt,
  s.updated_at AS updatedAt
`

function sendValidationError(response, error) {
  response.status(400).json({
    success: false,
    message: 'Dữ liệu sinh viên không hợp lệ',
    errors: error.flatten().fieldErrors,
  })
}

function sendDatabaseError(response, error) {
  const isUniqueConstraint = error.code === 'SQLITE_CONSTRAINT_UNIQUE'
    || (error.code === 'SQLITE_CONSTRAINT' && error.message?.includes('UNIQUE constraint failed'))

  if (isUniqueConstraint) {
    response.status(409).json({
      success: false,
      message: 'Mã sinh viên hoặc email đã tồn tại',
    })
    return
  }

  if (error.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
    response.status(400).json({
      success: false,
      message: 'Lớp không tồn tại',
    })
    return
  }

  throw error
}

export async function listStudents(request, response, next) {
  try {
    const database = request.app.get('database')
    const search = String(request.query.search || '').trim()
    const classId = request.query.classId ? Number(request.query.classId) : null
    const conditions = []
    const parameters = []

    if (search) {
      conditions.push('(s.student_code LIKE ? OR s.full_name LIKE ? OR s.email LIKE ?)')
      const searchPattern = `%${search}%`
      parameters.push(searchPattern, searchPattern, searchPattern)
    }

    if (classId !== null) {
      if (!Number.isInteger(classId) || classId <= 0) {
        return response.status(400).json({ success: false, message: 'classId không hợp lệ' })
      }
      conditions.push('s.class_id = ?')
      parameters.push(classId)
    }

    if (request.user.role === 'teacher') {
      conditions.push('EXISTS (SELECT 1 FROM class_teachers ct WHERE ct.class_id = s.class_id AND ct.teacher_id = ?)')
      parameters.push(request.user.teacherId)
    }
    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    const students = await database.all(
      `SELECT ${studentFields}
       FROM students s
      JOIN classes c ON c.id = s.class_id
      JOIN departments d ON d.id = c.department_id
       ${whereClause}
       ORDER BY s.id DESC`,
      ...parameters,
    )

    response.json({ success: true, data: students })
  } catch (error) {
    next(error)
  }
}

export async function getStudentById(request, response, next) {
  try {
    const database = request.app.get('database')
    const student = await database.get(
      `SELECT ${studentFields}
       FROM students s
      JOIN classes c ON c.id = s.class_id
      JOIN departments d ON d.id = c.department_id
       WHERE s.id = ?`,
      request.params.id,
    )

    if (!student) {
      return response.status(404).json({ success: false, message: 'Không tìm thấy sinh viên' })
    }

    response.json({ success: true, data: student })
  } catch (error) {
    next(error)
  }
}

export async function createStudent(request, response, next) {
  const result = studentSchema.safeParse(request.body)
  if (!result.success) {
    return sendValidationError(response, result.error)
  }

  try {
    const database = request.app.get('database')
    const student = result.data
    const insertResult = await database.run(
      `INSERT INTO students
       (student_code, full_name, email, date_of_birth, gender, class_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      student.studentCode,
      student.fullName,
      student.email,
      student.dateOfBirth,
      student.gender,
      student.classId,
    )

    const createdStudent = await database.get(
      `SELECT ${studentFields}
       FROM students s
      JOIN classes c ON c.id = s.class_id
      JOIN departments d ON d.id = c.department_id
       WHERE s.id = ?`,
      insertResult.lastID,
    )

    response.status(201).json({ success: true, data: createdStudent })
  } catch (error) {
    try {
      sendDatabaseError(response, error)
    } catch (unhandledError) {
      next(unhandledError)
    }
  }
}

export async function updateStudent(request, response, next) {
  const result = studentSchema.safeParse(request.body)
  if (!result.success) {
    return sendValidationError(response, result.error)
  }

  try {
    const database = request.app.get('database')
    const student = result.data
    const updateResult = await database.run(
      `UPDATE students
       SET student_code = ?, full_name = ?, email = ?, date_of_birth = ?,
           gender = ?, class_id = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      student.studentCode,
      student.fullName,
      student.email,
      student.dateOfBirth,
      student.gender,
      student.classId,
      request.params.id,
    )

    if (!updateResult.changes) {
      return response.status(404).json({ success: false, message: 'Không tìm thấy sinh viên' })
    }

    const updatedStudent = await database.get(
      `SELECT ${studentFields}
       FROM students s
      JOIN classes c ON c.id = s.class_id
      JOIN departments d ON d.id = c.department_id
       WHERE s.id = ?`,
      request.params.id,
    )

    response.json({ success: true, data: updatedStudent })
  } catch (error) {
    try {
      sendDatabaseError(response, error)
    } catch (unhandledError) {
      next(unhandledError)
    }
  }
}

export async function deleteStudent(request, response, next) {
  try {
    const database = request.app.get('database')
    const deleteResult = await database.run('DELETE FROM students WHERE id = ?', request.params.id)

    if (!deleteResult.changes) {
      return response.status(404).json({ success: false, message: 'Không tìm thấy sinh viên' })
    }

    response.json({ success: true, message: 'Xóa sinh viên thành công' })
  } catch (error) {
    next(error)
  }
}
