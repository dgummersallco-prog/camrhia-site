let held: { galleryId: string; files: File[] } | null = null

export function setPendingFiles(galleryId: string, files: File[]) {
  held = { galleryId, files }
}

export function takePendingFiles(galleryId: string): File[] {
  if (!held || held.galleryId !== galleryId) return []
  const f = held.files
  held = null
  return f
}
