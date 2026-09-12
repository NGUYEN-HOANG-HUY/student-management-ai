import { useEffect, useState } from 'react'
import api from '../services/api'

const emptyForm = { subjectCode: '', subjectName: '', credits: 3, prerequisiteSubjectId: '' }

function fetchSubjects() {
  return api.get('/subjects')
}

function Subjects() {
  const [subjects, setSubjects] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')

  async function loadSubjects() {
    const { data } = await fetchSubjects()
    setSubjects(data.data)
  }

  useEffect(() => {
    fetchSubjects()
      .then(({ data }) => setSubjects(data.data))
      .catch(() => setError('Không thể tải danh sách môn học'))
  }, [])

  function changeForm(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  function editSubject(subject) {
    setEditingId(subject.id)
    setForm({
      subjectCode: subject.subjectCode,
      subjectName: subject.subjectName,
      credits: subject.credits,
      prerequisiteSubjectId: subject.prerequisiteSubjectId || '',
    })
  }

  function resetForm() {
    setEditingId(null)
    setForm(emptyForm)
  }

  async function submit(event) {
    event.preventDefault()
    setError('')
    try {
      const payload = { ...form, credits: Number(form.credits), prerequisiteSubjectId: form.prerequisiteSubjectId ? Number(form.prerequisiteSubjectId) : null }
      if (editingId) await api.put(`/subjects/${editingId}`, payload)
      else await api.post('/subjects', payload)
      resetForm()
      await loadSubjects()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể lưu môn học')
    }
  }

  async function remove(subjectId) {
    if (!window.confirm('Bạn có chắc muốn xóa môn học này?')) return
    try {
      await api.delete(`/subjects/${subjectId}`)
      await loadSubjects()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể xóa môn học')
    }
  }

  return (
    <main className="management-shell">
      <header className="management-header"><div><div className="eyebrow">ACADEMIC CATALOG</div><h1>Môn học</h1><p>Quản lý môn học, tín chỉ và môn tiên quyết.</p></div></header>
      <section className="management-grid">
        <form className="panel student-form" onSubmit={submit}>
          <div className="panel-heading"><div><h2>{editingId ? 'Sửa môn học' : 'Thêm môn học'}</h2><p>Thông tin môn học.</p></div></div>
          <label>Mã môn<input name="subjectCode" value={form.subjectCode} onChange={changeForm} required /></label>
          <label>Tên môn<input name="subjectName" value={form.subjectName} onChange={changeForm} required /></label>
          <label>Số tín chỉ<input name="credits" type="number" min="1" max="6" value={form.credits} onChange={changeForm} required /></label>
          <label>Môn tiên quyết<select name="prerequisiteSubjectId" value={form.prerequisiteSubjectId} onChange={changeForm}><option value="">Không có</option>{subjects.filter((subject) => subject.id !== editingId).map((subject) => <option key={subject.id} value={subject.id}>{subject.subjectCode}</option>)}</select></label>
          {error && <p className="form-error">{error}</p>}
          <div className="form-actions"><button className="primary-button" type="submit">{editingId ? 'Lưu thay đổi' : 'Thêm môn'}</button>{editingId && <button className="secondary-button" type="button" onClick={resetForm}>Hủy</button>}</div>
        </form>
        <section className="panel students-panel"><div className="panel-heading"><div><h2>Danh sách môn học</h2><p>{subjects.length} môn học</p></div></div><div className="student-table-wrap"><table className="student-table"><thead><tr><th>Mã</th><th>Tên môn</th><th>Tín chỉ</th><th>Tiên quyết</th><th /></tr></thead><tbody>{subjects.map((subject) => <tr key={subject.id}><td>{subject.subjectCode}</td><td><strong>{subject.subjectName}</strong></td><td>{subject.credits}</td><td>{subject.prerequisiteSubjectCode || '—'}</td><td><div className="row-actions"><button type="button" onClick={() => editSubject(subject)}>Sửa</button><button type="button" className="danger-button" onClick={() => remove(subject.id)}>Xóa</button></div></td></tr>)}</tbody></table></div></section>
      </section>
    </main>
  )
}

export default Subjects
