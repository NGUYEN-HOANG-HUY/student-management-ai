import jwt from 'jsonwebtoken'

function getJwtSecret() {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured')
  }
  return process.env.JWT_SECRET
}

export async function requireAuth(request, response, next) {
  const authorization = request.headers.authorization
  const token = authorization?.startsWith('Bearer ')
    ? authorization.slice(7)
    : null

  if (!token) {
    return response.status(401).json({ success: false, message: 'Yêu cầu đăng nhập' })
  }

  try {
    const payload = jwt.verify(token, getJwtSecret())
    const user = await request.app.get('database').get(
      `SELECT id, username, role, student_id AS studentId, teacher_id AS teacherId
       FROM users
       WHERE id = ?`,
      payload.id,
    )

    if (!user) {
      return response.status(401).json({ success: false, message: 'Tài khoản không còn tồn tại' })
    }

    request.user = user
    next()
  } catch (error) {
    if (error.message === 'JWT_SECRET is not configured') {
      return next(error)
    }
    response.status(401).json({ success: false, message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn' })
  }
}

export function requireAdmin(request, response, next) {
  if (request.user?.role !== 'admin') {
    return response.status(403).json({ success: false, message: 'Chỉ admin được thực hiện thao tác này' })
  }
  next()
}

export function requireAdminOrTeacher(request, response, next) {
  if (!['admin', 'teacher'].includes(request.user?.role)) {
    return response.status(403).json({ success: false, message: 'Chỉ admin hoặc giảng viên được thực hiện thao tác này' })
  }
  next()
}

async function teacherCanAccessStudent(database, teacherId, studentId) {
  const record = await database.get(
    `SELECT students.id
     FROM students
     JOIN class_teachers ON class_teachers.class_id = students.class_id
     WHERE students.id = ? AND class_teachers.teacher_id = ?`,
    studentId,
    teacherId,
  )
  return Boolean(record)
}

export function requireAdminOrOwnStudent(request, response, next) {
  const requestedStudentId = Number(request.params.studentId ?? request.params.id)
  const isAdmin = request.user?.role === 'admin'
  const isOwnStudent = request.user?.role === 'student' && request.user.studentId === requestedStudentId

  if (isAdmin || isOwnStudent) return next()

  if (request.user?.role === 'teacher') {
    teacherCanAccessStudent(request.app.get('database'), request.user.teacherId, requestedStudentId)
      .then((allowed) => {
        if (allowed) return next()
        return response.status(403).json({ success: false, message: 'Giảng viên không được truy cập sinh viên này' })
      })
      .catch(next)
    return
  }

  return response.status(403).json({ success: false, message: 'Bạn chỉ được xem dữ liệu của mình' })
}

export function requireAdminOrAssignedClass(request, response, next) {
  const classId = Number(request.params.classId)
  if (request.user?.role === 'admin') return next()
  if (request.user?.role !== 'teacher' || !Number.isInteger(classId)) {
    return response.status(403).json({ success: false, message: 'Bạn không được truy cập lớp này' })
  }

  request.app.get('database').get(
    'SELECT 1 FROM class_teachers WHERE class_id = ? AND teacher_id = ?',
    classId,
    request.user.teacherId,
  ).then((assignment) => {
    if (!assignment) {
      return response.status(403).json({ success: false, message: 'Giảng viên không được truy cập lớp này' })
    }
    return next()
  }).catch(next)
}

export { teacherCanAccessStudent }
