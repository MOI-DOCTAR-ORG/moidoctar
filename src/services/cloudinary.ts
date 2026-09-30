import apiClient from '../lib/axios'

interface CloudinaryUploadResponse {
  secure_url: string
  public_id: string
  url: string
}

/**
 * Uploads an image file to Cloudinary.
 * First attempts direct unsigned client upload if VITE_CLOUDINARY_CLOUD_NAME is configured.
 * Otherwise, falls back to the backend `/user/uploadPhoto` endpoint.
 */
export async function uploadImageToCloudinary(file: File): Promise<string> {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'ditu39hqh'
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'moidoctar'

  // Attempt direct Cloudinary unsigned upload
  if (cloudName && uploadPreset) {
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('upload_preset', uploadPreset)

      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const data = (await response.json()) as CloudinaryUploadResponse
        if (data.secure_url) {
          return data.secure_url
        }
      }
    } catch {
      // Fallback to backend upload proxy
    }
  }

  // Fallback to backend API route `/user/uploadPhoto`
  const backendFormData = new FormData()
  backendFormData.append('file', file)
  const res = await apiClient.post<{ data?: { photoUrl?: string }; photoUrl?: string }>('/user/uploadPhoto', backendFormData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

  const photoUrl = res.data?.data?.photoUrl || res.data?.photoUrl
  if (!photoUrl) {
    throw new Error('Image upload failed to return a valid URL.')
  }
  return photoUrl
}
