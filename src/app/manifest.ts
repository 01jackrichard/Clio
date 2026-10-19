import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Clio — Knowledge, preserved.',
    short_name: 'Clio',
    description: 'Discover, organize, and preserve academic knowledge.',
    start_url: '/documents',
    scope: '/',
    display: 'standalone',
    background_color: '#F2EFE9',
    theme_color: '#F2EFE9',
    orientation: 'portrait-primary',
    categories: ['education', 'productivity', 'reference'],
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-maskable-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
    shortcuts: [
      {
        name: 'Catalogue',
        short_name: 'Catalogue',
        description: 'Browse academic papers, notes, and previous year folios',
        url: '/documents',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }],
      },
      {
        name: 'Saved Folios',
        short_name: 'Saved',
        description: 'View your saved academic documents',
        url: '/favorites',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }],
      },
      {
        name: 'Contribute Material',
        short_name: 'Upload',
        description: 'Contribute notes or papers to the academic archive',
        url: '/upload',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }],
      },
    ],
  };
}
