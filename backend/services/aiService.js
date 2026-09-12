import { z } from 'zod'
import { getClassAnalytics, getStudentAnalytics } from './analyticsService.js'
import { createRuleBasedRecommendation } from './recommendationService.js'

const aiResponseSchema = z.object({
  summary: z.string().trim().min(1),
  academicLevel: z.string().trim().min(1).optional(),
  gpa: z.coerce.number().min(0).max(4).optional(),
  trend: z.enum(['improving', 'stable', 'declining', 'insufficient_data']).optional(),
  strengths: z.array(z.object({
    subject: z.string().trim().min(1),
    score: z.coerce.number().min(0).max(10),
    reason: z.string().trim().min(1),
  })),
  weaknesses: z.array(z.object({
    subject: z.string().trim().min(1),
    score: z.coerce.number().min(0).max(10),
    reason: z.string().trim().min(1),
  })),
  riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  prioritySubjects: z.array(z.object({
    subject: z.string().trim().min(1),
    score: z.coerce.number().min(0).max(10),
    priority: z.coerce.number().int().positive(),
    reason: z.string().trim().min(1),
  })),
  recommendations: z.array(z.object({
    title: z.string().trim().min(1),
    reason: z.string().trim().min(1),
    action: z.string().trim().min(1),
  })).min(1),
  studyPlan: z.array(z.object({
    week: z.coerce.number().int().positive(),
    subjects: z.array(z.string().trim().min(1)),
    goals: z.array(z.string().trim().min(1)),
    tasks: z.array(z.string().trim().min(1)),
  })).length(4),
})

const classAiResponseSchema = z.object({
  summary: z.string().trim().min(1),
  classGpa: z.coerce.number().min(0).max(4),
  passRate: z.coerce.number().min(0).max(100),
  failRate: z.coerce.number().min(0).max(100),
  hardestSubjects: z.array(z.object({
    subject: z.string().trim().min(1),
    weakCount: z.coerce.number().int().nonnegative(),
    reason: z.string().trim().min(1),
  })),
  atRiskStudents: z.array(z.object({
    student: z.string().trim().min(1),
    gpa: z.coerce.number().min(0).max(4),
    riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH']),
    reason: z.string().trim().min(1),
  })),
  recommendations: z.array(z.object({
    title: z.string().trim().min(1),
    reason: z.string().trim().min(1),
    action: z.string().trim().min(1),
  })).min(1),
})

const DEFAULT_TIMEOUT_MS = 15000
const DEFAULT_RETRIES = 2

function getOllamaConfig() {
  const timeoutMs = Number(process.env.AI_TIMEOUT_MS)
  const retries = Number(process.env.AI_RETRIES)

  return {
    url: (process.env.OLLAMA_URL || 'http://127.0.0.1:11434').replace(/\/+$/, ''),
    model: process.env.OLLAMA_MODEL || 'gemma:2b',
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : DEFAULT_TIMEOUT_MS,
    retries: Number.isInteger(retries) && retries >= 0 ? retries : DEFAULT_RETRIES,
  }

}

function createAiInput(analytics) {
  const subjectSummary = (subjects) => subjects
    .slice()
    .sort((first, second) => first.totalScore - second.totalScore)
    .slice(0, 3)
    .map((subject) => ({
      name: subject.subjectName,
      score: subject.totalScore,
    }))

  return {
    student: {
      fullName: analytics.student.fullName,
    },
    gpa: analytics.gpa,
    trend: analytics.trend,
    riskLevel: analytics.riskLevel,
    weakSubjects: subjectSummary(analytics.weakSubjects),
    strongSubjects: subjectSummary(analytics.strongSubjects),
  }
}

