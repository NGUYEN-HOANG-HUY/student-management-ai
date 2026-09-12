import { z } from 'zod'

const subjectSchema = z.object({
  subjectCode: z.string().trim().min(1).max(30),
  subjectName: z.string().trim().min(2).max(150),
  credits: z.coerce.number().int().min(1).max(6),
  prerequisiteSubjectId: z.coerce.number().int().positive().nullable().optional(),
})

const subjectFields = `
  s.id,
  s.subject_code AS subjectCode,
  s.subject_name AS subjectName,
  s.credits,
  s.prerequisite_subject_id AS prerequisiteSubjectId,
  prerequisite.subject_code AS prerequisiteSubjectCode,
  s.created_at AS createdAt
`

function sendValidationError(response, error) {
  response.status(400).json({
    success: false,
    message: 'Dữ liệu môn học không hợp lệ',
    errors: error.flatten().fieldErrors,
  })
}

function handleConstraintError(response, error) {
  const isUniqueConstraint = error.code === 'SQLITE_CONSTRAINT_UNIQUE'
    || (error.code === 'SQLITE_CONSTRAINT' && error.message?.includes('UNIQUE constraint failed'))

  if (isUniqueConstraint) {
    response.status(409).json({ success: false, message: 'Mã môn học đã tồn tại' })
    return true
  }

  if (error.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
    response.status(400).json({ success: false, message: 'Môn tiên quyết không tồn tại' })
    return true
  }

  return false
}

async function findSubject(database, id) {
  return database.get(
    `SELECT ${subjectFields}
     FROM subjects s
     LEFT JOIN subjects prerequisite ON prerequisite.id = s.prerequisite_subject_id
     WHERE s.id = ?`,
    id,
  )
}

export async function listSubjects(request, response, next) {
  try {
    const database = request.app.get('database')
    const subjects = await database.all(
      `SELECT ${subjectFields}
       FROM subjects s
       LEFT JOIN subjects prerequisite ON prerequisite.id = s.prerequisite_subject_id
       ORDER BY s.subject_code`,
    )
    response.json({ success: true, data: subjects })
  } catch (error) {
    next(error)
  }
}

export async function createSubject(request, response, next) {
  const result = subjectSchema.safeParse(request.body)
  if (!result.success) {
    return sendValidationError(response, result.error)
  }

  try {
    const database = request.app.get('database')
    const subject = result.data
    const insertResult = await database.run(
      `INSERT INTO subjects (subject_code, subject_name, credits, prerequisite_subject_id)
       VALUES (?, ?, ?, ?)`,
      subject.subjectCode,
      subject.subjectName,
      subject.credits,
      subject.prerequisiteSubjectId ?? null,
    )
    const createdSubject = await findSubject(database, insertResult.lastID)
    response.status(201).json({ success: true, data: createdSubject })
  } catch (error) {
    if (!handleConstraintError(response, error)) {
      next(error)
    }
  }
}

export async function updateSubject(request, response, next) {
  const result = subjectSchema.safeParse(request.body)
  if (!result.success) {
    return sendValidationError(response, result.error)
  }

  try {
    const database = request.app.get('database')
    const subject = result.data
    const updateResult = await database.run(
      `UPDATE subjects
       SET subject_code = ?, subject_name = ?, credits = ?, prerequisite_subject_id = ?
       WHERE id = ?`,
      subject.subjectCode,
      subject.subjectName,
      subject.credits,
      subject.prerequisiteSubjectId ?? null,
      request.params.id,
    )

    if (!updateResult.changes) {
      return response.status(404).json({ success: false, message: 'Không tìm thấy môn học' })
    }

    response.json({ success: true, data: await findSubject(database, request.params.id) })
  } catch (error) {
    if (!handleConstraintError(response, error)) {
      next(error)
    }
  }
}

export async function deleteSubject(request, response, next) {
  try {
    const database = request.app.get('database')
    const deleteResult = await database.run('DELETE FROM subjects WHERE id = ?', request.params.id)

    if (!deleteResult.changes) {
      return response.status(404).json({ success: false, message: 'Không tìm thấy môn học' })
    }

    response.json({ success: true, message: 'Xóa môn học thành công' })
  } catch (error) {
    if (!handleConstraintError(response, error)) {
      next(error)
    }
  }
}
