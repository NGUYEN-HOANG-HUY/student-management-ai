export const RISK_THRESHOLDS = Object.freeze({
  highGpa: 2,
  mediumGpa: 2.5,
  weakScore: 5,
  watchScore: 6.5,
  strongScore: 8,
})

const SCORE_QUERY = `
  SELECT
    scores.id,
    scores.process_score AS processScore,
    scores.midterm_score AS midtermScore,
    scores.final_score AS finalScore,
    scores.total_score AS totalScore,
    scores.letter_grade AS letterGrade,
    scores.grade_point AS gradePoint,
    student_subjects.status AS status,
    subjects.id AS subjectId,
    subjects.subject_code AS subjectCode,
    subjects.subject_name AS subjectName,
    subjects.credits,
    semesters.id AS semesterId,
    semesters.name AS semesterName,
    semesters.start_date AS semesterStartDate
  FROM scores
  JOIN student_subjects ON student_subjects.id = scores.student_subject_id
  JOIN subjects ON subjects.id = student_subjects.subject_id
  JOIN semesters ON semesters.id = student_subjects.semester_id
  WHERE student_subjects.student_id = ?
  ORDER BY semesters.start_date, subjects.subject_code
`

function round(value) {
  return Number(value.toFixed(2))
}

function calculateWeightedGpa(scores) {
  const totalCredits = scores.reduce((sum, score) => sum + score.credits, 0)
  const weightedPoints = scores.reduce(
    (sum, score) => sum + score.gradePoint * score.credits,
    0,
  )

  return {
    gpa: totalCredits ? round(weightedPoints / totalCredits) : 0,
    totalCredits,
  }
}

function classifyGpa(gpa) {
  if (gpa >= 3.6) return 'Xuất sắc'
  if (gpa >= 3.2) return 'Giỏi'
  if (gpa >= 2.5) return 'Khá'
  if (gpa >= 2.0) return 'Trung bình'
  return 'Yếu'
}

function getRiskLevel(gpa, failedSubjects) {
  if (gpa < RISK_THRESHOLDS.highGpa || failedSubjects >= 2) return 'HIGH'
  if (gpa < RISK_THRESHOLDS.mediumGpa || failedSubjects === 1) return 'MEDIUM'
  return 'LOW'
}

function getTrend(semesterAverages) {
  if (semesterAverages.length < 2) return 'stable'

  const difference = semesterAverages.at(-1).gpa - semesterAverages.at(-2).gpa
  if (difference >= 0.15) return 'improving'
  if (difference <= -0.15) return 'declining'
  return 'stable'
}

function groupBySemester(scores) {
  const grouped = new Map()

  for (const score of scores) {
    if (!grouped.has(score.semesterId)) {
      grouped.set(score.semesterId, {
        semesterId: score.semesterId,
        semesterName: score.semesterName,
        semesterStartDate: score.semesterStartDate,
        scores: [],
      })
    }
    grouped.get(score.semesterId).scores.push(score)
  }

  return [...grouped.values()]
    .sort((first, second) => first.semesterStartDate.localeCompare(second.semesterStartDate))
    .map((semester) => ({
      semesterId: semester.semesterId,
      semesterName: semester.semesterName,
      ...calculateWeightedGpa(semester.scores),
    }))
}

export function summarizeScores(scores) {
  const { gpa, totalCredits } = calculateWeightedGpa(scores)
  const failedSubjects = scores.filter((score) => score.totalScore < RISK_THRESHOLDS.weakScore)
  const weakSubjects = scores.filter((score) => score.totalScore < RISK_THRESHOLDS.weakScore)
  const watchSubjects = scores.filter(
    (score) => score.totalScore >= RISK_THRESHOLDS.weakScore
      && score.totalScore < RISK_THRESHOLDS.watchScore,
  )
  const strongSubjects = scores.filter((score) => score.totalScore >= RISK_THRESHOLDS.strongScore)
  const semesterAverages = groupBySemester(scores)

  return {
    gpa,
    classification: classifyGpa(gpa),
    totalCredits,
    completedCredits: scores
      .filter((score) => score.totalScore >= RISK_THRESHOLDS.weakScore)
      .reduce((sum, score) => sum + score.credits, 0),
    passedSubjects: scores.filter((score) => score.totalScore >= RISK_THRESHOLDS.weakScore).length,
    failedSubjects: failedSubjects.length,
    riskLevel: getRiskLevel(gpa, failedSubjects.length),
    trend: getTrend(semesterAverages),
    semesterAverages,
    weakSubjects,
    watchSubjects,
    strongSubjects,
    scores,
  }
}

export async function getStudentAnalytics(database, studentId) {
  const student = await database.get(
    `SELECT students.id, students.student_code AS studentCode, students.full_name AS fullName,
            students.email, classes.name AS className, departments.name AS department
     FROM students
     JOIN classes ON classes.id = students.class_id
     JOIN departments ON departments.id = classes.department_id
     WHERE students.id = ?`,
    studentId,
  )

  if (!student) return null

  const scores = await database.all(SCORE_QUERY, studentId)
  return {
    student,
    ...summarizeScores(scores),
  }
}

