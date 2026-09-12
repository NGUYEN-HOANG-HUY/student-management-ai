import api from './api'

const TOKEN_KEY = 'student-ai-token'
const USER_KEY = 'student-ai-user'

export async function login(credentials) {
  const { data } = await api.post('/auth/login', credentials)
  localStorage.setItem(TOKEN_KEY, data.data.token)
  localStorage.setItem(USER_KEY, JSON.stringify(data.data.user))
  return data.data.user
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function getCurrentUser() {
  const value = localStorage.getItem(USER_KEY)
  return value ? JSON.parse(value) : null
}

export function isAuthenticated() {
  return Boolean(localStorage.getItem(TOKEN_KEY))
}
