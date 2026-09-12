import { analyzeClassWithAi, analyzeStudentWithAi } from '../services/aiService.js'

export async function recommendStudent(request, response, next) {
  try {
    const result = await analyzeStudentWithAi(
      request.app.get('database'),
      request.params.studentId,
    )

    if (!result) {
      return response.status(404).json({ success: false, message: 'Không tìm thấy sinh viên' })
    }

    response.json({ success: true, data: { ...result, recommendation: result.analysis } })
  } catch (error) {
    next(error)
  }
}

export async function analyzeStudent(request, response, next) {
  try {
    const result = await analyzeStudentWithAi(
      request.app.get('database'),
      request.params.studentId,
    )

    if (!result) {
      return response.status(404).json({ success: false, message: 'Không tìm thấy sinh viên' })
    }

    response.json({ success: true, data: result })
  } catch (error) {
    next(error)
  }
}

export async function analyzeClass(request, response, next) {
  try {
    const result = await analyzeClassWithAi(
      request.app.get('database'),
      request.params.classId,
    )
    if (!result) {
      return response.status(404).json({ success: false, message: 'Không tìm thấy lớp' })
    }
    response.json({ success: true, data: result })
  } catch (error) {
    next(error)
  }
}
