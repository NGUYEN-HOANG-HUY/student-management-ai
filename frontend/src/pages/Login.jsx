import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { login } from '../services/auth'

function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ username: 'admin', password: 'admin123' })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  function handleChange(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      const user = await login(form)
      const defaultPath = user.role === 'student' ? `/students/${user.studentId}` : '/'
      navigate(location.state?.from || defaultPath, { replace: true })
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Đăng nhập không thành công')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="brand-mark large">S</div>
        <div className="eyebrow">STUDENT MANAGEMENT AI</div>
        <h1>Đăng nhập hệ thống</h1>
        <p className="login-description">Quản lý dữ liệu học tập và theo dõi cảnh báo sinh viên.</p>
        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            Tài khoản
            <input name="username" value={form.username} onChange={handleChange} autoComplete="username" required />
          </label>
          <label>
            Mật khẩu
            <input name="password" type="password" value={form.password} onChange={handleChange} autoComplete="current-password" required />
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="primary-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Đang xác thực...' : 'Đăng nhập'}
          </button>
        </form>
      </section>
    </main>
  )
}

export default Login
