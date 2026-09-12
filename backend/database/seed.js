import bcrypt from 'bcryptjs'
import { calculateGrade } from '../utils/gradeUtils.js'

const departments = [
  { code: 'CNTT', name: 'Công nghệ thông tin' },
  { code: 'QTKD', name: 'Quản trị kinh doanh' },
]

const departmentByCode = new Map(departments.map((department) => [department.code, department]))

const classes = [
  { code: 'CNTT-K16A', name: 'Công nghệ thông tin K16A', departmentCode: 'CNTT' },
  { code: 'CNTT-K16B', name: 'Công nghệ thông tin K16B', departmentCode: 'CNTT' },
  { code: 'QTKD-K16A', name: 'Quản trị kinh doanh K16A', departmentCode: 'QTKD' },
]

const teachers = [
  { code: 'GV001', fullName: 'Nguyễn Văn Giảng', email: 'gv001@example.com', username: 'GV001', classCodes: ['CNTT-K16A', 'CNTT-K16B'], departmentCode: 'CNTT' },
  { code: 'GV002', fullName: 'Trần Thị Cô', email: 'gv002@example.com', username: 'GV002', classCodes: ['QTKD-K16A'], departmentCode: 'QTKD' },
]

const names = [
  'Nguyễn Minh Anh', 'Trần Hoàng Nam', 'Lê Thu Hà', 'Phạm Gia Huy', 'Võ Ngọc Mai',
  'Đỗ Nhật Minh', 'Bùi Khánh Linh', 'Hoàng Đức Anh', 'Đặng Phương Thảo', 'Ngô Quang Huy',
  'Dương Hải Yến', 'Phan Tuấn Kiệt', 'Mai Thanh Tùng', 'Lý Bảo Châu', 'Huỳnh Minh Khang',
  'Trịnh Hà My', 'Cao Quốc Bảo', 'Đinh Khánh Vy', 'Tạ Anh Duy', 'Vũ Ngọc Diệp',
]

const students = names.map((fullName, index) => ({
  studentCode: `SV${String(index + 1).padStart(3, '0')}`,
  fullName,
  email: `sv${String(index + 1).padStart(3, '0')}@example.com`,
  dateOfBirth: `${2004 + (index % 2)}-${String((index % 12) + 1).padStart(2, '0')}-${String((index % 27) + 1).padStart(2, '0')}`,
  gender: index % 3 === 0 ? 'female' : 'male',
  classCode: classes[index % classes.length].code,
}))

const subjects = [
  { code: 'MATH101', name: 'Toán cao cấp', credits: 3 },
  { code: 'PROG101', name: 'Lập trình căn bản', credits: 3 },
  { code: 'DB101', name: 'Cơ sở dữ liệu', credits: 3, prerequisiteCode: 'PROG101' },
  { code: 'ENG101', name: 'Tiếng Anh chuyên ngành', credits: 2 },
  { code: 'WEB201', name: 'Lập trình Web', credits: 3, prerequisiteCode: 'PROG101' },
  { code: 'AI201', name: 'Nhập môn trí tuệ nhân tạo', credits: 3, prerequisiteCode: 'MATH101' },
  { code: 'OS201', name: 'Hệ điều hành', credits: 3 },
  { code: 'SE201', name: 'Công nghệ phần mềm', credits: 3 },
  { code: 'STAT201', name: 'Xác suất thống kê', credits: 3, prerequisiteCode: 'MATH101' },
  { code: 'SOFT301', name: 'Dự án phần mềm', credits: 4, prerequisiteCode: 'SE201' },
]

const semesters = [
  { name: 'Học kỳ 1 năm học 2024-2025', academicYear: '2024-2025', term: 1, startDate: '2024-09-01', endDate: '2025-01-15', isActive: 0 },
  { name: 'Học kỳ 2 năm học 2024-2025', academicYear: '2024-2025', term: 2, startDate: '2025-02-01', endDate: '2025-06-15', isActive: 0 },
  { name: 'Học kỳ 1 năm học 2025-2026', academicYear: '2025-2026', term: 1, startDate: '2025-09-01', endDate: '2026-01-15', isActive: 1 },
]

function demoScore(studentIndex, subjectIndex, semesterIndex) {
  const pattern = (studentIndex * 1.17 + subjectIndex * 0.73 + semesterIndex * 0.41) % 5.8
  const base = 4.1 + pattern
  return {
    process: Number(Math.min(10, base + 0.5).toFixed(1)),
    midterm: Number(Math.min(10, base - 0.2).toFixed(1)),
    final: Number(Math.min(10, base + 0.2).toFixed(1)),
  }
}

