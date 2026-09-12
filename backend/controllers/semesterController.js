import { z } from 'zod'

const semesterSchema = z.object({
  name: z.string().trim().min(2).max(80),
  academicYear: z.string().trim().min(4).max(20),
  term: z.coerce.number().int().min(1).max(3),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'startDate must use YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'endDate must use YYYY-MM-DD'),
  isActive: z.coerce.boolean().default(false),
})

const semesterFields = `
  id,
  name,
  academic_year AS academicYear,
  term,
  start_date AS startDate,
  end_date AS endDate,
  is_active AS isActive
`

function sendValidationError(response, error) {
  response.status(400).json({
    success: false,
    message: 'Dữ liệu học kỳ không hợp lệ',
    errors: error.flatten().fieldErrors,
  })
}

export async function listSemesters(request, response, next) {
  try {
    const database = request.app.get('database')
    const semesters = await database.all(`SELECT ${semesterFields} FROM semesters ORDER BY start_date DESC`)
    response.json({ success: true, data: semesters })
  } catch (error) {
    next(error)
  }
}

export async function createSemester(request, response, next) {
  const result = semesterSchema.safeParse(request.body)
  if (!result.success) {
    return sendValidationError(response, result.error)
  }

  try {
    const database = request.app.get('database')
    const semester = result.data
    if (semester.isActive) {
      await database.run('UPDATE semesters SET is_active = 0')
    }

    const insertResult = await database.run(
      `INSERT INTO semesters (name, academic_year, term, start_date, end_date, is_active)
       VALUES (?, ?, ?, ?, ?, ?)`,
      semester.name,
      semester.academicYear,
      semester.term,
      semester.startDate,
      semester.endDate,
      semester.isActive ? 1 : 0,
    )

    const createdSemester = await database.get(
      `SELECT ${semesterFields} FROM semesters WHERE id = ?`,
      insertResult.lastID,
    )
    response.status(201).json({ success: true, data: createdSemester })
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return response.status(409).json({ success: false, message: 'Tên học kỳ đã tồn tại' })
    }
    next(error)
  }
}

export async function updateSemester(request, response, next) {
  const result = semesterSchema.safeParse(request.body)
  if (!result.success) {
    return sendValidationError(response, result.error)
  }

  try {
    const database = request.app.get('database')
    const semester = result.data
    if (semester.isActive) {
      await database.run('UPDATE semesters SET is_active = 0 WHERE id != ?', request.params.id)
    }

    const updateResult = await database.run(
      `UPDATE semesters
       SET name = ?, academic_year = ?, term = ?, start_date = ?, end_date = ?, is_active = ?
       WHERE id = ?`,
      semester.name,
      semester.academicYear,
      semester.term,
      semester.startDate,
      semester.endDate,
      semester.isActive ? 1 : 0,
      request.params.id,
    )

    if (!updateResult.changes) {
      return response.status(404).json({ success: false, message: 'Không tìm thấy học kỳ' })
    }

    const updatedSemester = await database.get(
      `SELECT ${semesterFields} FROM semesters WHERE id = ?`,
      request.params.id,
    )
    response.json({ success: true, data: updatedSemester })
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return response.status(409).json({ success: false, message: 'Tên học kỳ đã tồn tại' })
    }
    next(error)
  }
}

export async function deleteSemester(request, response, next) {
  try {
    const database = request.app.get('database')
    const deleteResult = await database.run('DELETE FROM semesters WHERE id = ?', request.params.id)

    if (!deleteResult.changes) {
      return response.status(404).json({ success: false, message: 'Không tìm thấy học kỳ' })
    }

    response.json({ success: true, message: 'Xóa học kỳ thành công' })
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
      return response.status(409).json({ success: false, message: 'Không thể xóa học kỳ đã có dữ liệu điểm' })
    }
    next(error)
  }
}
