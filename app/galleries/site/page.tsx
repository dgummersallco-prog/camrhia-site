'use client'

import { GallerySidebar } from '@/app/components/GallerySidebar'
import WebsiteGalleries from '@/app/website/galleries/page'

export default function WebsiteGalleriesInSidebar() {
  return (
    <div className="min-h-screen bg-paper xl:pl-60">
      <GallerySidebar active="site" />
      <WebsiteGalleries />
    </div>
  )
}
