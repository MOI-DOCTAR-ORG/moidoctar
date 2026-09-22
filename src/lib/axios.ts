import axios from 'axios'
import { handleLocalRequest } from '../services/localBackend'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')

  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (!error.response && error.config) {
      console.warn('[MoiDoctar] Backend server offline at', error.config.baseURL, '- using local fallback handler.')
      return handleLocalRequest(error.config)
    }
    return Promise.reject(error)
  },
)

export default apiClient
