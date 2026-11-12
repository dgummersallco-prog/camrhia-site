'use client'

import { useParams } from 'next/navigation'
import ShootRoom from '../ShootRoom'

export default function EditWalkthrough() {
  const params = useParams<{ id: string }>()
  return <ShootRoom galleryId={params.id} />
}
