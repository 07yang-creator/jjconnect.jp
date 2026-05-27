import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export const metadata: Metadata = {
  title: 'About — JJConnect',
};

const PRODUCTS = ['raft', 'taptap', 'advice'] as const;
const TEAM = ['judy', 'yano'] as const;

export default async function AboutPage() {
  const t = await getTranslations('about');

  return (
    <div className="mx-auto max-w-4xl space-y-16 py-6">
      <section className="space-y-4 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t('hero.title')}</h1>
        <p className="mx-auto max-w-2xl text-muted-foreground">{t('hero.lead')}</p>
        <p className="mx-auto max-w-2xl text-base italic">{t('hero.creed')}</p>
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight">{t('who.title')}</h2>
        <p className="leading-relaxed text-muted-foreground">{t('who.body')}</p>
        <p className="text-sm font-medium">{t('who.company')}</p>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-semibold tracking-tight">{t('deliver.title')}</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {PRODUCTS.map((p) => (
            <Card key={p}>
              <CardHeader>
                <CardTitle>{t(`deliver.${p}.name`)}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-relaxed text-muted-foreground">
                {t(`deliver.${p}.desc`)}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight">{t('team.title')}</h2>
        <div className="flex flex-wrap gap-10">
          {TEAM.map((m) => (
            <div key={m}>
              <p className="font-semibold">{t(`team.${m}.name`)}</p>
              <p className="text-sm text-muted-foreground">{t(`team.${m}.role`)}</p>
            </div>
          ))}
        </div>
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
