import axios from 'axios'
import { handleLocalRequest } from '../services/localBackend'

const modelClient = axios.create({
  adapter: handleLocalRequest,
  headers: {
    'Content-Type': 'application/json',
  },
})

export default modelClient
