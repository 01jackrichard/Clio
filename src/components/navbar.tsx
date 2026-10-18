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
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { config } from '@/lib/config';
import { Badge } from '@/components/ui/badge';

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

          if (data) {
            setProfile(data as UserProfile);
          } else {
            setProfile({
              id: user.id,
              email: user.email || '',
              display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'Student',
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

  const navLinks = [
    { href: '/documents', label: 'Catalogue' },
    { href: '/my-submissions', label: 'My Submissions', authRequired: true },
    { href: '/favorites', label: 'Saved Folios', authRequired: true },
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
    return pathname === path;
  };

  // Never render on landing page ('/')
  if (!pathname || pathname === '/') {
    return null;
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-ink/15 bg-paper/95 backdrop-blur-sm transition-colors">
      <div className="container-editorial">
        <div className="flex items-center justify-between h-16 sm:h-18">
          {/* Brand Identity */}
          <div className="flex items-center gap-7">
            <Link href="/" className="flex items-baseline gap-2.5 group" aria-label="Clio home">
              <span className="font-display text-2xl sm:text-2xl text-ink tracking-tight font-medium leading-none">
                Clio
              </span>
              <span className="hidden sm:inline-block h-3.5 w-px bg-ink/20" aria-hidden="true" />
              <span className="hidden sm:inline meta-mono text-[11px] text-ash tracking-wider uppercase">
                Academic Archive
              </span>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-6" aria-label="Primary">
              {navLinks.map((link) => {
                if (link.authRequired && !profile) return null;
                const active = isActive(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`relative py-1 text-xs font-medium tracking-tight transition-colors ${
                      active
                        ? 'text-ink font-semibold'
                        : 'text-ash hover:text-ink'
                    }`}
                  >
                    <span>{link.label}</span>
                    {active && (
                      <span className="absolute -bottom-1.5 left-0 right-0 h-0.5 bg-oxblood" />
                    )}
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
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium border transition-colors ${
                pathname === '/upload'
                  ? 'bg-ink text-paper border-ink'
                  : 'bg-card text-ink border-ink/25 hover:border-ink hover:bg-bone/40'
              }`}
            >
              <UploadCloud className="w-3.5 h-3.5 text-oxblood shrink-0" />
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
                  className="flex items-center gap-2 p-1 border border-ink/20 hover:border-ink bg-card transition-colors cursor-pointer"
                >
                  <div className="w-6 h-6 bg-bone text-ink flex items-center justify-center font-display font-medium text-[11px] uppercase">
                    {profile.display_name.charAt(0)}
                  </div>
                  <span className="text-xs font-medium text-ink max-w-[110px] truncate">
                    {profile.display_name}
                  </span>
                  <ChevronDown className={`w-3 h-3 text-ash transition-transform duration-200 ${userDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-card border border-ink/20 shadow-lg py-2 z-50">
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
                        className="flex items-center gap-2.5 px-4 py-2 text-xs text-ink/80 hover:bg-bone hover:text-ink transition-colors"
                      >
                        <LayoutDashboard className="w-3.5 h-3.5 text-ash" />
                        <span>Student Workspace</span>
                      </Link>

                      <Link
                        href="/my-submissions"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs text-ink/80 hover:bg-bone hover:text-ink transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5 text-ash" />
                        <span>My Submissions</span>
                      </Link>

                      <Link
                        href="/favorites"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs text-ink/80 hover:bg-bone hover:text-ink transition-colors"
                      >
                        <Bookmark className="w-3.5 h-3.5 text-ash" />
                        <span>Saved Folios</span>
                      </Link>

                      <Link
                        href="/profile"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs text-ink/80 hover:bg-bone hover:text-ink transition-colors"
                      >
                        <User className="w-3.5 h-3.5 text-ash" />
                        <span>Academic Profile</span>
                      </Link>

                      {profile.role === 'admin' && (
                        <div className="border-t border-ink/10 my-1 pt-1">
                          <Link
                            href="/admin"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-xs text-oxblood hover:bg-bone font-medium transition-colors"
                          >
                            <Shield className="w-3.5 h-3.5" />
                            <span>Governance Console</span>
                          </Link>
                        </div>
                      )}

                      <div className="border-t border-ink/10 mt-1 pt-1">
                        <button
                          type="button"
                          onClick={handleSignOut}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-oxblood hover:bg-rose-50 transition-colors text-left cursor-pointer font-medium"
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
                  className="px-3 py-1.5 text-xs text-ash hover:text-ink transition-colors font-medium"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/register"
                  className="px-3 py-1.5 text-xs bg-ink text-paper hover:bg-oxblood transition-colors font-medium"
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
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium border border-ink/20 bg-card text-ink"
            >
              <UploadCloud className="w-3.5 h-3.5 text-oxblood" />
              <span>Contribute</span>
            </Link>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 text-ink hover:text-oxblood transition-colors cursor-pointer"
              aria-label="Toggle Navigation Menu"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation-drawer"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div id="mobile-navigation-drawer" className="md:hidden border-t border-ink/15 bg-paper p-5 space-y-4">
          <nav className="flex flex-col gap-1">
            <Link
              href="/documents"
              onClick={() => setMobileMenuOpen(false)}
              className={`py-2 text-sm font-medium border-b border-ink/10 ${
                isActive('/documents') ? 'text-oxblood font-semibold' : 'text-ink'
              }`}
            >
              Catalogue
            </Link>

            {profile && (
              <>
                <Link
                  href="/my-submissions"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`py-2 text-sm font-medium border-b border-ink/10 ${
                    isActive('/my-submissions') ? 'text-oxblood font-semibold' : 'text-ink'
                  }`}
                >
                  My Submissions
                </Link>

                <Link
                  href="/favorites"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`py-2 text-sm font-medium border-b border-ink/10 ${
                    isActive('/favorites') ? 'text-oxblood font-semibold' : 'text-ink'
                  }`}
                >
                  Saved Folios
                </Link>

                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`py-2 text-sm font-medium border-b border-ink/10 ${
                    isActive('/dashboard') ? 'text-oxblood font-semibold' : 'text-ink'
                  }`}
                >
                  Student Workspace
                </Link>

                <Link
                  href="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`py-2 text-sm font-medium border-b border-ink/10 ${
                    isActive('/profile') ? 'text-oxblood font-semibold' : 'text-ink'
                  }`}
                >
                  Academic Profile
                </Link>

                {profile.role === 'admin' && (
                  <Link
                    href="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="py-2 text-sm font-medium text-oxblood border-b border-ink/10 flex items-center gap-2"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>Governance Console</span>
                  </Link>
                )}
              </>
            )}
          </nav>

          <div className="pt-2">
            {!profile ? (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/auth/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2 text-xs font-medium border border-ink/20 bg-card text-ink"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2 text-xs font-medium bg-ink text-paper"
                >
                  Register
                </Link>
              </div>
            ) : (
              <div className="flex items-center justify-between pt-2">
                <span className="meta-mono text-xs text-ash truncate">{profile.email}</span>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleSignOut();
                  }}
                  className="text-xs text-oxblood hover:underline font-mono uppercase tracking-wider cursor-pointer"
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
