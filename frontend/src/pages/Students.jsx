import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { getCurrentUser } from '../services/auth'

const emptyForm = {
  studentCode: '',
  fullName: '',
  email: '',
  dateOfBirth: '',
  gender: 'female',
  classId: '',
}

function fetchStudentData(currentSearch) {
  return Promise.all([
    api.get('/students', { params: { search: currentSearch } }),
    api.get('/classes'),
  ])
}

function Students() {
  const user = getCurrentUser()
  const canManageStudents = user?.role === 'admin'
  const [students, setStudents] = useState([])
  const [classes, setClasses] = useState([])
  const [search, setSearch] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')

  async function loadData(currentSearch = search) {
    setStatus('loading')
    try {
      const [studentResponse, classResponse] = await fetchStudentData(currentSearch)
      setStudents(studentResponse.data.data)
      setClasses(classResponse.data.data)
      setStatus('success')
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể tải dữ liệu sinh viên')
      setStatus('error')
    }
  }

  useEffect(() => {
    fetchStudentData('')
      .then(([studentResponse, classResponse]) => {
        setStudents(studentResponse.data.data)
        setClasses(classResponse.data.data)
        setStatus('success')
      })
      .catch((requestError) => {
        setError(requestError.response?.data?.message || 'Không thể tải dữ liệu sinh viên')
        setStatus('error')
      })
  }, [])

  function handleChange(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  function startEdit(student) {
    setEditingId(student.id)
    setForm({
      studentCode: student.studentCode,
      fullName: student.fullName,
      email: student.email,
      dateOfBirth: student.dateOfBirth,
      gender: student.gender,
      classId: String(student.classId),
    })
  }

  function resetForm() {
    setEditingId(null)
    setForm(emptyForm)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    try {
      const payload = { ...form, classId: Number(form.classId) }
      if (editingId) {
        await api.put(`/students/${editingId}`, payload)
      } else {
        await api.post('/students', payload)
      }
      resetForm()
      await loadData()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể lưu sinh viên')
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Bạn có chắc muốn xóa sinh viên này?')) return
    try {
      await api.delete(`/students/${id}`)
      await loadData()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể xóa sinh viên')
    }
  }

  function handleSearch(event) {
    event.preventDefault()
    loadData(search)
  }

  return (
    <main className="management-shell">
      <header className="management-header">
        <div>
          <div className="eyebrow">DATA MANAGEMENT</div>
          <h1>Sinh viên</h1>
          <p>Quản lý hồ sơ và lớp học của sinh viên.</p>
        </div>
        <form className="search-form" onSubmit={handleSearch}>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm mã, tên hoặc email" />
          <button className="secondary-button" type="submit">Tìm kiếm</button>
        </form>
      </header>

      <section className="management-grid">
        {canManageStudents && <form className="panel student-form" onSubmit={handleSubmit}>
          <div className="panel-heading">
            <div>
              <h2>{editingId ? 'Sửa sinh viên' : 'Thêm sinh viên'}</h2>
              <p>Thông tin bắt buộc được kiểm tra ở backend.</p>
            </div>
          </div>
          <label>Mã sinh viên<input name="studentCode" value={form.studentCode} onChange={handleChange} required /></label>
          <label>Họ tên<input name="fullName" value={form.fullName} onChange={handleChange} required /></label>
          <label>Email<input name="email" type="email" value={form.email} onChange={handleChange} required /></label>
          <label>Ngày sinh<input name="dateOfBirth" type="date" value={form.dateOfBirth} onChange={handleChange} required /></label>
          <label>Giới tính<select name="gender" value={form.gender} onChange={handleChange}><option value="female">Nữ</option><option value="male">Nam</option><option value="other">Khác</option></select></label>
          <label>Lớp<select name="classId" value={form.classId} onChange={handleChange} required><option value="">Chọn lớp</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.code}</option>)}</select></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="form-actions"><button className="primary-button" type="submit">{editingId ? 'Lưu thay đổi' : 'Thêm sinh viên'}</button>{editingId && <button className="secondary-button" type="button" onClick={resetForm}>Hủy</button>}</div>
        </form>}

        <section className="panel students-panel">
          <div className="panel-heading"><div><h2>Danh sách sinh viên</h2><p>{students.length} hồ sơ</p></div></div>
          {status === 'loading' ? <p className="empty-state">Đang tải dữ liệu...</p> : (
            <div className="student-table-wrap"><table className="student-table"><thead><tr><th>Mã</th><th>Họ tên</th><th>Lớp</th><th>Email</th><th /></tr></thead><tbody>{students.map((student) => <tr key={student.id}><td>{student.studentCode}</td><td><Link className="student-link" to={`/students/${student.id}`}>{student.fullName}</Link><small>{student.department}</small></td><td>{student.classCode}</td><td>{student.email}</td><td>{canManageStudents && <div className="row-actions"><button type="button" onClick={() => startEdit(student)}>Sửa</button><button type="button" className="danger-button" onClick={() => handleDelete(student.id)}>Xóa</button></div>}</td></tr>)}</tbody></table></div>
          )}
        </section>
      </section>
    </main>
  )
}

export default Students
