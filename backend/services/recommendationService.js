import { RISK_THRESHOLDS, getStudentAnalytics } from './analyticsService.js'

function subjectLabel(subject) {
  return `${subject.subjectCode} - ${subject.subjectName} (${subject.totalScore.toFixed(2)})`
}

function subjectDetail(subject, reason) {
  return {
    subject: subject.subjectName,
    subjectCode: subject.subjectCode,
    score: subject.totalScore,
    reason,
  }
}

function targetScore(subject) {
  return Math.min(10, Math.max(6.5, Math.ceil((subject.totalScore + 1) * 2) / 2))
}

function buildSummary(analytics) {
  if (!analytics.scores.length) {
    return 'Sinh viên chưa có dữ liệu điểm để phân tích.'
  }

  const riskText = analytics.riskLevel === 'HIGH'
    ? 'cần được hỗ trợ sớm'
    : analytics.riskLevel === 'MEDIUM'
      ? 'cần được theo dõi'
      : 'đang duy trì kết quả ổn định'

  return `GPA hiện tại là ${analytics.gpa.toFixed(2)}, xếp loại ${analytics.classification}. `
    + `Kết quả học tập ${riskText}; xu hướng gần nhất ${analytics.trend}.`
}

function buildRecommendations(analytics) {
  const recommendations = []
  const prioritySubjects = [...analytics.weakSubjects, ...analytics.watchSubjects]
    .sort((first, second) => first.totalScore - second.totalScore)
    .slice(0, 3)

  prioritySubjects.forEach((subject, index) => {
    const target = targetScore(subject)
    const reason = subject.totalScore < RISK_THRESHOLDS.weakScore
      ? `đang dưới ngưỡng đạt ${RISK_THRESHOLDS.weakScore}`
      : `đang ở mức cần theo dõi dưới ${RISK_THRESHOLDS.watchScore}`
    recommendations.push({
      title: `Ưu tiên ${index + 1}: ${subject.subjectName}`,
      reason: `${subjectLabel(subject)} ${reason}.`,
      action: `Đạt ít nhất ${target.toFixed(1)} trong lần đánh giá kế tiếp bằng 3 buổi ôn mỗi tuần.`,
    })
  })

  if (analytics.trend === 'declining') {
    const latest = analytics.semesterAverages.at(-1)
    const previous = analytics.semesterAverages.at(-2)
    recommendations.push({
      title: 'Phục hồi xu hướng GPA',
      reason: `GPA ${latest.gpa.toFixed(2)} ở ${latest.semesterName} giảm so với ${previous.semesterName} (${previous.gpa.toFixed(2)}).`,
      action: 'Tăng tối thiểu 2 giờ học các môn ưu tiên mỗi tuần và đánh giá lại cuối tuần.',
    })
  }

  if (!recommendations.length && analytics.scores.length) {
    const strongest = analytics.strongSubjects[0] || analytics.scores[0]
    recommendations.push({
      title: `Duy trì ${strongest.subjectName}`,
      reason: `${subjectLabel(strongest)} đang là kết quả tốt nhất hiện tại.`,
      action: `Giữ lịch ôn hiện tại và đặt mục tiêu GPA kỳ tới tối thiểu ${(analytics.gpa + 0.2).toFixed(2)}.`,
    })
  }

  if (!recommendations.length) {
    recommendations.push({
      title: 'Bổ sung dữ liệu học tập',
      reason: 'Chưa có điểm để xác định môn ưu tiên.',
      action: 'Cập nhật ít nhất một kết quả học tập trước khi lập kế hoạch cá nhân.',
    })
  }

  return recommendations
}

