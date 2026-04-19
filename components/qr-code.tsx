'use client'

import { useEffect, useRef } from 'react'
import QRCode from 'qrcode'

interface QrCodeProps {
  url: string
  /** Canvas size in px (default 180) */
  size?: number
}

/**
 * Renders a QR code pointing to the given URL using the `qrcode` canvas API.
 * Client-only — canvas rendering requires the browser environment.
 */
export function QrCode({ url, size = 180 }: QrCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current) return
    QRCode.toCanvas(canvasRef.current, url, {
      width: size,
      margin: 2,
      color: { dark: '#111827', light: '#ffffff' },
    })
  }, [url, size])

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="rounded-lg"
      aria-label={`QR code for ${url}`}
    />
  )
}
