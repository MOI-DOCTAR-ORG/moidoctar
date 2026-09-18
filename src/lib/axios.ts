import axios from 'axios'
import { handleLocalRequest } from '../services/localBackend'

const apiClient = axios.create({
  adapter: handleLocalRequest,
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

export default apiClient
