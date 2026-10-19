import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import fs from 'fs';
import path from 'path';
import { render, screen, fireEvent } from '@testing-library/react';
import manifest from '@/app/manifest';
import { PwaProvider, usePwa, PwaInstallButton, PwaInstallDialog } from '@/components/pwa';
import OfflinePage from '@/app/offline/page';

describe('Progressive Web App (PWA) Implementation', () => {
  describe('Web App Manifest Specification', () => {
    it('returns compliant PWA manifest metadata', () => {
      const result = manifest();

      expect(result.name).toBe('Clio — Knowledge, preserved.');
      expect(result.short_name).toBe('Clio');
      expect(result.description).toBe('Discover, organize, and preserve academic knowledge.');
      expect(result.start_url).toBe('/documents');
      expect(result.scope).toBe('/');
      expect(result.display).toBe('standalone');
      expect(result.background_color).toBe('#F2EFE9');
      expect(result.theme_color).toBe('#F2EFE9');
      expect(result.categories).toContain('education');
      expect(result.categories).toContain('productivity');
    });

    it('defines standard and maskable icon entries with accurate sizes and purpose', () => {
      const result = manifest();
      expect(result.icons).toBeDefined();

      const icon192 = result.icons?.find((i) => i.sizes === '192x192' && i.purpose === 'any');
      expect(icon192).toBeDefined();
      expect(icon192?.src).toBe('/icon-192.png');

      const icon512 = result.icons?.find((i) => i.sizes === '512x512' && i.purpose === 'any');
      expect(icon512).toBeDefined();
      expect(icon512?.src).toBe('/icon-512.png');

      const maskable192 = result.icons?.find(
        (i) => i.sizes === '192x192' && i.purpose === 'maskable'
      );
      expect(maskable192).toBeDefined();
      expect(maskable192?.src).toBe('/icon-maskable-192.png');

      const maskable512 = result.icons?.find(
        (i) => i.sizes === '512x512' && i.purpose === 'maskable'
      );
      expect(maskable512).toBeDefined();
      expect(maskable512?.src).toBe('/icon-maskable-512.png');

      const svgIcon = result.icons?.find((i) => i.type === 'image/svg+xml');
      expect(svgIcon).toBeDefined();
    });

    it('defines helpful navigation shortcuts for Catalogue, Saved Folios, and Upload', () => {
      const result = manifest();
      expect(result.shortcuts).toBeDefined();
      expect(result.shortcuts?.length).toBeGreaterThanOrEqual(3);

      const urls = result.shortcuts?.map((s) => s.url);
      expect(urls).toContain('/documents');
      expect(urls).toContain('/favorites');
      expect(urls).toContain('/upload');
    });
  });

  describe('Physical Brand Icon Assets', () => {
    it('verifies all required PNG and SVG icon files exist on disk with valid dimensions', () => {
      const projectRoot = process.cwd();
      const files = [
        { path: 'public/icon-192.png', expectedWidth: 192, expectedHeight: 192 },
        { path: 'public/icon-512.png', expectedWidth: 512, expectedHeight: 512 },
        { path: 'public/icon-maskable-192.png', expectedWidth: 192, expectedHeight: 192 },
        { path: 'public/icon-maskable-512.png', expectedWidth: 512, expectedHeight: 512 },
        { path: 'public/apple-touch-icon.png', expectedWidth: 180, expectedHeight: 180 },
      ];

      for (const f of files) {
        const fullPath = path.join(projectRoot, f.path);
        expect(fs.existsSync(fullPath)).toBe(true);

        const buf = fs.readFileSync(fullPath);
        // PNG header check
        expect(buf.toString('ascii', 1, 4)).toBe('PNG');
        const width = buf.readUInt32BE(16);
        const height = buf.readUInt32BE(20);
        expect(width).toBe(f.expectedWidth);
        expect(height).toBe(f.expectedHeight);
      }

      // Check vector icons
      expect(fs.existsSync(path.join(projectRoot, 'public/icon.svg'))).toBe(true);
      expect(fs.existsSync(path.join(projectRoot, 'public/favicon.ico'))).toBe(true);
    });
  });

  describe('Service Worker Security & Safety Rules', () => {
    it('enforces safe caching principles in public/sw.js', () => {
      const swPath = path.join(process.cwd(), 'public/sw.js');
      expect(fs.existsSync(swPath)).toBe(true);

      const swContent = fs.readFileSync(swPath, 'utf8');

      // 1. Must include offline fallback
      expect(swContent).toContain("const OFFLINE_FALLBACK_URL = '/offline'");

      // 2. Must bypass API routes
      expect(swContent).toContain("url.pathname.startsWith('/api/')");

      // 3. Must bypass authentication routes
      expect(swContent).toContain("url.pathname.startsWith('/auth/')");

      // 4. Must bypass Supabase and Google Drive
      expect(swContent).toContain("url.hostname.includes('supabase.co')");
      expect(swContent).toContain("url.hostname.includes('googleapis.com')");

      // 5. Navigation must be strictly network-first, falling back to offline page
      expect(swContent).toContain("request.mode === 'navigate'");
      expect(swContent).toContain('fetch(request).catch');

      // 6. Must clean up obsolete cache versions
      expect(swContent).toContain('caches.delete(key)');
    });
  });

  describe('PWA Install Components & UI', () => {
    it('renders PwaInstallButton with dropdown variant and triggers prompt when clicked', () => {
      render(
        <PwaProvider>
          <PwaInstallButton variant="dropdown" />
        </PwaProvider>
      );

      const button = screen.getByRole('button', { name: /install clio app/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('Install Clio App');

      fireEvent.click(button);
    });

    it('renders PwaInstallButton with drawer and footer variants', () => {
      const { rerender } = render(
        <PwaProvider>
          <PwaInstallButton variant="drawer" />
        </PwaProvider>
      );

      expect(screen.getByRole('button', { name: /install clio app/i })).toBeInTheDocument();

      rerender(
        <PwaProvider>
          <PwaInstallButton variant="footer" />
        </PwaProvider>
      );

      expect(
        screen.getByRole('button', { name: /install desktop \/ mobile app/i })
      ).toBeInTheDocument();
    });

    it('renders PwaInstallDialog with platform guidance and keyboard escape handling', () => {
      function TestWrapper() {
        const { setShowInstructionsModal } = usePwa();
        return (
          <div>
            <button type="button" onClick={() => setShowInstructionsModal(true)}>
              Open Dialog
            </button>
            <PwaInstallDialog />
          </div>
        );
      }

      render(
        <PwaProvider>
          <TestWrapper />
        </PwaProvider>
      );

      // Initially closed
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      // Open modal
      fireEvent.click(screen.getByText('Open Dialog'));

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(
        screen.getByRole('heading', { name: /install clio application/i })
      ).toBeInTheDocument();

      // Close via Escape key
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('Offline Fallback Page', () => {
    it('renders editorial offline notification and document security advisory', () => {
      render(<OfflinePage />);

      expect(screen.getByText(/archival connection offline/i)).toBeInTheDocument();
      expect(screen.getByText(/connection required/i)).toBeInTheDocument();
      expect(screen.getByText(/document security notice/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reconnect & retry/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /return to cover/i })).toBeInTheDocument();
    });
  });
});
