'use client'

import { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import Modal from './Modal'

interface Props {
  imageSrc: string
  onCrop: (blob: Blob) => void
  onCancel: () => void
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', reject)
    image.setAttribute('crossOrigin', 'anonymous')
    image.src = url
  })
}

async function getCroppedImg(imageSrc: string, pixelCrop: any): Promise<Blob> {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height
  ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height)
  return new Promise(resolve => canvas.toBlob(blob => resolve(blob!), 'image/jpeg', 0.92))
}

export default function AvatarCropper({ imageSrc, onCrop, onCancel }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const onCropComplete = useCallback((_: any, pixels: any) => {
    setCroppedAreaPixels(pixels)
  }, [])

  async function handleConfirm() {
    if (!croppedAreaPixels) return
    setLoading(true)
    const blob = await getCroppedImg(imageSrc, croppedAreaPixels)
    onCrop(blob)
    setLoading(false)
  }

  return (
    <Modal open={true} onClose={onCancel} title="סדר תמונת פרופיל">
      <div className="space-y-4">
        <div className="relative w-full h-72 bg-[#0f0f0f] rounded-xl overflow-hidden">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>
        <div>
          <label className="text-gray-400 text-xs block mb-2 text-center">גרור להזזה · הזז את הסליידר לזום</label>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={e => setZoom(Number(e.target.value))}
            className="w-full accent-red-600 h-1.5"
          />
        </div>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-3 bg-[#242424] text-gray-400 font-bold rounded-xl text-sm">
            ביטול
          </button>
          <button onClick={handleConfirm} disabled={loading} className="flex-1 py-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold rounded-xl text-sm">
            {loading ? 'מעבד...' : 'אשר תמונה'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