function buildPrompt(input, retry = false) {
  const retryInstruction = retry
    ? 'Lần trước JSON không hợp lệ. Chỉ trả về JSON hợp lệ, không markdown, không giải thích ngoài JSON. '
    : ''

  return `${retryInstruction}Bạn là cố vấn học tập. Phân tích dữ liệu sinh viên dưới đây và trả về đúng một JSON object.
Không bịa thêm dữ liệu. riskLevel chỉ nhận LOW, MEDIUM hoặc HIGH. studyPlan gồm 4 tuần.
Mỗi recommendation phải có thứ tự ưu tiên, môn/điểm liên quan, lý do từ dữ liệu, mục tiêu điểm và số buổi học mỗi tuần. Không dùng lời khuyên chung chung.
Schema bắt buộc:
{"summary":"string","academicLevel":"string","gpa":0,"trend":"improving|stable|declining|insufficient_data","strengths":[{"subject":"string","score":0,"reason":"string"}],"weaknesses":[{"subject":"string","score":0,"reason":"string"}],"riskLevel":"LOW|MEDIUM|HIGH","prioritySubjects":[{"subject":"string","score":0,"priority":1,"reason":"string"}],"recommendations":[{"title":"string","reason":"string","action":"string"}],"studyPlan":[{"week":1,"subjects":["string"],"goals":["string"],"tasks":["string"]}]}
Dữ liệu:
${JSON.stringify(input)}`
}

function extractJson(text) {
  const cleanedText = text.trim().replace(/^```json\s*/i, '').replace(/```$/i, '').trim()
  const start = cleanedText.indexOf('{')
  const end = cleanedText.lastIndexOf('}')
  if (start < 0 || end <= start) {
    throw new SyntaxError('Ollama response does not contain a JSON object')
  }
  return JSON.parse(cleanedText.slice(start, end + 1))
}

