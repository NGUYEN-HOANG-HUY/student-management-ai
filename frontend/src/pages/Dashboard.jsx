import { useEffect, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import StatCard from '../components/StatCard'
import api from '../services/api'

const emptyDashboard = {
  totals: { students: 0, subjects: 0, averageGpa: 0, atRiskStudents: 0 },
  gpaTrend: [],
  scoreDistribution: [],
  topWeakSubjects: [],
  atRiskStudents: [],
}

function Dashboard() {
  const [dashboard, setDashboard] = useState(emptyDashboard)
  const [status, setStatus] = useState('loading')
  const [classes, setClasses] = useState([])
  const [selectedClassId, setSelectedClassId] = useState('')
  const [classAnalysis, setClassAnalysis] = useState(null)
  const [classAiStatus, setClassAiStatus] = useState('idle')
  const user = JSON.parse(localStorage.getItem('student-ai-user') || 'null')
  const canAnalyzeClass = user?.role === 'admin' || user?.role === 'teacher'
  const isStudent = user?.role === 'student'
  const [studentAnalysis, setStudentAnalysis] = useState(null)
  const [studentAiStatus, setStudentAiStatus] = useState('loading')

  async function loadStudentAnalysis() {
    setStudentAiStatus('loading')
    try {
      const { data } = await api.get('/student/ai-analysis')
      setStudentAnalysis(data.data)
      setStudentAiStatus('success')
      return data.data
    } catch (error) {
      setStudentAiStatus(error.response?.status === 404 ? 'empty' : 'error')
      throw error
    }
  }

  useEffect(() => {
    if (isStudent) {
      Promise.all([api.get('/student/dashboard'), api.get('/student/ai-analysis')])
        .then(([, analysisResponse]) => {
          const analysis = analysisResponse.data.data
          setStudentAnalysis(analysis)
          setStudentAiStatus('success')
          setDashboard({
            totals: {
              students: 1,
              subjects: analysis.academic.passedSubjects + analysis.academic.failedSubjects,
              averageGpa: analysis.academic.gpa,
              atRiskStudents: analysis.risk.level === 'LOW' ? 0 : 1,
            },
            gpaTrend: analysis.academic.semesterAverages,
            scoreDistribution: [],
            topWeakSubjects: analysis.weakSubjects.map((subject) => ({
              subjectName: subject.subjectName,
              count: 1,
            })),
            atRiskStudents: [],
          })
          setStatus('success')
          return
        })
        .catch((error) => {
          setStudentAiStatus(error.response?.status === 404 ? 'empty' : 'error')
          setStatus('error')
        })
      return
    }

    api.get('/analytics/dashboard')
      .then(({ data }) => {
        setDashboard(data.data)
        setStatus('success')
      })
      .catch(() => setStatus('error'))
  }, [isStudent])

  useEffect(() => {
    if (!canAnalyzeClass) return
    api.get('/classes')
      .then(({ data }) => {
        setClasses(data.data)
        if (data.data.length) setSelectedClassId(String(data.data[0].id))
      })
      .catch(() => setClasses([]))
  }, [canAnalyzeClass])

  const analyzeClass = async () => {
    if (!selectedClassId) return
    setClassAiStatus('loading')
    try {
      const { data } = await api.post(`/ai/analyze-class/${selectedClassId}`)
      setClassAnalysis(data.data)
      setClassAiStatus('success')
    } catch {
      setClassAiStatus('error')
    }
  }

  if (status === 'loading') {
    return <main className="dashboard-state">Đang tải dữ liệu dashboard...</main>
  }

  if (status === 'error') {
    return <main className="dashboard-state error-state">Không thể tải dữ liệu dashboard.</main>
  }

  const { totals } = dashboard

  return (
    <main className="dashboard-shell">
      <header className="dashboard-header">
        <div>
          <div className="eyebrow">STUDENT MANAGEMENT AI</div>
          <h1>Dashboard học tập</h1>
          <p>{isStudent ? 'Theo dõi kết quả và khuyến nghị học tập cá nhân.' : 'Theo dõi chất lượng học tập và các tín hiệu cần hỗ trợ.'}</p>
        </div>
        <div className="system-badge"><span /> Dữ liệu local</div>
      </header>

      <section className="stats-grid" aria-label="Tổng quan">
        <StatCard label="Tổng sinh viên" value={totals.students} />
        <StatCard label="Tổng môn học" value={totals.subjects} tone="purple" />
        <StatCard label="GPA trung bình" value={totals.averageGpa.toFixed(2)} tone="green" />
        <StatCard label="Sinh viên nguy cơ" value={totals.atRiskStudents} tone="red" />
      </section>

      {isStudent && studentAnalysis && (
        <section className="panel ai-class-panel">
          <div className="panel-heading">
            <div>
              <h2>AI PHÂN TÍCH KẾT QUẢ HỌC TẬP</h2>
              <p>{studentAnalysis.aiAnalysis.source === 'RULE_BASED' ? 'Ollama chưa khả dụng - đang dùng phân tích luật.' : 'Phân tích từ Ollama local.'}</p>
            </div>
            <div className="toolbar-actions">
              <strong className={`risk-badge ${studentAnalysis.risk.level.toLowerCase()}`}>{studentAnalysis.risk.level}</strong>
              <button className="secondary-button" type="button" onClick={loadStudentAnalysis} disabled={studentAiStatus === 'loading'}>
                {studentAiStatus === 'loading' ? 'AI đang phân tích...' : 'Phân tích lại'}
              </button>
            </div>
          </div>
          <div className="student-ai-grid">
            <div className="student-ai-card"><span>GPA hiện tại</span><strong>{studentAnalysis.academic.gpa.toFixed(2)} / 4</strong></div>
            <div className="student-ai-card"><span>Xu hướng học tập</span><strong>{trendLabel(studentAnalysis.academic.trend)}</strong></div>
            <div className="student-ai-card"><span>Đánh giá nguy cơ</span><strong>{riskLabel(studentAnalysis.risk.level)}</strong></div>
          </div>
          <div className="student-ai-section">
            <h3>Nhận xét từ AI</h3>
            <p className="analysis-summary">{studentAnalysis.aiAnalysis.summary}</p>
          </div>
          <div className="analysis-columns student-ai-section">
            <div>
              <h3>Điểm mạnh</h3>
              <SubjectList items={studentAnalysis.strengths} empty="Chưa có môn đạt ngưỡng điểm mạnh." />
            </div>
            <div>
              <h3>Cần cải thiện</h3>
              <SubjectList items={studentAnalysis.weakSubjects} empty="Chưa phát hiện môn dưới 5.0." showPriority />
            </div>
          </div>
          <div className="student-ai-section">
            <h3>Lý do rủi ro</h3>
            <List items={studentAnalysis.risk.reasons} empty="Chưa có lý do rủi ro." />
          </div>
          <div className="analysis-columns student-ai-section">
            <div>
              <h3>AI khuyến nghị</h3>
              <List items={studentAnalysis.aiAnalysis.recommendations.map((item) => `${item.title}: ${item.reason} ${item.action}`)} empty="Chưa có khuyến nghị." />
            </div>
            <div>
              <h3>Môn học cần ưu tiên</h3>
              {studentAnalysis.prioritySubjects.length ? (
                <ol>{studentAnalysis.prioritySubjects.map((item) => <li key={`${item.subject}-${item.priority}`}>{item.priority}. {item.subject} ({item.score})<small>{item.reason}</small></li>)}</ol>
              ) : <p className="empty-state">Hiện tại không có môn học cần ưu tiên đặc biệt.</p>}
            </div>
          </div>
          <div className="student-ai-section">
            <h3>Lộ trình học tập đề xuất</h3>
            {studentAnalysis.aiAnalysis.studyPlan.length ? (
              <div className="plan-list">{studentAnalysis.aiAnalysis.studyPlan.map((week) => <div className="plan-item" key={week.week}><strong>Tuần {week.week}</strong><span>{(week.subjects || []).join(', ')}</span><small>{(week.goals || []).join(' · ')} {(week.tasks || []).join(' · ')}</small></div>)}</div>
            ) : <p className="empty-state">Chưa có lộ trình học tập.</p>}
          </div>
        </section>
      )}
      {isStudent && studentAiStatus === 'error' && (
        <section className="panel ai-class-panel">
          <p className="form-error">Không thể phân tích kết quả học tập lúc này.</p>
          <button className="secondary-button" type="button" onClick={loadStudentAnalysis}>Thử lại</button>
        </section>
      )}
      {isStudent && studentAiStatus === 'empty' && (
        <section className="panel ai-class-panel"><p className="empty-state">Chưa có đủ dữ liệu học tập để AI phân tích.</p></section>
      )}

      <section className="charts-grid">
        <article className="panel chart-panel">
          <div className="panel-heading">
            <div>
              <h2>Xu hướng GPA</h2>
              <p>GPA trung bình theo học kỳ</p>
            </div>
          </div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dashboard.gpaTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="semesterName" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 4]} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="gpa" fill="#2563eb" radius={[6, 6, 0, 0]} name="GPA" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="panel chart-panel">
          <div className="panel-heading">
            <div>
              <h2>Phân bố điểm</h2>
              <p>Tổng hợp kết quả các môn đã có điểm</p>
            </div>
          </div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dashboard.scoreDistribution} layout="vertical" margin={{ left: 18, right: 12 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="label" width={112} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#7c3aed" radius={[0, 6, 6, 0]} name="Số môn" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      <section className="tables-grid">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <h2>Top môn yếu</h2>
              <p>Môn có nhiều kết quả dưới 5.0</p>
            </div>
          </div>
          {dashboard.topWeakSubjects.length ? (
            <div className="list-table">
              {dashboard.topWeakSubjects.map((subject) => (
                <div className="list-row" key={subject.subjectName}>
                  <span>{subject.subjectName}</span>
                  <strong>{subject.count} sinh viên</strong>
                </div>
              ))}
            </div>
          ) : <p className="empty-state">Chưa có môn yếu.</p>}
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <h2>Cần theo dõi</h2>
              <p>Sinh viên có tín hiệu nguy cơ học tập</p>
            </div>
          </div>
          {dashboard.atRiskStudents.length ? (
            <div className="list-table">
              {dashboard.atRiskStudents.map((student) => (
                <div className="list-row" key={student.id}>
                  <span>{student.fullName}<small>{student.studentCode}</small></span>
                  <strong className="risk-label">{student.riskLevel} · GPA {student.gpa.toFixed(2)}</strong>
                </div>
              ))}
            </div>
          ) : <p className="empty-state">Chưa có sinh viên nguy cơ.</p>}
        </article>
      </section>

      {canAnalyzeClass && (
        <section className="panel ai-class-panel">
          <div className="panel-heading">
            <div>
              <h2>AI phân tích lớp</h2>
              <p>Nhận diện môn khó và sinh viên cần được hỗ trợ.</p>
            </div>
            <div className="toolbar-actions">
              <select value={selectedClassId} onChange={(event) => setSelectedClassId(event.target.value)}>
                {classes.map((classItem) => (
                  <option key={classItem.id} value={classItem.id}>{classItem.code}</option>
                ))}
              </select>
              <button type="button" className="button button-primary" onClick={analyzeClass} disabled={!selectedClassId || classAiStatus === 'loading'}>
                {classAiStatus === 'loading' ? 'Đang phân tích...' : 'Phân tích bằng AI'}
              </button>
            </div>
          </div>
          {classAiStatus === 'error' && <p className="form-error">Không thể phân tích lớp. Vui lòng thử lại.</p>}
          {classAnalysis && (
            <div className="ai-class-result">
              <p className="ai-source-label">
                {classAnalysis.analysis.source === 'RULE_BASED' ? 'AI local không khả dụng - dùng khuyến nghị luật' : 'Phân tích từ Ollama local'}
              </p>
              <p>{classAnalysis.analysis.summary}</p>
              <div className="ai-metric-row">
                <strong>GPA: {classAnalysis.analytics.averageGpa.toFixed(2)}</strong>
                <strong>Đạt: {classAnalysis.analytics.passRate}%</strong>
                <strong>Nguy cơ: {classAnalysis.analytics.atRiskStudents}</strong>
              </div>
              <div className="ai-class-columns">
                <div>
                  <h3>Môn khó</h3>
                  <ul>{classAnalysis.analysis.hardestSubjects.map((subject) => <li key={subject.subject}>{subject.subject} ({subject.weakCount})</li>)}</ul>
                </div>
                <div>
                  <h3>Khuyến nghị</h3>
                  <ul>{classAnalysis.analysis.recommendations.map((item) => <li key={item.title}>{item.title}: {item.action}</li>)}</ul>
                </div>
              </div>
            </div>
          )}
        </section>
      )}
    </main>
  )
}

function trendLabel(trend) {
  return { IMPROVING: 'Đang tiến bộ', STABLE: 'Ổn định', DECLINING: 'Có dấu hiệu giảm' }[trend] || trend
}

function riskLabel(level) {
  return { LOW: 'Thấp', MEDIUM: 'Trung bình', HIGH: 'Cao' }[level] || level
}

function List({ items, empty }) {
  return items?.length ? <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="empty-state">{empty}</p>
}

function SubjectList({ items, empty, showPriority = false }) {
  return items?.length ? <ul>{items.map((item) => <li key={`${item.subjectName}-${item.score}`}>{item.subjectName} — {item.score}{showPriority && <small>Ưu tiên cao</small>}</li>)}</ul> : <p className="empty-state">{empty}</p>
}

export default Dashboard
