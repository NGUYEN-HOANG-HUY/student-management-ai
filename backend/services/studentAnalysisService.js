import { getStudentAnalytics } from './analyticsService.js'
import { analyzeStudentWithAi } from './aiService.js'

function toSubjectSummary(subject) {
  return {
    subjectId: subject.subjectId,
    subjectCode: subject.subjectCode,
    subjectName: subject.subjectName,
    score: subject.totalScore,
    credits: subject.credits,
  }
}

function buildRiskReasons(analytics) {
  const reasons = []

  if (analytics.gpa < 2) {
    reasons.push(`GPA ${analytics.gpa.toFixed(2)} dưới ngưỡng 2.0.`)
  }
  if (analytics.failedSubjects > 0) {
    reasons.push(`${analytics.failedSubjects} môn có điểm dưới 5.0.`)
  }
  if (analytics.trend === 'declining') {
    reasons.push('GPA học kỳ gần nhất đang giảm so với học kỳ trước.')
  }
  if (analytics.riskLevel === 'LOW' && reasons.length === 0) {
    reasons.push('Chưa phát hiện dấu hiệu rủi ro đáng kể từ dữ liệu điểm hiện có.')
  }

  return reasons
}

export async function analyzeStudentPerformance(database, studentId) {
  const analytics = await getStudentAnalytics(database, studentId)
  if (!analytics) return null
  if (!analytics.scores.length) {
    return { noAcademicData: true, student: analytics.student }
  }

  const aiResult = await analyzeStudentWithAi(database, studentId)
  const aiAnalysis = aiResult.analysis

  return {
    student: {
      id: analytics.student.id,
      name: analytics.student.fullName,
      className: analytics.student.className,
    },
    academic: {
      gpa: analytics.gpa,
      classification: analytics.classification,
      totalCredits: analytics.totalCredits,
      completedCredits: analytics.completedCredits,
      passedSubjects: analytics.passedSubjects,
      failedSubjects: analytics.failedSubjects,
      semesterAverages: analytics.semesterAverages,
      trend: analytics.trend.toUpperCase(),
    },
    strengths: analytics.strongSubjects.map(toSubjectSummary),
    weakSubjects: analytics.weakSubjects.map(toSubjectSummary),
    subjectsNeedImprovement: analytics.watchSubjects.map(toSubjectSummary),
    prioritySubjects: (aiAnalysis.prioritySubjects || []).map((subject) => ({
      subject: subject.subject,
      subjectCode: subject.subjectCode,
      score: subject.score,
      priority: subject.priority,
      reason: subject.reason,
    })),
    risk: {
      level: analytics.riskLevel,
      reasons: buildRiskReasons(analytics),
    },
    aiAnalysis: {
      summary: aiAnalysis.summary,
      strengths: aiAnalysis.strengths,
      weaknesses: aiAnalysis.weaknesses,
      recommendations: aiAnalysis.recommendations,
      studyPlan: aiAnalysis.studyPlan,
      source: aiAnalysis.source,
      fallback: aiAnalysis.fallback,
      fallbackReason: aiAnalysis.fallbackReason,
    },
  }
}
