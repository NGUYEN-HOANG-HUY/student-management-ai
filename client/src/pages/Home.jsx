import { useState } from 'react'
import { checkBackend as requestBackendHealth } from '../services/api'

function Home() {
  const [status, setStatus] = useState('Chưa kiểm tra')
  const [message, setMessage] = useState('')

  const checkBackend = async () => {
    setStatus('Đang kiểm tra Backend...')
    setMessage('')

    try {
      const data = await requestBackendHealth()
      setStatus(data.success ? 'Đang hoạt động' : 'Không kết nối được')
      setMessage(data.message || '')
    } catch {
      setStatus('Không kết nối được')
      setMessage('')
    }
  }

  return (
    <main className="home-page">
      <section className="home-card">
        <p className="home-eyebrow">LOCAL STUDENT MANAGEMENT</p>
        <h1>Student AI System</h1>
        <p className="home-description">
          Kiểm tra kết nối giữa React Frontend và Express Backend.
        </p>

        <div className="backend-status" role="status">
          <span>Trạng thái Backend:</span>
          <strong>{status}</strong>
        </div>

        {message && <p className="backend-message">{message}</p>}

        <button type="button" className="check-button" onClick={checkBackend}>
          Kiểm tra Backend
        </button>
      </section>
    </main>
  )
}

export default Home
