import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from './Icon'
import { usePersistState } from '../hooks/usePersistState'

interface UploadedFile {
  id: string
  name: string
  type: string
  size: number
  dataUrl: string
  uploadedAt: string
}

export default function QuickActions() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploads, setUploads] = usePersistState<UploadedFile[]>('doctarr_uploads', [])
  const [showUploads, setShowUploads] = useState(false)
  const [showWearableMsg, setShowWearableMsg] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return

    const newFiles: UploadedFile[] = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.readAsDataURL(file)
      })
      newFiles.push({
        id: Date.now().toString(36) + i,
        name: file.name,
        type: file.type,
        size: file.size,
        dataUrl,
        uploadedAt: new Date().toLocaleString(),
      })
    }
    setUploads(prev => [...newFiles, ...prev])
    setShowUploads(true)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeFile = (id: string) => {
    setUploads(prev => prev.filter(f => f.id !== id))
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <section className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-gutter">
        <button
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => { e.preventDefault(); setIsDragging(false); fileInputRef.current?.click() }}
          className={`md:col-span-1 p-4 md:p-6 bg-surface rounded-[16px] flex flex-col items-center justify-center text-center cursor-pointer transition-all border ${
            isDragging
              ? 'border-primary'
              : 'border-outline-variant hover:border-primary/40'
          }`}
        >
          <div className="w-10 h-10 md:w-12 md:h-12 bg-primary/15 rounded-full flex items-center justify-center mb-2 md:mb-3 text-primary transition-transform hover:scale-110">
            <Icon icon="upload_file" size="lg" />
          </div>
          <p className="font-label-md text-label-md text-on-surface">Upload Lab Results</p>
        </button>

        <button
          onClick={() => navigate('/medication-tracker')}
          className="md:col-span-1 p-4 md:p-6 bg-surface rounded-[16px] flex flex-col items-center justify-center text-center cursor-pointer transition-all border border-outline-variant hover:border-primary/40"
        >
          <div className="w-10 h-10 md:w-12 md:h-12 bg-primary/15 rounded-full flex items-center justify-center mb-2 md:mb-3 text-primary transition-transform hover:scale-110">
            <Icon icon="pill" size="lg" />
          </div>
          <p className="font-label-md text-label-md text-on-surface">Medication List</p>
        </button>

        <button
          onClick={() => {
            setShowWearableMsg(true)
            setTimeout(() => setShowWearableMsg(false), 4000)
          }}
          className="md:col-span-2 p-4 md:p-6 border-2 border-dashed border-outline-variant rounded-[16px] flex items-center justify-center gap-3 md:gap-4 text-secondary bg-surface/50 hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer"
        >
          <Icon icon="add_circle" size="lg" />
          <p className="font-body-md">Connect external wearable data (Apple Health, Fitbit)</p>
        </button>
      </div>

      {showWearableMsg && (
        <div className="bg-primary/10 border border-primary/30 rounded-xl px-5 py-3 flex items-center gap-3 text-primary">
          <Icon icon="info" size="lg" />
          <p className="font-body-md text-sm">Wearable integration coming soon. Your health data can be imported manually via lab results uploads.</p>
        </div>
      )}

      {uploads.length > 0 && (
        <div className="bg-surface border border-outline-variant rounded-[16px] overflow-hidden">
          <button
            onClick={() => setShowUploads(!showUploads)}
            className="w-full flex items-center justify-between p-4 hover:bg-primary/5 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Icon icon="folder" size="lg" className="text-primary" />
              <span className="font-label-md text-on-surface">Uploaded Lab Results ({uploads.length})</span>
            </div>
            <Icon icon={showUploads ? 'expand_less' : 'expand_more'} size="lg" className="text-secondary" />
          </button>

          {showUploads && (
            <div className="border-t border-outline-variant divide-y divide-outline-variant max-h-80 overflow-y-auto">
              {uploads.map(file => (
                <div key={file.id} className="flex items-center gap-4 p-4 hover:bg-primary/5 transition-colors">
                  {file.type.startsWith('image/') ? (
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-outline-variant flex-shrink-0">
                      <img src={file.dataUrl} alt={file.name} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400 flex-shrink-0">
                      <Icon icon="picture_as_pdf" size="lg" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-label-md text-on-surface truncate">{file.name}</p>
                    <p className="font-caption text-caption text-secondary">{formatSize(file.size)}</p>
                  </div>
                  <a
                    href={file.dataUrl}
                    download={file.name}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 text-secondary hover:text-primary transition-colors opacity-100 sm:opacity-50 sm:hover:opacity-100"
                  >
                    <Icon icon="download" size="md" />
                  </a>
                  <button
                    onClick={() => removeFile(file.id)}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 text-secondary hover:text-red-400 transition-colors opacity-100 sm:opacity-50 sm:hover:opacity-100"
                  >
                    <Icon icon="delete" size="md" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
