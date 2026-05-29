'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LocaleSwitcher } from './locale-switcher';

interface MeUser {
  username: string;
  avatar_url: string | null;
  is_authorized: boolean;
}

export default function SiteNav() {
  const t = useTranslations('nav');
  const [me, setMe] = useState<MeUser | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/me', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d?.isLoggedIn && d.userData) {
          setMe({
            username: d.userData.username ?? 'User',
            avatar_url: d.userData.avatar_url ?? null,
            is_authorized: Boolean(d.userData.is_authorized),
          });
        }
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function signOut() {
    try {
      await fetch('/api/auth/sign-out', { method: 'POST', credentials: 'include' });
    } finally {
      window.location.href = '/';
    }
  }

  const links = [
    { href: '/', label: t('home') },
    { href: '/services', label: t('services') },
    { href: '/about', label: t('about') },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center" aria-label="JJConnect">
            <Image
              src="/brand/jjconnect-navbar-logo.svg"
              alt="JJConnect"
              width={120}
              height={28}
              priority
            />
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <Button key={l.href} asChild variant="ghost" size="sm">
                <Link href={l.href}>{l.label}</Link>
              </Button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-1">
          <LocaleSwitcher />

          {loaded && me ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="ml-1 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={me.username}
                >
                  <Avatar className="h-8 w-8">
                    {me.avatar_url ? <AvatarImage src={me.avatar_url} alt="" /> : null}
                    <AvatarFallback>{me.username.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <a href="/profile.html?view=own">{t('myProfile')}</a>
                </DropdownMenuItem>
                {me.is_authorized ? (
                  <DropdownMenuItem asChild>
                    <a href="/admin-console.html">{t('admin')}</a>
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut}>{t('signOut')}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild size="sm" className="ml-1">
              <Link href="/login">{t('signIn')}</Link>
            </Button>
          )}

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label={t('menu')}>
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetTitle>{t('menu')}</SheetTitle>
              <nav className="mt-6 flex flex-col gap-1">
                {links.map((l) => (
                  <Button key={l.href} asChild variant="ghost" className="justify-start">
                    <Link href={l.href}>{l.label}</Link>
                  </Button>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
