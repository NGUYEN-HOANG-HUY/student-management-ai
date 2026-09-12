import { getDashboardAnalytics } from '../services/analyticsService.js'
import { analyzeStudentPerformance } from '../services/studentAnalysisService.js'

export async function getAdminDashboard(request, response, next) {
  try {
    response.json({
      success: true,
      data: await getDashboardAnalytics(request.app.get('database'), null),
    })
  } catch (error) {
    next(error)
  }
}

export async function getTeacherDashboard(request, response, next) {
  try {
    response.json({
      success: true,
      data: await getDashboardAnalytics(request.app.get('database'), request.user.teacherId),
    })
  } catch (error) {
    next(error)
  }
}

export async function listTeacherStudents(request, response, next) {
  try {
    const search = String(request.query.search || '').trim()
    const pattern = `%${search}%`
    const students = await request.app.get('database').all(
      `SELECT s.id, s.student_code AS studentCode, s.full_name AS fullName,
              s.email, c.id AS classId, c.code AS classCode, c.name AS className,
              d.name AS department
       FROM students s
       JOIN classes c ON c.id = s.class_id
       JOIN departments d ON d.id = c.department_id
       WHERE EXISTS (
         SELECT 1 FROM class_teachers ct
         WHERE ct.class_id = s.class_id AND ct.teacher_id = ?
       )
       AND (s.student_code LIKE ? OR s.full_name LIKE ? OR s.email LIKE ?)
       ORDER BY s.id DESC`,
      request.user.teacherId,
      pattern,
      pattern,
      pattern,
    )
    response.json({ success: true, data: students })
  } catch (error) {
    next(error)
  }
}

export async function listUsers(request, response, next) {
  try {
    const users = await request.app.get('database').all(
      `SELECT id, username, role, student_id AS studentId, teacher_id AS teacherId,
              created_at AS createdAt, updated_at AS updatedAt
       FROM users
       ORDER BY id`,
    )
    response.json({ success: true, data: users })
  } catch (error) {
    next(error)
  }
}

export async function getStudentDashboard(request, response, next) {
  try {
    const database = request.app.get('database')
    const student = await database.get(
      `SELECT s.id, s.student_code AS studentCode, s.full_name AS fullName,
              c.code AS classCode, c.name AS className
       FROM students s
       JOIN classes c ON c.id = s.class_id
       WHERE s.id = ?`,
      request.user.studentId,
    )
    if (!student) return response.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ sinh viên' })

    response.json({ success: true, data: student })
  } catch (error) {
    next(error)
  }
}

export async function getStudentProfile(request, response, next) {
  try {
    const database = request.app.get('database')
    const student = await database.get(
      `SELECT s.id, s.student_code AS studentCode, s.full_name AS fullName,
              s.email, s.date_of_birth AS dateOfBirth, s.gender,
              c.id AS classId, c.code AS classCode, c.name AS className,
              d.name AS department
       FROM students s
       JOIN classes c ON c.id = s.class_id
       JOIN departments d ON d.id = c.department_id
       WHERE s.id = ?`,
      request.user.studentId,
    )
    if (!student) return response.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ sinh viên' })
    response.json({ success: true, data: student })
  } catch (error) {
    next(error)
  }
}

export async function getStudentGrades(request, response, next) {
  try {
    const database = request.app.get('database')
    const grades = await database.all(
      `SELECT scores.id, subjects.subject_code AS subjectCode,
              subjects.subject_name AS subjectName, subjects.credits,
              semesters.name AS semesterName,
              scores.process_score AS processScore,
              scores.midterm_score AS midtermScore,
              scores.final_score AS finalScore,
              scores.total_score AS totalScore,
              scores.letter_grade AS letterGrade,
              scores.grade_point AS gradePoint
       FROM scores
       JOIN student_subjects ss ON ss.id = scores.student_subject_id
       JOIN subjects ON subjects.id = ss.subject_id
       JOIN semesters ON semesters.id = ss.semester_id
       WHERE ss.student_id = ?
       ORDER BY semesters.start_date DESC, subjects.subject_code`,
      request.user.studentId,
    )
    response.json({ success: true, data: grades })
  } catch (error) {
    next(error)
  }
}

export async function getStudentAiAnalysis(request, response, next) {
  try {
    const result = await analyzeStudentPerformance(
      request.app.get('database'),
      request.user.studentId,
    )

    if (!result) {
      return response.status(404).json({ success: false, message: 'Student not found' })
    }
    if (result.noAcademicData) {
      return response.status(404).json({ success: false, message: 'No academic data available' })
    }

    response.json({ success: true, data: result })
  } catch (error) {
    next(error)
  }
}
