import axios from 'axios'
import { handleLocalRequest } from '../services/localBackend'

const MODEL_API_URL = import.meta.env.VITE_MODEL_API_URL ?? 'http://localhost:8000/api/v1'

const modelClient = axios.create({
  baseURL: MODEL_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

modelClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')

  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

modelClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (!error.response && error.config) {
      console.warn('[MoiDoctar] Model API offline at', error.config.baseURL, '- using local fallback handler.')
      return handleLocalRequest(error.config)
    }
    return Promise.reject(error)
  },
)

export default modelClient
