import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  PRIVATE_STORAGE_QUOTA_BYTES,
  calculateStorageResult,
  formatStorageBytes,
  reservePrivateStorage,
  getActiveReservedBytes,
} from '@/lib/services/storage-quota-service';
import { PrivateStoragePanel } from '@/components/storage/private-storage-panel';
import { RadialGlowButton } from '@/components/ui/radial-glow-button';
import UpgradePage from '@/app/upgrade/page';

describe('CLIO — Private Storage Quota & Clio Plus Suite', () => {
  describe('Storage Calculations & Formatting', () => {
    it('formats exact 50 GB quota and various byte scales correctly', () => {
      expect(formatStorageBytes(PRIVATE_STORAGE_QUOTA_BYTES)).toBe('50 GB');
      expect(formatStorageBytes(0)).toBe('0 B');
      expect(formatStorageBytes(15_000_000)).toBe('15 MB');
      expect(formatStorageBytes(12_400_000_000)).toBe('12.4 GB');
      expect(formatStorageBytes(37_600_000_000)).toBe('37.6 GB');
    });

    it('calculates accurate usage percentage and remaining bytes', () => {
      const result = calculateStorageResult(12_500_000_000, 5); // 25% of 50 GB
      expect(result.usedBytes).toBe(12_500_000_000);
      expect(result.quotaBytes).toBe(PRIVATE_STORAGE_QUOTA_BYTES);
      expect(result.remainingBytes).toBe(37_500_000_000);
      expect(result.percentage).toBe(25);
      expect(result.isWarning).toBe(false);
      expect(result.isCritical).toBe(false);
      expect(result.isExceeded).toBe(false);
    });

    it('enforces warning threshold at or above 80%', () => {
      const result = calculateStorageResult(40_000_000_000, 10); // 80%
      expect(result.percentage).toBe(80);
      expect(result.isWarning).toBe(true);
      expect(result.isCritical).toBe(false);
      expect(result.isExceeded).toBe(false);
    });

    it('enforces critical threshold at or above 95%', () => {
      const result = calculateStorageResult(47_500_000_000, 15); // 95%
      expect(result.percentage).toBe(95);
      expect(result.isWarning).toBe(true);
      expect(result.isCritical).toBe(true);
      expect(result.isExceeded).toBe(false);
    });

    it('enforces exceeded threshold at or above 100%', () => {
      const result = calculateStorageResult(50_000_000_000, 20); // 100%
      expect(result.percentage).toBe(100);
      expect(result.isWarning).toBe(true);
      expect(result.isCritical).toBe(true);
      expect(result.isExceeded).toBe(true);
      expect(result.remainingBytes).toBe(0);
    });
  });

  describe('Server-Side Quota Enforcement & In-Flight Reservations', () => {
    const userA = 'user-scholar-a';
    const userB = 'user-scholar-b';

    it('allows a new private file within the remaining quota', () => {
      const currentUsed = 10_000_000_000; // 10 GB used
      const incoming = 5_000_000_000; // 5 GB
      const res = reservePrivateStorage(userA, incoming, currentUsed);
      expect(res).not.toBeNull();
      res?.release();
    });

    it('allows a private file that exactly reaches the 50 GB quota', () => {
      const currentUsed = 45_000_000_000; // 45 GB used
      const incoming = 5_000_000_000; // exactly reaches 50 GB
      const res = reservePrivateStorage(userA, incoming, currentUsed);
      expect(res).not.toBeNull();
      res?.release();
    });

    it('rejects a private file that exceeds the 50 GB quota limit', () => {
      const currentUsed = 48_000_000_000; // 48 GB used (2 GB remaining)
      const incoming = 3_000_000_000; // 3 GB (exceeds quota by 1 GB)
      const res = reservePrivateStorage(userA, incoming, currentUsed);
      expect(res).toBeNull();
    });

    it('validates combined size of multiple files in a private collection', () => {
      const currentUsed = 40_000_000_000; // 10 GB remaining
      const collectionFiles = [
        3_000_000_000, // File 1
        4_000_000_000, // File 2
        4_000_000_000, // File 3 (total = 11 GB, exceeds remaining 10 GB)
      ];
      const totalBatch = collectionFiles.reduce((a, b) => a + b, 0);

      const res = reservePrivateStorage(userA, totalBatch, currentUsed);
      expect(res).toBeNull();
    });

    it('prevents concurrent uploads from bypassing the quota through simultaneous requests', () => {
      const currentUsed = 45_000_000_000; // 5 GB remaining
      const upload1Bytes = 3_000_000_000; // 3 GB
      const upload2Bytes = 3_000_000_000; // 3 GB concurrent

      // Request 1 reserves 3 GB
      const res1 = reservePrivateStorage(userA, upload1Bytes, currentUsed);
      expect(res1).not.toBeNull();

      // Request 2 arrives simultaneously; remaining effective space is only 2 GB
      const res2 = reservePrivateStorage(userA, upload2Bytes, currentUsed);
      expect(res2).toBeNull(); // Blocked!

      // Request 1 completes or aborts
      res1?.release();

      // After release, a 3 GB upload is permitted again
      const res3 = reservePrivateStorage(userA, upload2Bytes, currentUsed);
      expect(res3).not.toBeNull();
      res3?.release();
    });

    it('handles failed and cancelled uploads by instantly reclaiming reserved capacity', () => {
      const currentUsed = 49_000_000_000; // 1 GB remaining
      const incoming = 800_000_000; // 800 MB

      const res = reservePrivateStorage(userA, incoming, currentUsed);
      expect(getActiveReservedBytes(userA)).toBe(incoming);

      // Upload aborts/fails, trigger release
      res?.release();
      expect(getActiveReservedBytes(userA)).toBe(0);
    });

    it('isolates quotas strictly between different users', () => {
      const currentUsedA = 49_000_000_000;
      const currentUsedB = 2_000_000_000;

      // User A cannot upload 2 GB
      const resA = reservePrivateStorage(userA, 2_000_000_000, currentUsedA);
      expect(resA).toBeNull();

      // User B has plenty of space and can upload 2 GB without interference
      const resB = reservePrivateStorage(userB, 2_000_000_000, currentUsedB);
      expect(resB).not.toBeNull();
      resB?.release();
    });
  });

  describe('UI Components — PrivateStoragePanel & RadialGlowButton', () => {
    it('renders normal private storage meter under 80%', () => {
      const mockUsage = calculateStorageResult(12_400_000_000, 3);
      render(<PrivateStoragePanel initialUsage={mockUsage} />);

      expect(screen.getByText('Private Storage')).toBeInTheDocument();
      expect(screen.getByText('12.4 GB')).toBeInTheDocument();
      expect(screen.getByText(/used of 50 GB/i)).toBeInTheDocument();
      expect(screen.getByText(/37.6 GB available/i)).toBeInTheDocument();
      expect(screen.getByText('Standard Allocation')).toBeInTheDocument();
      expect(screen.getByText(/Upgrade to Clio Plus/i)).toBeInTheDocument();
    });

    it('renders warning notice when usage reaches or exceeds 80%', () => {
      const mockUsage = calculateStorageResult(41_000_000_000, 12);
      render(<PrivateStoragePanel initialUsage={mockUsage} />);

      expect(screen.getByText(/Quota Notice/i)).toBeInTheDocument();
      expect(screen.getByText(/utilized over 80% of your private storage/i)).toBeInTheDocument();
    });

    it('renders critical capacity warning when usage reaches or exceeds 95%', () => {
      const mockUsage = calculateStorageResult(48_000_000_000, 18);
      render(<PrivateStoragePanel initialUsage={mockUsage} />);

      expect(screen.getByText(/Near Capacity/i)).toBeInTheDocument();
      expect(screen.getByText(/operating at/i)).toBeInTheDocument();
    });

    it('renders quota reached state at 100% and blocks further private uploads', () => {
      const mockUsage = calculateStorageResult(50_000_000_000, 24);
      render(<PrivateStoragePanel initialUsage={mockUsage} />);

      expect(screen.getByText('Quota Reached (100%)')).toBeInTheDocument();
      expect(screen.getByText('Private Storage Limit Reached')).toBeInTheDocument();
    });

    it('renders compact mode with accessible progress bar', () => {
      const mockUsage = calculateStorageResult(25_000_000_000, 4);
      render(<PrivateStoragePanel initialUsage={mockUsage} compact={true} />);

      expect(screen.getByText('Private Storage Allowance')).toBeInTheDocument();
      expect(screen.getByText(/25 GB available of 50 GB/i)).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
    });

    it('renders official RadialGlowButton with Clio oxblood styling', () => {
      render(
        <RadialGlowButton className="custom-test-btn">
          Upgrade to Clio Plus ↗
        </RadialGlowButton>
      );

      const btn = screen.getByRole('button', { name: /Upgrade to Clio Plus/i });
      expect(btn).toBeInTheDocument();
      expect(btn).toHaveClass('rg-button');
      expect(btn).toHaveClass('custom-test-btn');
    });

    it('renders UpgradePage explaining Clio Plus is coming soon without payment deception', () => {
      render(<UpgradePage />);

      expect(screen.getByText('Clio Plus — Coming Soon')).toBeInTheDocument();
      expect(screen.getByText('Standard Academic Tier')).toBeInTheDocument();
      expect(screen.getByText('50 GB total private-storage quota per account')).toBeInTheDocument();
      expect(screen.getByText('Clio Plus')).toBeInTheDocument();
      expect(screen.getByText(/No credit cards or billing required during current pilot/i)).toBeInTheDocument();
      expect(screen.getByText('Return to Profile & Storage Meter')).toBeInTheDocument();
    });
  });
});
