import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'

const loginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
})

function jwtSecret() {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured')
  }
  return process.env.JWT_SECRET
}

export async function login(request, response, next) {
  const result = loginSchema.safeParse(request.body)
  if (!result.success) {
    return response.status(400).json({ success: false, message: 'Vui lòng nhập tài khoản và mật khẩu' })
  }

  try {
    const database = request.app.get('database')
    const user = await database.get(
      `SELECT users.id, users.username, users.password_hash AS passwordHash, users.role,
              users.student_id AS studentId, users.teacher_id AS teacherId
       FROM users
       WHERE users.username = ?`,
      result.data.username,
    )

    const isValidPassword = user && await bcrypt.compare(result.data.password, user.passwordHash)
    if (!isValidPassword) {
      return response.status(401).json({ success: false, message: 'Tài khoản hoặc mật khẩu không đúng' })
    }

    const token = jwt.sign(
      { id: user.id },
      jwtSecret(),
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' },
    )

    response.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          studentId: user.studentId,
          teacherId: user.teacherId,
        },
      },
    })
  } catch (error) {
    next(error)
  }
}

export function getCurrentUser(request, response) {
  response.json({ success: true, data: request.user })
}