export async function getClassAnalytics(database, classId) {
  const classInfo = await database.get(
    `SELECT classes.id, classes.code, classes.name, departments.name AS department
     FROM classes
     JOIN departments ON departments.id = classes.department_id
     WHERE classes.id = ?`,
    classId,
  )
  if (!classInfo) return null

  const students = await database.all(
    'SELECT id, student_code AS studentCode, full_name AS fullName FROM students WHERE class_id = ? ORDER BY id',
    classId,
  )
  const studentAnalytics = await Promise.all(
    students.map((student) => getStudentAnalytics(database, student.id)),
  )
  const scores = studentAnalytics.flatMap((student) => student.scores)
  const passedScores = scores.filter((score) => score.totalScore >= RISK_THRESHOLDS.weakScore)
  const weakBySubject = new Map()

  for (const score of scores) {
    if (score.totalScore < RISK_THRESHOLDS.weakScore) {
      const current = weakBySubject.get(score.subjectName) || {
        subject: score.subjectName,
        weakCount: 0,
        averageScore: 0,
        scores: [],
      }
      current.weakCount += 1
      current.scores.push(score.totalScore)
      current.averageScore = round(current.scores.reduce((sum, value) => sum + value, 0) / current.scores.length)
      weakBySubject.set(score.subjectName, current)
    }
  }

  return {
    class: classInfo,
    totals: {
      students: students.length,
      scores: scores.length,
      averageGpa: studentAnalytics.length
        ? round(studentAnalytics.reduce((sum, student) => sum + student.gpa, 0) / studentAnalytics.length)
        : 0,
      passRate: scores.length ? round((passedScores.length / scores.length) * 100) : 0,
      failRate: scores.length ? round(((scores.length - passedScores.length) / scores.length) * 100) : 0,
      atRiskStudents: studentAnalytics.filter((student) => student.riskLevel !== 'LOW').length,
    },
    hardestSubjects: [...weakBySubject.values()]
      .sort((first, second) => second.weakCount - first.weakCount)
      .slice(0, 5)
      .map(({ scores: _scores, ...subject }) => subject),
    atRiskStudents: studentAnalytics
      .filter((student) => student.riskLevel !== 'LOW')
      .map((student) => ({
        ...student.student,
        gpa: student.gpa,
        riskLevel: student.riskLevel,
        failedSubjects: student.failedSubjects,
      })),
  }
}

export async function getDashboardAnalytics(database, teacherId = null) {
  const students = await database.all(
    teacherId
      ? `SELECT students.id
         FROM students
         JOIN class_teachers ON class_teachers.class_id = students.class_id
         WHERE class_teachers.teacher_id = ?
         ORDER BY students.id`
      : 'SELECT id FROM students ORDER BY id',
    ...(teacherId ? [teacherId] : []),
  )
  const studentAnalytics = await Promise.all(
    students.map((student) => getStudentAnalytics(database, student.id)),
  )

  const allScores = await database.all(
    `SELECT subjects.subject_name AS subjectName, scores.total_score AS totalScore,
            scores.grade_point AS gradePoint, subjects.credits,
            semesters.name AS semesterName, semesters.start_date AS semesterStartDate
     FROM scores
     JOIN student_subjects ON student_subjects.id = scores.student_subject_id
     JOIN students ON students.id = student_subjects.student_id
     JOIN subjects ON subjects.id = student_subjects.subject_id
     JOIN semesters ON semesters.id = student_subjects.semester_id
     ${teacherId ? 'WHERE EXISTS (SELECT 1 FROM class_teachers WHERE class_teachers.class_id = students.class_id AND class_teachers.teacher_id = ?)' : ''}
     ORDER BY semesters.start_date`,
    ...(teacherId ? [teacherId] : []),
  )
  const averageGpa = studentAnalytics.length
    ? round(studentAnalytics.reduce((sum, item) => sum + item.gpa, 0) / studentAnalytics.length)
    : 0
  const weakSubjectMap = new Map()
  const distributionCounts = [0, 0, 0, 0]

  const semesterMap = new Map()
  for (const score of allScores) {
    if (score.totalScore < RISK_THRESHOLDS.weakScore) {
      const current = weakSubjectMap.get(score.subjectName)
        || { subjectName: score.subjectName, count: 0 }
      current.count += 1
      weakSubjectMap.set(score.subjectName, current)
    }

    if (score.totalScore < 5) distributionCounts[0] += 1
    else if (score.totalScore < 6.5) distributionCounts[1] += 1
    else if (score.totalScore < 8) distributionCounts[2] += 1
    else distributionCounts[3] += 1

    const current = semesterMap.get(score.semesterName) || { semesterName: score.semesterName, scores: [] }
    current.scores.push(score)
    semesterMap.set(score.semesterName, current)
  }

  const scoreDistribution = [
    { label: 'Yếu (< 5)', count: distributionCounts[0] },
    { label: 'Theo dõi (5 - 6.4)', count: distributionCounts[1] },
    { label: 'Khá (6.5 - 7.9)', count: distributionCounts[2] },
    { label: 'Tốt (>= 8)', count: distributionCounts[3] },
  ]

  const gpaTrend = [...semesterMap.values()].map((semester) => {
    const summary = calculateWeightedGpa(semester.scores)
    return { semesterName: semester.semesterName, gpa: summary.gpa }
  })

  return {
    totals: {
      students: students.length,
      subjects: (await database.get('SELECT COUNT(*) AS count FROM subjects')).count,
      averageGpa,
      atRiskStudents: studentAnalytics.filter((student) => student.riskLevel !== 'LOW').length,
    },
    gpaTrend,
    scoreDistribution,
    topWeakSubjects: [...weakSubjectMap.values()].sort((first, second) => second.count - first.count),
    atRiskStudents: studentAnalytics
      .filter((student) => student.riskLevel !== 'LOW')
      .map((student) => ({
        ...student.student,
        gpa: student.gpa,
        riskLevel: student.riskLevel,
        failedSubjects: student.failedSubjects,
      })),
  }
}
