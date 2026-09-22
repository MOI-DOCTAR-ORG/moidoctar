import type { AxiosRequestConfig } from 'axios'
import apiClient from '../lib/axios'

const ACCESS_TOKEN_KEY = 'token'
const REFRESH_TOKEN_KEY = 'doctarr_refresh_token'

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function setTokens(access: string, refresh: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, access)
  localStorage.setItem(REFRESH_TOKEN_KEY, refresh)
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

interface ApiError {
  status: number
  err?: string
  msg?: string
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  _token?: string | null,
): Promise<T> {
  const config: AxiosRequestConfig = {
    method,
    url: path,
  }

  if (body !== undefined) {
    config.data = body
  }

  try {
    const res = await apiClient.request<T>(config)
    return res.data
  } catch (error) {
    const maybeError = error as { response?: { status?: number; data?: Record<string, unknown> } }
    const err: ApiError = {
      status: maybeError.response?.status ?? 0,
      ...(maybeError.response?.data ?? {}),
    }
    throw err
  }
}

export const api = {
  get: <T>(path: string, token?: string | null) => request<T>('GET', path, undefined, token),
  post: <T>(path: string, body?: unknown, token?: string | null) => request<T>('POST', path, body, token),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
}
