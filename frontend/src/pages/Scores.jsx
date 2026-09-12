import { useEffect, useState } from 'react'
import api from '../services/api'
import { getCurrentUser } from '../services/auth'

const emptyForm = { studentId: '', subjectId: '', semesterId: '', processScore: '', midtermScore: '', finalScore: '' }

function Scores() {
  const user = getCurrentUser()
  const canDeleteScores = user?.role === 'admin'
  const [students, setStudents] = useState([])
  const [subjects, setSubjects] = useState([])
  const [semesters, setSemesters] = useState([])
  const [scores, setScores] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingScoreId, setEditingScoreId] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([api.get('/students'), api.get('/subjects'), api.get('/semesters')])
      .then(([studentResponse, subjectResponse, semesterResponse]) => {
        setStudents(studentResponse.data.data)
        setSubjects(subjectResponse.data.data)
        setSemesters(semesterResponse.data.data)
        setForm((current) => ({ ...current, semesterId: semesterResponse.data.data[0]?.id || '' }))
      })
      .catch(() => setError('Không thể tải dữ liệu nhập điểm'))
  }, [])

  async function selectStudent(event) {
    const studentId = event.target.value
    setForm((current) => ({ ...current, studentId, subjectId: '' }))
    if (!studentId) return setScores([])
    try {
      const { data } = await api.get(`/scores/student/${studentId}`)
      setScores(data.data)
    } catch {
      setError('Không thể tải điểm của sinh viên')
    }
  }

  function changeForm(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  function startEdit(score) {
    setEditingScoreId(score.id)
    setForm((current) => ({
      ...current,
      studentId: String(score.studentId),
      subjectId: String(score.subjectId),
      semesterId: String(score.semesterId),
      processScore: String(score.processScore),
      midtermScore: String(score.midtermScore),
      finalScore: String(score.finalScore),
    }))
  }

  function resetScoreForm() {
    setEditingScoreId(null)
    setForm((current) => ({
      ...current,
      subjectId: '',
      processScore: '',
      midtermScore: '',
      finalScore: '',
    }))
  }

  async function submit(event) {
    event.preventDefault()
    setError('')
    try {
      const payload = {
        ...form,
        studentId: Number(form.studentId),
        subjectId: Number(form.subjectId),
        semesterId: Number(form.semesterId),
        processScore: Number(form.processScore),
        midtermScore: Number(form.midtermScore),
        finalScore: Number(form.finalScore),
      }
      if (editingScoreId) {
        await api.put(`/scores/${editingScoreId}`, payload)
      } else {
        await api.post('/scores', payload)
      }
      const { data } = await api.get(`/scores/student/${form.studentId}`)
      setScores(data.data)
      resetScoreForm()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể lưu điểm')
    }
  }

  async function remove(scoreId) {
    try {
      await api.delete(`/scores/${scoreId}`)
      const { data } = await api.get(`/scores/student/${form.studentId}`)
      setScores(data.data)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể xóa điểm')
    }
  }

  return (
    <main className="management-shell">
      <header className="management-header"><div><div className="eyebrow">ACADEMIC RESULTS</div><h1>Nhập điểm</h1><p>Ghi nhận kết quả và xem điểm đã tính của sinh viên.</p></div></header>
      <section className="management-grid">
        <form className="panel student-form" onSubmit={submit}>
          <div className="panel-heading"><div><h2>{editingScoreId ? 'Sửa điểm' : 'Thêm điểm'}</h2><p>Điểm tổng kết được tính tự động.</p></div></div>
          <label>Sinh viên<select name="studentId" value={form.studentId} onChange={selectStudent} required><option value="">Chọn sinh viên</option>{students.map((student) => <option key={student.id} value={student.id}>{student.studentCode} · {student.fullName}</option>)}</select></label>
          <label>Môn học<select name="subjectId" value={form.subjectId} onChange={changeForm} required><option value="">Chọn môn</option>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.subjectCode} · {subject.subjectName}</option>)}</select></label>
          <label>Học kỳ<select name="semesterId" value={form.semesterId} onChange={changeForm} required><option value="">Chọn học kỳ</option>{semesters.map((semester) => <option key={semester.id} value={semester.id}>{semester.name}</option>)}</select></label>
          <label>Điểm quá trình<input name="processScore" type="number" min="0" max="10" step="0.1" value={form.processScore} onChange={changeForm} required /></label>
          <label>Điểm giữa kỳ<input name="midtermScore" type="number" min="0" max="10" step="0.1" value={form.midtermScore} onChange={changeForm} required /></label>
          <label>Điểm cuối kỳ<input name="finalScore" type="number" min="0" max="10" step="0.1" value={form.finalScore} onChange={changeForm} required /></label>
          {error && <p className="form-error">{error}</p>}
          <div className="form-actions"><button className="primary-button" type="submit">{editingScoreId ? 'Lưu thay đổi' : 'Lưu điểm'}</button>{editingScoreId && <button className="secondary-button" type="button" onClick={resetScoreForm}>Hủy</button>}</div>
        </form>
        <section className="panel students-panel"><div className="panel-heading"><div><h2>Kết quả điểm</h2><p>{form.studentId ? `${scores.length} môn đã có điểm` : 'Chọn sinh viên để xem điểm'}</p></div></div>                <div className="student-table-wrap"><table className="student-table"><thead><tr><th>Môn</th><th>Quá trình</th><th>Giữa kỳ</th><th>Cuối kỳ</th><th>Tổng</th><th>Chữ</th><th /></tr></thead><tbody>{scores.map((score) => <tr key={score.id}><td><strong>{score.subjectCode}</strong><small>{score.subjectName}</small></td><td>{score.processScore}</td><td>{score.midtermScore}</td><td>{score.finalScore}</td><td><strong>{score.totalScore}</strong></td><td>{score.letterGrade}</td><td><div className="row-actions"><button type="button" onClick={() => startEdit(score)}>Sửa</button>{canDeleteScores && <button type="button" className="danger-button" onClick={() => remove(score.id)}>Xóa</button>}</div></td></tr>)}</tbody></table></div></section>
      </section>
    </main>
  )
}

export default Scores
