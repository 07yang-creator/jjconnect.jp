import { getTranslations } from 'next-intl/server';

export default async function SiteFooter() {
  const t = await getTranslations();
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:px-6 lg:px-8">
        <p>© {new Date().getFullYear()} JJConnect — {t('footer.rights')}</p>
        <nav className="flex items-center gap-4">
          <a href="/about" className="transition-colors hover:text-foreground">
            {t('nav.about')}
          </a>
          <a href="/terms.html" className="transition-colors hover:text-foreground">
            {t('footer.terms')}
          </a>
          <a href="/support" className="transition-colors hover:text-foreground">
            {t('footer.support')}
          </a>
        </nav>
      </div>
    </footer>
  );
}
