import { getDashboardAnalytics, getStudentAnalytics } from '../services/analyticsService.js'

export async function getStudentAnalyticsHandler(request, response, next) {
  try {
    const analytics = await getStudentAnalytics(
      request.app.get('database'),
      request.params.studentId,
    )

    if (!analytics) {
      return response.status(404).json({ success: false, message: 'Không tìm thấy sinh viên' })
    }

    response.json({ success: true, data: analytics })
  } catch (error) {
    next(error)
  }
}

export async function getDashboardAnalyticsHandler(request, response, next) {
  try {
    const analytics = await getDashboardAnalytics(
      request.app.get('database'),
      request.user.role === 'teacher' ? request.user.teacherId : null,
    )
    response.json({ success: true, data: analytics })
  } catch (error) {
    next(error)
  }
}
