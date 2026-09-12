import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json',
  },
})

export async function checkBackend() {
  const response = await api.get('/api/health')
  return response.data
}

export default api
