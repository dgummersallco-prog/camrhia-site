import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/affiliate/dashboard', '/api/'],
    },
    sitemap: 'https://camrhia.com/sitemap.xml',
  }
}
