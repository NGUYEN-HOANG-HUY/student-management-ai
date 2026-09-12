export async function listClasses(request, response, next) {
  try {
    const database = request.app.get('database')
    const teacherFilter = request.user.role === 'teacher'
      ? 'JOIN class_teachers ON class_teachers.class_id = classes.id AND class_teachers.teacher_id = ?'
      : ''
    const parameters = request.user.role === 'teacher' ? [request.user.teacherId] : []
    const classes = await database.all(
      `SELECT classes.id, classes.code, classes.name, departments.name AS department
       FROM classes
       JOIN departments ON departments.id = classes.department_id
       ${teacherFilter}
       ORDER BY classes.code`,
      ...parameters,
    )
    response.json({ success: true, data: classes })
  } catch (error) {
    next(error)
  }
}