function buildStudyPlan(analytics) {
  const prioritySubjects = [...analytics.weakSubjects, ...analytics.watchSubjects]
    .sort((first, second) => first.totalScore - second.totalScore)
  const firstSubjects = prioritySubjects.slice(0, 2).map(subjectLabel)
  const strongSubject = analytics.strongSubjects[0]
  const target = prioritySubjects[0] ? targetScore(prioritySubjects[0]).toFixed(1) : null

  return [
    {
      week: 1,
      subjects: firstSubjects,
      goals: [target ? `Xác định lỗ hổng để nâng môn ưu tiên lên ${target}` : 'Xác định mục tiêu GPA kỳ tới từ dữ liệu điểm hiện có'],
      tasks: ['Xem lại đề cương và bài sai của từng môn', 'Lập danh sách tối đa 3 chủ đề còn yếu', 'Làm bài kiểm tra đầu vào'],
    },
    {
      week: 2,
      subjects: firstSubjects,
      goals: [target ? `Luyện dạng bài trọng tâm, hướng tới ${target} điểm` : 'Củng cố các dạng bài thường xuất hiện trong kỳ đánh giá'],
      tasks: ['Học 3 buổi, mỗi buổi 60 phút', 'Hoàn thành tối thiểu 2 bộ bài tập theo môn ưu tiên', 'Tự kiểm tra cuối tuần'],
    },
    {
      week: 3,
      subjects: firstSubjects,
      goals: ['Giảm lỗi sai lặp lại và kiểm tra tiến độ bằng điểm số'],
      tasks: ['Chữa lại toàn bộ bài sai', 'Nhờ giảng viên hoặc bạn học giải đáp phần chưa hiểu', 'Làm một đề mô phỏng và ghi điểm đạt được'],
    },
    {
      week: 4,
      subjects: strongSubject ? [subjectLabel(strongSubject), ...firstSubjects] : firstSubjects,
      goals: ['Đánh giá tiến bộ bằng bài kiểm tra có chấm điểm và củng cố trước kỳ thi'],
      tasks: ['Làm bài đánh giá cuối kỳ kế hoạch', 'So sánh điểm với tuần 1 và mục tiêu đã đặt', 'Điều chỉnh lịch học tháng tiếp theo theo môn chưa đạt mục tiêu'],
    },
  ]
}

export function createRuleBasedRecommendation(analytics) {
  const weaknesses = analytics.weakSubjects.map((subject) => subjectDetail(
    subject,
    `Điểm ${subject.totalScore.toFixed(2)} dưới ngưỡng đạt ${RISK_THRESHOLDS.weakScore}.`,
  ))
  const strengths = analytics.strongSubjects.map((subject) => subjectDetail(
    subject,
    `Điểm ${subject.totalScore.toFixed(2)} đạt từ ngưỡng điểm mạnh ${RISK_THRESHOLDS.strongScore}.`,
  ))
  const prioritySubjects = [...analytics.weakSubjects, ...analytics.watchSubjects]
    .sort((first, second) => first.totalScore - second.totalScore)
    .slice(0, 3)
    .map((subject, index) => ({
      ...subjectDetail(
        subject,
        subject.totalScore < RISK_THRESHOLDS.weakScore
          ? `Ưu tiên vì đang dưới ngưỡng đạt ${RISK_THRESHOLDS.weakScore}.`
          : `Ưu tiên theo dõi vì điểm dưới ${RISK_THRESHOLDS.watchScore}.`,
      ),
      priority: index + 1,
    }))

  return {
    source: 'RULE_BASED',
    summary: buildSummary(analytics),
    academicLevel: analytics.classification,
    gpa: analytics.gpa,
    trend: analytics.trend,
    strengths: strengths.length ? strengths : ['Chưa có môn đạt từ 8.0 để xác định điểm mạnh'],
    weaknesses: weaknesses.length ? weaknesses : ['Chưa phát hiện môn dưới 6.5 cần ưu tiên cải thiện'],
    riskLevel: analytics.riskLevel,
    prioritySubjects,
    recommendations: buildRecommendations(analytics),
    studyPlan: buildStudyPlan(analytics),
    reasons: [
      `GPA ${analytics.gpa.toFixed(2)} được so sánh với ngưỡng nguy cơ ${RISK_THRESHOLDS.highGpa} và ${RISK_THRESHOLDS.mediumGpa}.`,
      `${analytics.failedSubjects} môn dưới ${RISK_THRESHOLDS.weakScore} và ${analytics.watchSubjects.length} môn trong nhóm cần theo dõi.`,
      `Xu hướng điểm hiện tại được xác định là ${analytics.trend}.`,
    ],
  }
}

export async function getRuleBasedRecommendation(database, studentId) {
  const analytics = await getStudentAnalytics(database, studentId)
  if (!analytics) return null
  return {
    student: analytics.student,
    analytics: {
      gpa: analytics.gpa,
      classification: analytics.classification,
      trend: analytics.trend,
      completedCredits: analytics.completedCredits,
      failedSubjects: analytics.failedSubjects,
    },
    recommendation: createRuleBasedRecommendation(analytics),
  }
}
