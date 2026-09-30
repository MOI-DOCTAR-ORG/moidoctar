import apiClient from '../lib/axios'

/**
 * Uploads a profile photo through the backend (`POST /user/uploadPhoto`).
 *
 * The backend stores it on Byteship (AIB Ship storage/CDN) and falls back to Cloudinary or an
 * inline data URL if that fails. The browser never talks to a storage provider directly, so no
 * storage API key is ever exposed in the frontend bundle.
 */
export async function uploadProfilePhoto(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await apiClient.post<{ data?: { photoUrl?: string }; photoUrl?: string }>('/user/uploadPhoto', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

  const photoUrl = res.data?.data?.photoUrl || res.data?.photoUrl
  if (!photoUrl) {
    throw new Error('Image upload failed to return a valid URL.')
  }
  return photoUrl
}
