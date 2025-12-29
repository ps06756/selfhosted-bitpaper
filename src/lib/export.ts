import { Canvas } from 'fabric'

export function exportToPNG(canvas: Canvas, filename: string = 'whiteboard.png') {
  const dataURL = canvas.toDataURL({
    format: 'png',
    quality: 1,
    multiplier: 2, // Higher resolution
  })

  downloadDataURL(dataURL, filename)
}

export function exportToSVG(canvas: Canvas, filename: string = 'whiteboard.svg') {
  const svg = canvas.toSVG()
  const blob = new Blob([svg], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)

  downloadURL(url, filename)
  URL.revokeObjectURL(url)
}

export function exportToJSON(canvas: Canvas, filename: string = 'whiteboard.json') {
  const json = JSON.stringify(canvas.toJSON(), null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  downloadURL(url, filename)
  URL.revokeObjectURL(url)
}

export function importFromJSON(canvas: Canvas, file: File): Promise<void> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const json = e.target?.result as string
        canvas.loadFromJSON(json).then(() => {
          canvas.renderAll()
          resolve()
        })
      } catch (err) {
        reject(err)
      }
    }

    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}

function downloadDataURL(dataURL: string, filename: string) {
  const link = document.createElement('a')
  link.href = dataURL
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

function downloadURL(url: string, filename: string) {
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
