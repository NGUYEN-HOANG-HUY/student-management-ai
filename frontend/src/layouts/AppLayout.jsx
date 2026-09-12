import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { getCurrentUser, logout } from '../services/auth'

function AppLayout() {
  const navigate = useNavigate()
  const user = getCurrentUser()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="brand-mark">S</div>
        <div className="brand-copy">
          <strong>Student AI</strong>
          <span>Academic console</span>
        </div>
        <nav className="main-nav" aria-label="Điều hướng chính">
          {user?.role === 'admin' ? <>
            <NavLink to="/" end>Dashboard</NavLink>
            <NavLink to="/students">Sinh viên</NavLink>
            <NavLink to="/subjects">Môn học</NavLink>
            <NavLink to="/scores">Nhập điểm</NavLink>
          </> : user?.role === 'teacher' ? <>
            <NavLink to="/" end>Dashboard lớp</NavLink>
            <NavLink to="/students">Sinh viên phụ trách</NavLink>
            <NavLink to="/scores">Nhập điểm</NavLink>
          </> : <NavLink to={`/students/${user?.studentId}`}>Hồ sơ của tôi</NavLink>}
        </nav>
        <div className="sidebar-footer">
          <span className="user-name">{user?.username || 'admin'}</span>
          <button type="button" className="text-button" onClick={handleLogout}>Đăng xuất</button>
        </div>
      </aside>
      <div className="content-area">
        <Outlet />
      </div>
    </div>
  )
}

export default AppLayout
