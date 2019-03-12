import sharp from 'sharp'

const SIZES = {
  large: 1366,
  medium: 768,
  small: 448,
  thumb: 128,
}

export interface ImageOptimizeOptions {
  size?: 'original' | 'large' | 'medium' | 'small' | 'thumb'
  width?: number
  height?: number
  quality?: number
}

export const optimize = (buffer: Buffer, options: ImageOptimizeOptions) => {
  const image = sharp(buffer).webp({ quality: +options.quality || 60 })

  if (options.size === 'original') {
    return image
  }

  const width = options.width || SIZES[options.size]

  return image.resize(null, null, {
    width,
    height: options.height,
  })
}
