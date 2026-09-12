import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Link, useParams } from 'react-router-dom'
import api from '../services/api'

function StudentDetail() {
  const { studentId } = useParams()
  const [analytics, setAnalytics] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [analysisLoading, setAnalysisLoading] = useState(true)
  const [status, setStatus] = useState('loading')

  function analyzeWithAi() {
    setAnalysisLoading(true)
    api.post(`/ai/analyze/${studentId}`)
      .then(({ data }) => setAnalysis(data.data.analysis))
      .catch(() => setAnalysis({
        source: 'UNAVAILABLE',
        summary: 'AI local đang không khả dụng. Vui lòng thử lại sau.',
        strengths: [],
        weaknesses: [],
        prioritySubjects: [],
        recommendations: [],
        studyPlan: [],
      }))
      .finally(() => setAnalysisLoading(false))
  }

  useEffect(() => {
    api.get(`/analytics/student/${studentId}`)
      .then(({ data }) => {
        setAnalytics(data.data)
        setStatus('success')
      })
      .catch(() => setStatus('error'))

    api.post(`/ai/analyze/${studentId}`)
      .then(({ data }) => setAnalysis(data.data.analysis))
      .catch(() => setAnalysis({
        source: 'UNAVAILABLE',
        summary: 'AI local đang không khả dụng. Vui lòng thử lại sau.',
        strengths: [],
        weaknesses: [],
        prioritySubjects: [],
        recommendations: [],
        studyPlan: [],
      }))
      .finally(() => setAnalysisLoading(false))
  }, [studentId])

  if (status === 'loading') return <main className="dashboard-state">Đang tải hồ sơ sinh viên...</main>
  if (status === 'error') return <main className="dashboard-state error-state">Không thể tải hồ sơ sinh viên.</main>

  const { student } = analytics
  const subjects = analytics.scores.map((score) => ({ name: score.subjectCode, score: score.totalScore }))

  return (
    <main className="management-shell detail-shell">
      <Link className="back-link" to="/students">← Quay lại danh sách</Link>
      <header className="detail-header">
        <div><div className="eyebrow">STUDENT PROFILE</div><h1>{student.fullName}</h1><p>{student.studentCode} · {student.className} · {student.email}</p></div>
        <div className={`risk-badge ${analytics.riskLevel.toLowerCase()}`}>Nguy cơ {analytics.riskLevel}</div>
      </header>

      <section className="detail-stats">
        <div className="detail-stat"><span>GPA tích lũy</span><strong>{analytics.gpa.toFixed(2)}</strong></div>
        <div className="detail-stat"><span>Xếp loại</span><strong>{analytics.classification}</strong></div>
        <div className="detail-stat"><span>Tín chỉ đạt</span><strong>{analytics.completedCredits}</strong></div>
        <div className="detail-stat"><span>Môn chưa đạt</span><strong>{analytics.failedSubjects}</strong></div>
      </section>

      <section className="detail-grid">
        <article className="panel chart-panel"><div className="panel-heading"><div><h2>Điểm theo môn</h2><p>Thang điểm 10</p></div></div><div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><BarChart data={subjects}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" /><XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} /><YAxis domain={[0, 10]} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} /><Tooltip /><Bar dataKey="score" fill="#16a34a" radius={[6, 6, 0, 0]} name="Điểm" /></BarChart></ResponsiveContainer></div></article>
        <article className="panel">
          <div className="panel-heading">
            <div>
              <h2>AI phân tích</h2>
              <p>{analysis?.source === 'OLLAMA_LOCAL' ? 'Ollama local' : 'Rule-based fallback'}</p>
            </div>
            <div className="ai-heading-actions">
              {analysis && <span className="ai-status">{analysis.source}</span>}
              <button className="secondary-button" type="button" onClick={analyzeWithAi} disabled={analysisLoading}>
                {analysisLoading ? 'Đang phân tích...' : 'Phân tích bằng AI'}
              </button>
            </div>
          </div>
          {analysis ? (
            <>
              <div className="analysis-meta">
                <span>GPA: <strong>{analysis.gpa?.toFixed(2) || analytics.gpa.toFixed(2)}</strong></span>
                <span>Xu hướng: <strong>{analysis.trend || analytics.trend}</strong></span>
                <span>Risk: <strong>{analysis.riskLevel}</strong></span>
              </div>
              <p className="analysis-summary">{analysis.summary}</p>
              <div className="analysis-columns">
                <div>
                  <h3>Điểm mạnh</h3>
                  <ul>{analysis.strengths.map((item) => <li key={`${item.subject}-${item.score}`}>{item.subject} ({item.score})<small>{item.reason}</small></li>)}</ul>
                </div>
                <div>
                  <h3>Cần cải thiện</h3>
                  <ul>{analysis.weaknesses.map((item) => <li key={`${item.subject}-${item.score}`}>{item.subject} ({item.score})<small>{item.reason}</small></li>)}</ul>
                </div>
              </div>
              <div className="analysis-section">
                <h3>Môn ưu tiên</h3>
                <ol>{analysis.prioritySubjects.map((item) => <li key={`${item.subject}-${item.priority}`}>{item.subject} ({item.score})<small>{item.reason}</small></li>)}</ol>
              </div>
              <div className="analysis-section">
                <h3>Khuyến nghị cụ thể</h3>
                <ul>{analysis.recommendations.map((item) => <li key={item.title}><strong>{item.title}</strong><small>{item.reason} {item.action}</small></li>)}</ul>
              </div>
            </>
          ) : <p className="empty-state analysis-summary">Đang phân tích dữ liệu với AI local...</p>}
        </article>
      </section>

      <section className="detail-grid">
        <article className="panel"><div className="panel-heading"><div><h2>Bảng điểm</h2><p>{analytics.scores.length} môn đã có kết quả</p></div></div><div className="student-table-wrap"><table className="student-table"><thead><tr><th>Môn</th><th>Tổng kết</th><th>Chữ</th><th>Hệ 4</th><th>Trạng thái</th></tr></thead><tbody>{analytics.scores.map((score) => <tr key={score.id}><td><strong>{score.subjectCode}</strong><small>{score.subjectName}</small></td><td>{score.totalScore}</td><td>{score.letterGrade}</td><td>{score.gradePoint}</td><td>{score.status === 'failed' ? 'Chưa đạt' : 'Đạt'}</td></tr>)}</tbody></table></div></article>
        <article className="panel"><div className="panel-heading"><div><h2>Lộ trình 4 tuần</h2><p>Ưu tiên theo phân tích hiện tại</p></div></div>{analysis ? <div className="plan-list">{analysis.studyPlan.map((week) => <div className="plan-item" key={week.week}><strong>Tuần {week.week}</strong><span>{week.subjects.join(', ')}</span><small>{week.goals.join(' · ')} {week.tasks.join(' · ')}</small></div>)}</div> : <p className="empty-state analysis-summary">Lộ trình sẽ xuất hiện sau khi phân tích hoàn tất.</p>}</article>
      </section>
    </main>
  )
}

export default StudentDetail