async function requestOllama(prompt, config) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs)

  try {
    const response = await fetch(`${config.url}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.model,
        prompt,
        stream: false,
        format: 'json',
        options: {
          temperature: 0.2,
          num_predict: 900,
        },
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`Ollama returned HTTP ${response.status}`)
    }

    const payload = await response.json()
    if (typeof payload.response !== 'string' || !payload.response.trim()) {
      throw new Error('Ollama response is missing generated text')
    }
    return payload.response
  } finally {
    clearTimeout(timeout)
  }
}

async function requestValidatedAnalysis(input) {
  const config = getOllamaConfig()
  let lastError

  for (let attempt = 0; attempt <= config.retries; attempt += 1) {
    try {
      const responseText = await requestOllama(buildPrompt(input, attempt > 0), config)
      return aiResponseSchema.parse(extractJson(String(responseText)))
    } catch (error) {
      if (!(error instanceof SyntaxError) && error.name !== 'ZodError') {
        throw error
      }
      lastError = error
    }
  }

  throw lastError
}

function buildClassPrompt(input, retry = false) {
  const retryInstruction = retry
    ? 'Lần trước JSON không hợp lệ. Chỉ trả về JSON hợp lệ, không markdown. '
    : ''
  return `${retryInstruction}Bạn là cố vấn học tập cho giảng viên. Phân tích dữ liệu tổng hợp của lớp và trả về đúng một JSON object.
Không bịa dữ liệu. Tập trung vào môn có nhiều điểm dưới 5 và sinh viên có nguy cơ.
Schema bắt buộc:
{"summary":"string","classGpa":0,"passRate":0,"failRate":0,"hardestSubjects":[{"subject":"string","weakCount":0,"reason":"string"}],"atRiskStudents":[{"student":"string","gpa":0,"riskLevel":"LOW|MEDIUM|HIGH","reason":"string"}],"recommendations":[{"title":"string","reason":"string","action":"string"}]}
Dữ liệu:
${JSON.stringify(input)}`
}

async function requestValidatedClassAnalysis(input) {
  const config = getOllamaConfig()
  let lastError

  for (let attempt = 0; attempt <= config.retries; attempt += 1) {
    try {
      const responseText = await requestOllama(buildClassPrompt(input, attempt > 0), config)
      return classAiResponseSchema.parse(extractJson(String(responseText)))
    } catch (error) {
      if (!(error instanceof SyntaxError) && error.name !== 'ZodError') throw error
      lastError = error
    }
  }

  throw lastError
}

function makeFallback(analytics, error) {
  return {
    ...createRuleBasedRecommendation(analytics),
    source: 'RULE_BASED',
    fallback: true,
    fallbackReason: error.name === 'AbortError'
      ? 'Ollama timeout'
      : 'Ollama không khả dụng hoặc trả về JSON không hợp lệ',
  }
}

export async function analyzeStudentWithAi(database, studentId) {
  const analytics = await getStudentAnalytics(database, studentId)
  if (!analytics) return null

  const input = createAiInput(analytics)
  try {
    const analysis = await requestValidatedAnalysis(input)
    return {
      student: analytics.student,
      analytics: {
        gpa: analytics.gpa,
        classification: analytics.classification,
        trend: analytics.trend,
        completedCredits: analytics.completedCredits,
        failedSubjects: analytics.failedSubjects,
      },
      analysis: {
        ...analysis,
        academicLevel: analysis.academicLevel || analytics.classification,
        gpa: analytics.gpa,
        trend: analysis.trend || analytics.trend,
        source: 'OLLAMA_LOCAL',
        fallback: false,
      },
    }

  } catch (error) {
    console.warn(`AI fallback for student ${studentId}: ${error.message}`)
    return {
      student: analytics.student,
      analytics: {
        gpa: analytics.gpa,
        classification: analytics.classification,
        trend: analytics.trend,
        completedCredits: analytics.completedCredits,
        failedSubjects: analytics.failedSubjects,
      },
      analysis: makeFallback(analytics, error),
    }
  }
}

function createClassFallback(analytics, error) {
  return {
    source: 'RULE_BASED',
    fallback: true,
    fallbackReason: error.name === 'AbortError'
      ? 'Ollama timeout'
      : 'Ollama không khả dụng hoặc trả về JSON không hợp lệ',
    summary: `Lớp ${analytics.class.code} có GPA trung bình ${analytics.totals.averageGpa.toFixed(2)}, tỷ lệ đạt ${analytics.totals.passRate}%.`,
    classGpa: analytics.totals.averageGpa,
    passRate: analytics.totals.passRate,
    failRate: analytics.totals.failRate,
    hardestSubjects: analytics.hardestSubjects.map((subject) => ({
      ...subject,
      reason: `${subject.weakCount} kết quả dưới ngưỡng đạt.`,
    })),
    atRiskStudents: analytics.atRiskStudents.map((student) => ({
      student: student.fullName,
      gpa: student.gpa,
      riskLevel: student.riskLevel,
      reason: `${student.failedSubjects} môn chưa đạt.`,
    })),
    recommendations: [
      {
        title: 'Tổ chức ôn tập theo môn yếu',
        reason: analytics.hardestSubjects.length
          ? `${analytics.hardestSubjects[0].subject} có nhiều kết quả dưới 5 nhất.`
          : 'Chưa phát hiện môn có nhiều điểm yếu.',
        action: 'Tổ chức buổi ôn tập và theo dõi lại kết quả sau mỗi tuần.',
      },
      {
        title: 'Theo dõi sinh viên có nguy cơ',
        reason: `${analytics.totals.atRiskStudents} sinh viên đang ở mức MEDIUM hoặc HIGH.`,
        action: 'Lập danh sách hỗ trợ cá nhân và trao đổi với từng sinh viên.',
      },
    ],
  }
}

export async function analyzeClassWithAi(database, classId) {
  const analytics = await getClassAnalytics(database, classId)
  if (!analytics) return null

  const input = {
    class: analytics.class,
    summary: analytics.totals,
    hardestSubjects: analytics.hardestSubjects,
    atRiskStudents: analytics.atRiskStudents.map((student) => ({
      student: student.fullName,
      gpa: student.gpa,
      riskLevel: student.riskLevel,
      failedSubjects: student.failedSubjects,
    })),
  }

  try {
    const analysis = await requestValidatedClassAnalysis(input)
    return {
      class: analytics.class,
      analytics: analytics.totals,
      analysis: { ...analysis, source: 'OLLAMA_LOCAL', fallback: false },
    }
  } catch (error) {
    console.warn(`AI class fallback for class ${classId}: ${error.message}`)
    return {
      class: analytics.class,
      analytics: analytics.totals,
      analysis: createClassFallback(analytics, error),
    }
  }
}
