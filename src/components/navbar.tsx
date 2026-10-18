'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  User,
  LogOut,
  Menu,
  X,
  ArrowUpRight,
  Shield,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { config } from '@/lib/config';
import { buttonVariants } from '@/components/ui/button';
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
    { href: '/documents', label: 'Catalog', num: '01' },
    { href: '/upload', label: 'Upload PDF', num: '02' },
    { href: '/my-submissions', label: 'Submissions', num: '03', authRequired: true },
    { href: '/favorites', label: 'Saved Folios', num: '04', authRequired: true },
  ];

  if (profile?.role === 'admin') {
    navLinks.push({
      href: '/admin',
      label: 'Moderation',
      num: '05',
      authRequired: true,
    });
  }

  const isActive = (path: string) => {
    if (path === '/documents' && pathname.startsWith('/documents')) return true;
    if (path === '/admin' && pathname.startsWith('/admin')) return true;
    return pathname === path;
  };

  // The SculptureHero component on the landing page owns the hero navigation.
  // Never render this shared navbar on the root path ('/').
  if (!pathname || pathname === '/') {
    return null;
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-ink/15 bg-paper/95 backdrop-blur-sm transition-colors">
      <div className="container-editorial">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Editorial Brand Identity */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-baseline gap-3 group" aria-label="Clio home">
              <span className="font-display text-2xl sm:text-3xl text-ink tracking-tight font-medium leading-none">
                Clio
              </span>
              <span className="hidden md:inline meta-mono text-ash">
                {config.app.collegeShortName} · {config.app.tagline}
              </span>
            </Link>
          </div>

          {/* Editorial Primary Navigation */}
          <nav className="hidden lg:flex items-center gap-7 xl:gap-9" aria-label="Primary">
            {navLinks.map((link) => {
              if (link.authRequired && !profile) return null;
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="group relative flex items-baseline gap-1.5 py-1 text-sm font-medium tracking-tight transition-colors"
                >
                  <span className={`meta-mono transition-colors ${active ? 'text-oxblood' : 'text-ash group-hover:text-ink'}`}>
                    {link.num}
                  </span>
                  <span className={`transition-colors ${active ? 'text-ink font-semibold' : 'text-ink/80 group-hover:text-ink'}`}>
                    {link.label}
                  </span>
                  {active && (
                    <span className="absolute -bottom-0.5 left-0 right-0 h-px bg-ink" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User actions / Auth buttons */}
          <div className="hidden lg:flex items-center gap-4">
            <Link
              href="/upload"
              className={buttonVariants({
                variant: 'secondary',
                size: 'sm',
                className: 'group gap-2',
              })}
            >
              <span>Contribute PDF</span>
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-px group-hover:translate-x-px" />
            </Link>

            {loading ? (
              <div className="w-8 h-8 rounded border border-ink/20 animate-pulse bg-bone" />
            ) : profile ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  aria-expanded={userDropdownOpen}
                  aria-haspopup="true"
                  aria-label={`User menu for ${profile.display_name}`}
                  className="flex items-center gap-2.5 p-1 rounded-none border border-ink/20 hover:border-ink transition-colors cursor-pointer"
                >
                  <div className="w-8 h-8 bg-bone border border-ink/15 text-ink flex items-center justify-center font-display font-bold text-xs uppercase">
                    {profile.display_name.charAt(0)}
                  </div>
                  <span className="text-xs font-medium text-ink max-w-[120px] truncate">
                    {profile.display_name}
                  </span>
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-60 bg-card border border-ink/20 shadow-md py-2 z-50">
                    <div className="px-4 py-2 border-b border-ink/10">
                      <p className="text-xs font-semibold text-ink">{profile.display_name}</p>
                      <p className="meta-mono text-ash truncate">{profile.email}</p>
                      <div className="mt-1.5">
                        <Badge
                          variant={profile.role === 'admin' ? 'oxblood' : 'neutral'}
                          size="sm"
                        >
                          {profile.role === 'admin' ? 'Curator · Admin' : 'Scholar · Student'}
                        </Badge>
                      </div>
                    </div>

                    <div className="py-1">
                      <Link
                        href="/profile"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-xs text-ink/80 hover:bg-bone hover:text-ink transition-colors"
                      >
                        <User className="w-3.5 h-3.5" />
                        <span>Academic Profile</span>
                      </Link>

                      {profile.role === 'admin' && (
                        <Link
                          href="/admin"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-xs text-oxblood hover:bg-bone transition-colors"
                        >
                          <Shield className="w-3.5 h-3.5" />
                          <span>Admin Console</span>
                        </Link>
                      )}

                      <button
                        type="button"
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2 px-4 py-2 text-xs text-oxblood hover:bg-bone transition-colors text-left cursor-pointer font-medium"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/auth/login"
                  className={buttonVariants({ variant: 'ghost', size: 'sm' })}
                >
                  Sign in
                </Link>
                <Link
                  href="/auth/register"
                  className={buttonVariants({ variant: 'primary', size: 'sm' })}
                >
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile hamburger menu button */}
          <div className="flex lg:hidden items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex items-center gap-2 text-ink p-2"
              aria-label="Toggle Navigation Menu"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation-drawer"
            >
              <span className="meta-mono">Menu</span>
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div id="mobile-navigation-drawer" className="lg:hidden border-t border-ink/15 bg-paper p-6 space-y-5">
          <nav className="flex flex-col gap-3">
            {navLinks.map((link) => {
              if (link.authRequired && !profile) return null;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-baseline gap-3 py-2 border-b border-ink/10"
                >
                  <span className="meta-mono text-oxblood">{link.num}</span>
                  <span className="text-base font-medium text-ink">{link.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="pt-2 flex flex-col gap-3">
            <Link
              href="/upload"
              onClick={() => setMobileMenuOpen(false)}
              className={buttonVariants({
                variant: 'primary',
                size: 'md',
                className: 'w-full gap-2',
              })}
            >
              <span>Contribute PDF</span>
              <ArrowUpRight className="h-4 w-4" />
            </Link>

            {!profile ? (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <Link
                  href="/auth/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className={buttonVariants({
                    variant: 'outline',
                    size: 'sm',
                    className: 'w-full',
                  })}
                >
                  Sign in
                </Link>
                <Link
                  href="/auth/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className={buttonVariants({
                    variant: 'primary',
                    size: 'sm',
                    className: 'w-full bg-oxblood hover:bg-rose-950',
                  })}
                >
                  Register
                </Link>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleSignOut();
                }}
                className="w-full text-center py-2 text-xs text-oxblood hover:underline font-mono uppercase tracking-wider cursor-pointer"
              >
                Sign Out ({profile.display_name})
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
