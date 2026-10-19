'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  User,
  LogOut,
  Menu,
  X,
  UploadCloud,
  Shield,
  LayoutDashboard,
  Bookmark,
  FileText,
  ChevronDown,
  Share2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { config } from '@/lib/config';
import { Badge } from '@/components/ui/badge';
import { resolveDisplayName } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { ClioEmblem } from '@/components/clio-logo';
import { PwaInstallButton } from '@/components/pwa';

interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  role: 'student' | 'admin';
  department?: string;
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setMounted(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    async function loadUser() {
      if (!config.supabase.url || config.supabase.url.includes('placeholder')) {
        setLoading(false);
        return;
      }

      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data } = await supabase
            .from('profiles')
            .select('id, email, display_name, role, department')
            .eq('id', user.id)
            .single();

          const effectiveName = resolveDisplayName(
            data?.display_name,
            user.user_metadata,
            user.email
          ) || 'Student';

          if (data) {
            setProfile({
              ...data,
              display_name: effectiveName,
            } as UserProfile);
          } else {
            setProfile({
              id: user.id,
              email: user.email || '',
              display_name: effectiveName,
              role: 'student',
            });
          }
        } else {
          setProfile(null);
        }
      } catch {
        setProfile(null);
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, [pathname]);

  // Keyboard accessibility: Escape closes overlays
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (userDropdownOpen) setUserDropdownOpen(false);
        if (mobileMenuOpen) setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [userDropdownOpen, mobileMenuOpen]);

  // Click outside listener for dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('#user-dropdown-container')) {
        setUserDropdownOpen(false);
      }
    };
    if (userDropdownOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [userDropdownOpen]);

  const handleSignOut = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      setProfile(null);
      setUserDropdownOpen(false);
      router.push('/');
      router.refresh();
    } catch {
      // Ignored
    }
  };

  interface NavLink {
    href: string;
    label: string;
    authRequired?: boolean;
  }

  const navLinks: NavLink[] = [
    { href: '/documents', label: 'Catalogue' },
    { href: '/my-submissions', label: 'My Submissions' },
    { href: '/favorites', label: 'Saved Folios' },
    { href: '/shared-with-me', label: 'Shared with me', authRequired: true },
  ];

  if (profile?.role === 'admin') {
    navLinks.push({
      href: '/admin',
      label: 'Admin Desk',
      authRequired: true,
    });
  }

  const isActive = (path: string) => {
    if (path === '/documents' && pathname.startsWith('/documents')) return true;
    if (path === '/admin' && pathname.startsWith('/admin')) return true;
    if (path === '/shared-with-me' && pathname.startsWith('/shared-with-me')) return true;
    return pathname === path;
  };

  // Never render on landing page ('/')
  if (!pathname || pathname === '/') {
    return null;
  }

  return (
    <header
      className={cn(
        'sticky top-0 z-40 w-full border-b border-ink/15 bg-paper/95 backdrop-blur-sm transition-all duration-300 ease-out',
        mounted ? 'opacity-100 translate-y-0' : 'opacity-90 -translate-y-0.5'
      )}
    >
      <div className="container-editorial">
        <div className="flex items-center justify-between h-16 sm:h-18">
          {/* Brand Identity */}
          <div className="flex items-center gap-7 lg:gap-9">
            <Link
              href="/"
              className="flex items-center gap-2.5 group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-oxblood"
              aria-label="Clio home"
            >
              <ClioEmblem size={24} className="transition-transform duration-200 group-hover:scale-105" />
              <div className="flex items-baseline gap-2.5">
                <span className="font-display text-2xl tracking-tight font-medium text-ink group-hover:text-oxblood transition-colors duration-200 leading-none">
                  Clio
                </span>
                <span className="hidden sm:inline-block h-3.5 w-px bg-ink/20" aria-hidden="true" />
                <span className="hidden sm:inline meta-mono text-[10px] sm:text-[11px] text-ash tracking-[0.14em] uppercase">
                  Academic Archive
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links with animated indicator */}
            <nav className="hidden md:flex items-center gap-7 lg:gap-8" aria-label="Primary">
              {navLinks.map((link) => {
                if (link.authRequired && !profile) return null;
                const active = isActive(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      'group relative py-2 font-sans text-[14.5px] leading-5 tracking-[-0.01em] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-oxblood focus-visible:ring-offset-2',
                      active ? 'text-ink font-semibold' : 'text-ash hover:text-ink font-medium'
                    )}
                  >
                    <span>{link.label}</span>
                    <span
                      className={cn(
                        'absolute bottom-0 left-0 h-[2px] bg-oxblood transition-all duration-200 ease-out',
                        active ? 'w-full opacity-100' : 'w-0 opacity-0 group-hover:w-full group-hover:opacity-40'
                      )}
                      aria-hidden="true"
                    />
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Desktop Right Actions */}
          <div className="hidden md:flex items-center gap-4">
            {/* Prominent Upload Action */}
            <Link
              href="/upload"
              className={cn(
                'group inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium border transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-oxblood focus-visible:ring-offset-2',
                pathname === '/upload'
                  ? 'bg-ink text-paper border-ink shadow-xs'
                  : 'bg-card text-ink border-ink/25 hover:border-oxblood hover:text-oxblood hover:bg-bone/40'
              )}
            >
              <UploadCloud className="w-3.5 h-3.5 text-oxblood shrink-0 transition-transform duration-200 group-hover:-translate-y-0.5" aria-hidden="true" />
              <span>Contribute</span>
            </Link>

            {loading ? (
              <div className="w-7 h-7 rounded-none border border-ink/20 animate-pulse bg-bone" />
            ) : profile ? (
              <div id="user-dropdown-container" className="relative">
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  aria-expanded={userDropdownOpen}
                  aria-haspopup="true"
                  aria-label={`User menu for ${profile.display_name}`}
                  className="flex items-center gap-2 px-2 py-1 border border-ink/20 hover:border-ink bg-card transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-oxblood"
                >
                  <div className="w-5 h-5 bg-bone text-ink border border-ink/10 flex items-center justify-center font-display font-medium text-[10px] uppercase">
                    {profile.display_name.charAt(0)}
                  </div>
                  <span className="text-xs font-medium text-ink max-w-[110px] truncate">
                    {profile.display_name}
                  </span>
                  <ChevronDown className={cn("w-3 h-3 text-ash transition-transform duration-200", userDropdownOpen && "rotate-180")} />
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-card border border-ink/20 shadow-lg py-2 z-50 animate-in fade-in-50 duration-150">
                    <div className="px-4 py-2.5 border-b border-ink/10 space-y-1">
                      <p className="text-xs font-semibold text-ink truncate">{profile.display_name}</p>
                      <p className="meta-mono text-[11px] text-ash truncate">{profile.email}</p>
                      <div className="pt-1">
                        <Badge
                          variant={profile.role === 'admin' ? 'oxblood' : 'neutral'}
                          size="sm"
                        >
                          {profile.role === 'admin' ? 'Administrator' : 'Student Scholar'}
                        </Badge>
                      </div>
                    </div>

                    <div className="py-1">
                      <Link
                        href="/dashboard"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs text-ink/80 hover:bg-bone hover:text-ink transition-colors focus-visible:bg-bone focus-visible:text-ink focus-visible:outline-none"
                      >
                        <LayoutDashboard className="w-3.5 h-3.5 text-ash" />
                        <span>Student Workspace</span>
                      </Link>

                      <Link
                        href="/my-submissions"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs text-ink/80 hover:bg-bone hover:text-ink transition-colors focus-visible:bg-bone focus-visible:text-ink focus-visible:outline-none"
                      >
                        <FileText className="w-3.5 h-3.5 text-ash" />
                        <span>My Submissions</span>
                      </Link>

                      <Link
                        href="/favorites"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs text-ink/80 hover:bg-bone hover:text-ink transition-colors focus-visible:bg-bone focus-visible:text-ink focus-visible:outline-none"
                      >
                        <Bookmark className="w-3.5 h-3.5 text-ash" />
                        <span>Saved Folios</span>
                      </Link>

                      <Link
                        href="/shared-with-me"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs text-ink/80 hover:bg-bone hover:text-ink transition-colors focus-visible:bg-bone focus-visible:text-ink focus-visible:outline-none"
                      >
                        <Share2 className="w-3.5 h-3.5 text-ash" />
                        <span>Shared with me</span>
                      </Link>

                      <Link
                        href="/profile"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs text-ink/80 hover:bg-bone hover:text-ink transition-colors focus-visible:bg-bone focus-visible:text-ink focus-visible:outline-none"
                      >
                        <User className="w-3.5 h-3.5 text-ash" />
                        <span>Academic Profile</span>
                      </Link>

                      {profile.role === 'admin' && (
                        <div className="border-t border-ink/10 my-1 pt-1">
                          <Link
                            href="/admin"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-xs text-oxblood hover:bg-bone font-medium transition-colors focus-visible:bg-bone focus-visible:outline-none"
                          >
                            <Shield className="w-3.5 h-3.5" />
                            <span>Governance Console</span>
                          </Link>
                        </div>
                      )}

                      <div className="border-t border-ink/10 my-1 pt-1">
                        <PwaInstallButton
                          variant="dropdown"
                          onAction={() => setUserDropdownOpen(false)}
                        />
                      </div>

                      <div className="border-t border-ink/10 mt-1 pt-1">
                        <button
                          type="button"
                          onClick={handleSignOut}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-oxblood hover:bg-rose-50 transition-colors text-left cursor-pointer font-medium focus-visible:bg-rose-50 focus-visible:outline-none"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/auth/login"
                  className="px-3 py-1.5 text-xs text-ash hover:text-ink transition-colors font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-oxblood"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/register"
                  className="px-3 py-1.5 text-xs bg-ink text-paper hover:bg-oxblood transition-colors font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-oxblood"
                >
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile hamburger menu toggle */}
          <div className="flex md:hidden items-center gap-2">
            <Link
              href="/upload"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium border border-ink/20 bg-card text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-oxblood"
            >
              <UploadCloud className="w-3.5 h-3.5 text-oxblood" />
              <span>Contribute</span>
            </Link>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 text-ink hover:text-oxblood transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-oxblood"
              aria-label="Toggle Navigation Menu"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation-drawer"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer with no horizontal overflow */}
      {mobileMenuOpen && (
        <div id="mobile-navigation-drawer" className="md:hidden border-t border-ink/15 bg-paper p-5 space-y-4 w-full max-w-full overflow-x-hidden">
          <nav className="flex flex-col gap-1">
            <Link
              href="/documents"
              onClick={() => setMobileMenuOpen(false)}
              className={cn(
                'min-h-[44px] flex items-center py-2 text-sm font-medium border-b border-ink/10 transition-colors',
                isActive('/documents') ? 'text-oxblood font-semibold' : 'text-ink hover:text-oxblood'
              )}
            >
              Catalogue
            </Link>

            {profile && (
              <>
                <Link
                  href="/my-submissions"
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'min-h-[44px] flex items-center py-2 text-sm font-medium border-b border-ink/10 transition-colors',
                    isActive('/my-submissions') ? 'text-oxblood font-semibold' : 'text-ink hover:text-oxblood'
                  )}
                >
                  My Submissions
                </Link>

                <Link
                  href="/favorites"
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'min-h-[44px] flex items-center py-2 text-sm font-medium border-b border-ink/10 transition-colors',
                    isActive('/favorites') ? 'text-oxblood font-semibold' : 'text-ink hover:text-oxblood'
                  )}
                >
                  Saved Folios
                </Link>

                <Link
                  href="/shared-with-me"
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'min-h-[44px] flex items-center py-2 text-sm font-medium border-b border-ink/10 transition-colors',
                    isActive('/shared-with-me') ? 'text-oxblood font-semibold' : 'text-ink hover:text-oxblood'
                  )}
                >
                  Shared with me
                </Link>

                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'min-h-[44px] flex items-center py-2 text-sm font-medium border-b border-ink/10 transition-colors',
                    isActive('/dashboard') ? 'text-oxblood font-semibold' : 'text-ink hover:text-oxblood'
                  )}
                >
                  Student Workspace
                </Link>

                <Link
                  href="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'min-h-[44px] flex items-center py-2 text-sm font-medium border-b border-ink/10 transition-colors',
                    isActive('/profile') ? 'text-oxblood font-semibold' : 'text-ink hover:text-oxblood'
                  )}
                >
                  Academic Profile
                </Link>

                {profile.role === 'admin' && (
                  <Link
                    href="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="min-h-[44px] flex items-center py-2 text-sm font-medium text-oxblood border-b border-ink/10 gap-2"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>Governance Console</span>
                  </Link>
                )}
              </>
            )}

            <PwaInstallButton
              variant="drawer"
              onAction={() => setMobileMenuOpen(false)}
            />
          </nav>

          <div className="pt-2">
            {!profile ? (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/auth/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full min-h-[44px] flex items-center justify-center text-xs font-medium border border-ink/20 bg-card text-ink hover:border-ink transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full min-h-[44px] flex items-center justify-center text-xs font-medium bg-ink text-paper hover:bg-oxblood transition-colors"
                >
                  Register
                </Link>
              </div>
            ) : (
              <div className="flex items-center justify-between pt-2">
                <span className="meta-mono text-xs text-ash truncate max-w-[200px]">{profile.email}</span>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleSignOut();
                  }}
                  className="min-h-[44px] flex items-center text-xs text-oxblood hover:underline font-mono uppercase tracking-wider cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
