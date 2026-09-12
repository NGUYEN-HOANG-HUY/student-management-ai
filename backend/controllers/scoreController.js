import { z } from 'zod'
import { teacherCanAccessStudent } from '../middleware/authMiddleware.js'
import { calculateGrade } from '../utils/gradeUtils.js'

const scoreSchema = z.object({
  studentId: z.coerce.number().int().positive(),
  subjectId: z.coerce.number().int().positive(),
  semesterId: z.coerce.number().int().positive(),
  processScore: z.coerce.number().min(0).max(10),
  midtermScore: z.coerce.number().min(0).max(10),
  finalScore: z.coerce.number().min(0).max(10),
})

const scoreFields = `
  scores.id,
  ss.id AS studentSubjectId,
  ss.student_id AS studentId,
  students.student_code AS studentCode,
  students.full_name AS studentName,
  ss.subject_id AS subjectId,
  subjects.subject_code AS subjectCode,
  subjects.subject_name AS subjectName,
  subjects.credits,
  ss.semester_id AS semesterId,
  semesters.name AS semesterName,
  scores.process_score AS processScore,
  scores.midterm_score AS midtermScore,
  scores.final_score AS finalScore,
  scores.total_score AS totalScore,
  scores.letter_grade AS letterGrade,
  scores.grade_point AS gradePoint,
  ss.status,
  scores.created_at AS createdAt,
  scores.updated_at AS updatedAt
`

function sendValidationError(response, error) {
  response.status(400).json({
    success: false,
    message: 'Dữ liệu điểm không hợp lệ',
    errors: error.flatten().fieldErrors,
  })
}

async function findScore(database, id) {
  return database.get(
    `SELECT ${scoreFields}
     FROM scores
     JOIN student_subjects ss ON ss.id = scores.student_subject_id
     JOIN students ON students.id = ss.student_id
     JOIN subjects ON subjects.id = ss.subject_id
     JOIN semesters ON semesters.id = ss.semester_id
     WHERE scores.id = ?`,
    id,
  )
}

async function findStudentSubject(database, studentId, subjectId, semesterId) {
  return database.get(
    `SELECT id FROM student_subjects
     WHERE student_id = ? AND subject_id = ? AND semester_id = ?`,
    studentId,
    subjectId,
    semesterId,
  )
}

export async function listScoresByStudent(request, response, next) {
  try {
    const database = request.app.get('database')
    const scores = await database.all(
      `SELECT ${scoreFields}
       FROM scores
       JOIN student_subjects ss ON ss.id = scores.student_subject_id
       JOIN students ON students.id = ss.student_id
       JOIN subjects ON subjects.id = ss.subject_id
       JOIN semesters ON semesters.id = ss.semester_id
       WHERE ss.student_id = ?
       ORDER BY semesters.start_date DESC, subjects.subject_code`,
      request.params.studentId,
    )
    response.json({ success: true, data: scores })
  } catch (error) {
    next(error)
  }
}

export async function createScore(request, response, next) {
  const result = scoreSchema.safeParse(request.body)
  if (!result.success) {
    return sendValidationError(response, result.error)
  }

  const database = request.app.get('database')
  const score = result.data
  if (request.user.role === 'teacher'
    && !(await teacherCanAccessStudent(database, request.user.teacherId, score.studentId))) {
    return response.status(403).json({ success: false, message: 'Giảng viên không được nhập điểm cho lớp này' })
  }
  const calculatedGrade = calculateGrade(
    score.processScore,
    score.midtermScore,
    score.finalScore,
  )

  try {
    await database.run('BEGIN')

    await database.run(
      `INSERT OR IGNORE INTO student_subjects (student_id, subject_id, semester_id, status)
       VALUES (?, ?, ?, 'enrolled')`,
      score.studentId,
      score.subjectId,
      score.semesterId,
    )

    const studentSubject = await findStudentSubject(
      database,
      score.studentId,
      score.subjectId,
      score.semesterId,
    )
    const existingScore = await database.get(
      'SELECT id FROM scores WHERE student_subject_id = ?',
      studentSubject.id,
    )

    if (existingScore) {
      await database.run('ROLLBACK')
      return response.status(409).json({ success: false, message: 'Sinh viên đã có điểm môn này trong học kỳ' })
    }

    const insertResult = await database.run(
      `INSERT INTO scores
       (student_subject_id, process_score, midterm_score, final_score, total_score, letter_grade, grade_point)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      studentSubject.id,
      score.processScore,
      score.midtermScore,
      score.finalScore,
      calculatedGrade.totalScore,
      calculatedGrade.letterGrade,
      calculatedGrade.gradePoint,
    )
    await database.run(
      'UPDATE student_subjects SET status = ? WHERE id = ?',
      calculatedGrade.status,
      studentSubject.id,
    )
    await database.run('COMMIT')

    response.status(201).json({ success: true, data: await findScore(database, insertResult.lastID) })
  } catch (error) {
    await database.run('ROLLBACK').catch(() => {})
    if (error.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
      return response.status(400).json({ success: false, message: 'Sinh viên, môn học hoặc học kỳ không tồn tại' })
    }
    next(error)
  }
}

export async function updateScore(request, response, next) {
  const result = scoreSchema.omit({ studentId: true, subjectId: true, semesterId: true }).safeParse(request.body)
  if (!result.success) {
    return sendValidationError(response, result.error)
  }

  try {
    const database = request.app.get('database')
    const score = result.data
    const calculatedGrade = calculateGrade(
      score.processScore,
      score.midtermScore,
      score.finalScore,
    )
    const currentScore = await database.get(
      `SELECT scores.student_subject_id, student_subjects.student_id
       FROM scores
       JOIN student_subjects ON student_subjects.id = scores.student_subject_id
       WHERE scores.id = ?`,
      request.params.id,
    )

    if (!currentScore) {
      return response.status(404).json({ success: false, message: 'Không tìm thấy bản ghi điểm' })
    }
    if (request.user.role === 'teacher'
      && !(await teacherCanAccessStudent(database, request.user.teacherId, currentScore.student_id))) {
      return response.status(403).json({ success: false, message: 'Giảng viên không được sửa điểm cho lớp này' })
    }

    await database.run(
      `UPDATE scores
       SET process_score = ?, midterm_score = ?, final_score = ?, total_score = ?,
           letter_grade = ?, grade_point = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      score.processScore,
      score.midtermScore,
      score.finalScore,
      calculatedGrade.totalScore,
      calculatedGrade.letterGrade,
      calculatedGrade.gradePoint,
      request.params.id,
    )
    await database.run(
      'UPDATE student_subjects SET status = ? WHERE id = ?',
      calculatedGrade.status,
      currentScore.student_subject_id,
    )

    response.json({ success: true, data: await findScore(database, request.params.id) })
  } catch (error) {
    next(error)
  }
}

export async function deleteScore(request, response, next) {
  try {
    const database = request.app.get('database')
    const score = await database.get(
      'SELECT student_subject_id FROM scores WHERE id = ?',
      request.params.id,
    )

    if (!score) {
      return response.status(404).json({ success: false, message: 'Không tìm thấy bản ghi điểm' })
    }

    await database.run('DELETE FROM scores WHERE id = ?', request.params.id)
    await database.run(
      "UPDATE student_subjects SET status = 'enrolled' WHERE id = ?",
      score.student_subject_id,
    )
    response.json({ success: true, message: 'Xóa điểm thành công' })
  } catch (error) {
    next(error)
  }
}