export async function seedDatabase(database) {
  const adminUsername = process.env.ADMIN_USERNAME || 'admin'
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'
  const studentPassword = process.env.STUDENT_DEFAULT_PASSWORD || 'student123'
  const adminHash = await bcrypt.hash(adminPassword, 10)
  const studentHash = await bcrypt.hash(studentPassword, 10)

  await database.run(
    `INSERT OR IGNORE INTO users (username, password_hash, role)
     VALUES (?, ?, 'admin')`,
    adminUsername,
    adminHash,
  )

  for (const department of departments) {
    await database.run(
      'INSERT OR IGNORE INTO departments (code, name) VALUES (?, ?)',
      department.code,
      department.name,
    )
  }

  for (const item of classes) {
    const department = await database.get(
      'SELECT id FROM departments WHERE name = ?',
      departmentByCode.get(item.departmentCode).name,
    )
    await database.run(
      `INSERT OR IGNORE INTO classes (code, name, department_id)
       VALUES (?, ?, ?)`,
      item.code,
      item.name,
      department.id,
    )
  }

  for (const student of students) {
    const studentClass = await database.get('SELECT id FROM classes WHERE code = ?', student.classCode)
    await database.run(
      `INSERT OR IGNORE INTO students
       (student_code, full_name, email, date_of_birth, gender, class_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      student.studentCode,
      student.fullName,
      student.email,
      student.dateOfBirth,
      student.gender,
      studentClass.id,
    )

    const studentRecord = await database.get('SELECT id FROM students WHERE student_code = ?', student.studentCode)
    await database.run(
      `INSERT OR IGNORE INTO users (username, password_hash, role, student_id)
       VALUES (?, ?, 'student', ?)`,
      student.studentCode,
      studentHash,
      studentRecord.id,
    )
  }

  for (const teacher of teachers) {
    const department = await database.get(
      'SELECT id FROM departments WHERE name = ?',
      departmentByCode.get(teacher.departmentCode).name,
    )
    await database.run(
      `INSERT OR IGNORE INTO users (username, password_hash, role)
       VALUES (?, ?, 'teacher')`,
      teacher.username,
      studentHash,
    )
    const user = await database.get('SELECT id FROM users WHERE username = ?', teacher.username)
    await database.run(
      `INSERT OR IGNORE INTO teachers (teacher_code, full_name, email, department_id, user_id)
       VALUES (?, ?, ?, ?, ?)`,
      teacher.code,
      teacher.fullName,
      teacher.email,
      department.id,
      user.id,
    )
    const teacherRecord = await database.get('SELECT id FROM teachers WHERE teacher_code = ?', teacher.code)
    for (const classCode of teacher.classCodes) {
      const classRecord = await database.get('SELECT id FROM classes WHERE code = ?', classCode)
      await database.run(
        'INSERT OR IGNORE INTO class_teachers (class_id, teacher_id) VALUES (?, ?)',
        classRecord.id,
        teacherRecord.id,
      )
    }
    await database.run(
      'UPDATE users SET teacher_id = ? WHERE id = ?',
      teacherRecord.id,
      user.id,
    )
  }

  for (const subject of subjects) {
    const prerequisite = subject.prerequisiteCode
      ? await database.get('SELECT id FROM subjects WHERE subject_code = ?', subject.prerequisiteCode)
      : null
    await database.run(
      `INSERT OR IGNORE INTO subjects
       (subject_code, subject_name, credits, prerequisite_subject_id)
       VALUES (?, ?, ?, ?)`,
      subject.code,
      subject.name,
      subject.credits,
      prerequisite?.id ?? null,
    )
  }

  for (const semester of semesters) {
    await database.run(
      `INSERT OR IGNORE INTO semesters
       (name, academic_year, term, start_date, end_date, is_active)
       VALUES (?, ?, ?, ?, ?, ?)`,
      semester.name,
      semester.academicYear,
      semester.term,
      semester.startDate,
      semester.endDate,
      semester.isActive,
    )
  }

  for (let semesterIndex = 0; semesterIndex < semesters.length; semesterIndex += 1) {
    const semester = await database.get('SELECT id FROM semesters WHERE name = ?', semesters[semesterIndex].name)
    for (let studentIndex = 0; studentIndex < students.length; studentIndex += 1) {
      const student = await database.get('SELECT id FROM students WHERE student_code = ?', students[studentIndex].studentCode)
      const subjectLimit = semesterIndex === 0 ? subjects.length : 5

      for (let subjectIndex = 0; subjectIndex < subjectLimit; subjectIndex += 1) {
        const subject = await database.get('SELECT id FROM subjects WHERE subject_code = ?', subjects[subjectIndex].code)
        await database.run(
          `INSERT OR IGNORE INTO student_subjects (student_id, subject_id, semester_id, status)
           VALUES (?, ?, ?, 'enrolled')`,
          student.id,
          subject.id,
          semester.id,
        )
        const relation = await database.get(
          `SELECT id FROM student_subjects
           WHERE student_id = ? AND subject_id = ? AND semester_id = ?`,
          student.id,
          subject.id,
          semester.id,
        )
        const rawScore = demoScore(studentIndex, subjectIndex, semesterIndex)
        const grade = calculateGrade(rawScore.process, rawScore.midterm, rawScore.final)
        await database.run('UPDATE student_subjects SET status = ? WHERE id = ?', grade.status, relation.id)

        const existingScore = await database.get(
          'SELECT id FROM scores WHERE student_subject_id = ?',
          relation.id,
        )

        if (!existingScore) {
          await database.run(
            `INSERT INTO scores
             (student_subject_id, process_score, midterm_score, final_score, total_score, letter_grade, grade_point)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            relation.id,
            rawScore.process,
            rawScore.midterm,
            rawScore.final,
            grade.totalScore,
            grade.letterGrade,
            grade.gradePoint,
          )
        }
      }
    }
  }
}
