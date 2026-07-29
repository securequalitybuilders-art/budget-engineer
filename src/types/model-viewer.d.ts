import type { ReactNode } from 'react'

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': ModelViewerAttributes
    }
  }
}

interface ModelViewerAttributes {
  src?: string
  alt?: string
  'camera-controls'?: boolean | string
  'auto-rotate'?: boolean | string
  'auto-rotate-delay'?: number | string
  'ar'?: boolean | string
  'ar-modes'?: string
  'ar-scale'?: string
  'camera-orbit'?: string
  'camera-target'?: string
  'environment-image'?: string
  'exposure'?: number | string
  'shadow-intensity'?: number | string
  'shadow-softness'?: number | string
  'interaction-prompt'?: string
  'interpolation-decay'?: number | string
  'max-camera-orbit'?: string
  'min-camera-orbit'?: string
  'min-field-of-view'?: number | string
  'max-field-of-view'?: number | string
  'loading'?: string
  'poster'?: string
  reveal?: string
  style?: Record<string, string | number> | string
  className?: string
  children?: ReactNode
  ref?: React.Ref<HTMLElement>
  'with-credentials'?: boolean | string
  'skybox-image'?: string
  'field-of-view'?: number | string
  'touch-action'?: string
  'orientation'?: string
  onLoad?: (e: Event) => void
  onError?: (e: Event) => void
  onProgress?: (e: CustomEvent) => void
  onCameraChange?: (e: CustomEvent<{ orbit: string; target: string }>) => void
  onEnvironmentChange?: (e: CustomEvent) => void
}
