import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Services — JJConnect',
};

// Icons + target pages are non-translatable; the info pages are still static (ported later).
const SERVICES = [
  { key: 'raft', icon: '🚢', href: '/raft' },
  { key: 'mansion', icon: '🏢', href: '/mansion_info.html' },
  { key: 'property', icon: '📊', href: '/property_report_info.html' },
] as const;

export default async function ServicesPage() {
  const t = await getTranslations('services');

  return (
    <div className="mx-auto max-w-5xl space-y-14 py-6">
      <section className="space-y-3 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t('hero.title')}</h1>
        <p className="mx-auto max-w-2xl text-muted-foreground">{t('hero.subtitle')}</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold tracking-tight">{t('offer.title')}</h2>
        <p className="max-w-3xl leading-relaxed text-muted-foreground">{t('offer.body')}</p>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        {SERVICES.map((s) => (
          <Card key={s.key} className="flex flex-col">
            <CardHeader>
              <div className="text-3xl" aria-hidden>
                {s.icon}
              </div>
              <CardTitle className="mt-2">{t(`items.${s.key}.name`)}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-4">
              <p className="flex-1 text-sm leading-relaxed text-muted-foreground">
                {t(`items.${s.key}.desc`)}
              </p>
              <Button asChild variant="link" size="sm" className="self-start px-0">
                <a href={s.href}>{t('items.learnMore')} →</a>
              </Button>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="space-y-4 rounded-lg border border-border bg-muted/40 p-8 text-center">
        <h2 className="text-xl font-semibold">{t('cta.title')}</h2>
        <Button asChild>
          <Link href="/support">{t('cta.button')}</Link>
        </Button>
      </section>
    </div>
  );
}
