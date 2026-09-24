import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import apiClient from '../lib/axios'
import modelClient from '../lib/modelAxios'
import type { TriageRequest, TriageResponse, TriageChatRequest, TriageChatResponse, CacheStats, CacheClearResponse, AiMemory, AiPreferences, AiHealthContext, AiKeyInfo, AiStatus } from '../types/triage'

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
<<<<<<< HEAD
=======
        if (payload.context) fd.append('context', payload.context)
>>>>>>> 1043c60 (fixed UI, made AI API multiple)
        fd.append('image', payload.image)
        return modelClient.post<TriageChatResponse>('/triage/chat', fd)
      }
      return modelClient.post<TriageChatResponse>('/triage/chat', {
        symptoms: payload.symptoms,
        messages: payload.messages ?? '[]',
<<<<<<< HEAD
=======
        context: payload.context,
>>>>>>> 1043c60 (fixed UI, made AI API multiple)
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

// ---------- AI status, memory & API keys ----------

export function useAiStatus() {
  return useQuery({
    queryKey: ['ai-status'],
    queryFn: async () => (await modelClient.get<AiStatus>('/ai/status')).data,
    retry: false,
    staleTime: 30_000,
  })
}

export function useAiMemory() {
  return useQuery({
    queryKey: ['ai-memory'],
    queryFn: async () => (await modelClient.get<AiMemory>('/ai/memory')).data,
    retry: false,
  })
}

export function useUpdateAiPreferences() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (changes: Partial<AiPreferences>) => (await modelClient.put<AiMemory>('/ai/preferences', changes)).data,
    onSuccess: (data) => qc.setQueryData(['ai-memory'], data),
  })
}

export function useUpdateAiHealthContext() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (changes: Partial<AiHealthContext>) => (await modelClient.put<AiMemory>('/ai/health-context', changes)).data,
    onSuccess: (data) => qc.setQueryData(['ai-memory'], data),
  })
}

export function useDeleteAiFact() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => (await modelClient.delete<AiMemory>(`/ai/memory/facts/${encodeURIComponent(id)}`)).data,
    onSuccess: (data) => qc.setQueryData(['ai-memory'], data),
  })
}

export function useResetAiMemory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => (await modelClient.delete<AiMemory>('/ai/memory')).data,
    onSuccess: (data) => qc.setQueryData(['ai-memory'], data),
  })
}

type KeysResponse = { keys: AiKeyInfo[]; test?: { ok: boolean; model?: string; error?: string }; added_id?: string }

export function useAiKeys() {
  return useQuery({
    queryKey: ['ai-keys'],
    queryFn: async () => (await modelClient.get<KeysResponse>('/ai/keys')).data.keys,
    retry: false,
  })
}

function useKeysMutation<T>(fn: (v: T) => Promise<KeysResponse>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: (data) => {
      qc.setQueryData(['ai-keys'], data.keys)
      qc.invalidateQueries({ queryKey: ['ai-status'] })
    },
  })
}

export const useAddAiKey = () =>
  useKeysMutation(async (v: { key: string; label: string; model?: string }) => (await modelClient.post<KeysResponse>('/ai/keys', v)).data)
export const useToggleAiKey = () =>
  useKeysMutation(async (v: { id: string; enabled: boolean }) => (await modelClient.patch<KeysResponse>(`/ai/keys/${v.id}`, { enabled: v.enabled })).data)
export const useDeleteAiKey = () =>
  useKeysMutation(async (id: string) => (await modelClient.delete<KeysResponse>(`/ai/keys/${id}`)).data)
export const useTestAiKey = () =>
  useKeysMutation(async (id: string) => (await modelClient.post<KeysResponse>(`/ai/keys/${id}/test`)).data)
