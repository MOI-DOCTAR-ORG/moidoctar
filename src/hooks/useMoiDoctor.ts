import { useMutation, useQuery } from '@tanstack/react-query'
import apiClient from '../lib/axios'
import modelClient from '../lib/modelAxios'
import type { TriageRequest, TriageResponse, TriageChatRequest, TriageChatResponse, CacheStats, CacheClearResponse } from '../types/triage'

type MutationPayload = unknown

export function useManualAuth() {
  return useMutation({
    mutationFn: (payload: MutationPayload) => apiClient.post('/auth/manualAuthentication', payload),
  })
}

export function useGoogleAuth() {
  return useMutation({
    mutationFn: (payload: MutationPayload) => apiClient.post('/auth/google', payload),
  })
}

export function useVerify() {
  return useMutation({
    mutationFn: (payload: MutationPayload) => apiClient.post('/auth/verify', payload),
  })
}

export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: () => apiClient.get('/user/listData'),
  })
}

export function useUpdateProfile() {
  return useMutation({
    mutationFn: (payload: MutationPayload) => apiClient.put('/user/updateProfile', payload),
  })
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (payload: MutationPayload) => apiClient.post('/user/forgotPassword', payload),
  })
}

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: () => apiClient.get('/user/notifications'),
  })
}

export function useDeleteAccount() {
  return useMutation({
    mutationFn: () => apiClient.delete('/user'),
  })
}

export function useMedications() {
  return useQuery({
    queryKey: ['medications'],
    queryFn: () => apiClient.get('/medication'),
  })
}

export function useCreateMedication() {
  return useMutation({
    mutationFn: (payload: MutationPayload) => apiClient.post('/medication/create', payload),
  })
}

export function useStopMedication() {
  return useMutation({
    mutationFn: (payload: MutationPayload) => apiClient.put('/medication/stop', payload),
  })
}

export function useCreateTriage() {
  return useMutation({
    mutationFn: (payload: TriageRequest) => {
      if (payload.image) {
        const fd = new FormData()
        fd.append('symptoms', payload.symptoms)
        if (payload.clinical_context) fd.append('clinical_context', payload.clinical_context)
        fd.append('image', payload.image)
        return modelClient.post<TriageResponse>('/triage', fd)
      }
      return modelClient.post<TriageResponse>('/triage', {
        symptoms: payload.symptoms,
        clinical_context: payload.clinical_context,
      })
    },
  })
}

export function useCreateTriageChat() {
  return useMutation({
    mutationFn: (payload: TriageChatRequest) => {
      if (payload.image) {
        const fd = new FormData()
        fd.append('symptoms', payload.symptoms)
        fd.append('messages', payload.messages ?? '[]')
        fd.append('image', payload.image)
        return modelClient.post<TriageChatResponse>('/triage/chat', fd)
      }
      return modelClient.post<TriageChatResponse>('/triage/chat', {
        symptoms: payload.symptoms,
        messages: payload.messages ?? '[]',
      })
    },
  })
}

export function useTriageHistory() {
  return useQuery({
    queryKey: ['triage-history'],
    queryFn: () => apiClient.get('/triage/history'),
  })
}

export function useTriageList() {
  return useQuery({
    queryKey: ['triage-list'],
    queryFn: () => apiClient.get('/triage/list'),
  })
}

export function useLogSymptom() {
  return useMutation({
    mutationFn: (payload: MutationPayload) => apiClient.post('/symptom', payload),
  })
}

export function useSymptomList() {
  return useQuery({
    queryKey: ['symptoms'],
    queryFn: () => apiClient.get('/symptom/list'),
  })
}

export function useAllUsers() {
  return useQuery({
    queryKey: ['admin-users'],
    queryFn: () => apiClient.get('/admin/users'),
  })
}

export function useUpdateUserRole() {
  return useMutation({
    mutationFn: (payload: MutationPayload) => apiClient.put('/admin/user/role', payload),
  })
}

export function useBlacklistUser() {
  return useMutation({
    mutationFn: (payload: MutationPayload) => apiClient.put('/admin/user/blacklist', payload),
  })
}

export function useGetUserById(id?: string | number | null) {
  return useQuery({
    queryKey: ['admin-user', id],
    queryFn: () => apiClient.get(`/admin/user/${encodeURIComponent(String(id))}`),
    enabled: Boolean(id),
  })
}

export function useCacheStats() {
  return useQuery({
    queryKey: ['cache-stats'],
    queryFn: () => modelClient.get<CacheStats>('/cache/stats'),
  })
}

export function useClearCache() {
  return useMutation({
    mutationFn: () => modelClient.post<CacheClearResponse>('/cache/clear'),
  })
}
