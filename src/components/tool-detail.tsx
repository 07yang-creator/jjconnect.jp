import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ToolDetailProps {
  /** Sub-namespace under `tools.*` — e.g. 'raft', 'mansion', 'property'. */
  toolKey: string;
  /** Feature item keys (their icon/name/desc live in i18n under `features.items.<key>`). */
  featureKeys: readonly string[];
  /** Reason item keys (their title/desc live under `whyChoose.items.<key>`). */
  reasonKeys: readonly string[];
}

/**
 * Shared tool-detail page (RAFT 2.03 / Mansion Manager / Property Report).
 * All copy comes from `tools.<toolKey>.*` so adding a new tool = one i18n block.
 */
export default async function ToolDetail({ toolKey, featureKeys, reasonKeys }: ToolDetailProps) {
  const t = await getTranslations(`tools.${toolKey}`);

  return (
    <div className="mx-auto max-w-5xl space-y-14 py-6">
      <section className="space-y-3 text-center">
        <div className="text-5xl" aria-hidden>
          {t('hero.icon')}
        </div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t('hero.name')}</h1>
        <p className="text-lg text-muted-foreground">{t('hero.tagline')}</p>
        <p className="mx-auto max-w-2xl text-sm text-muted-foreground">{t('hero.subtitle')}</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold tracking-tight">{t('overview.title')}</h2>
        <p className="max-w-3xl leading-relaxed text-muted-foreground">{t('overview.body')}</p>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-semibold tracking-tight">{t('features.title')}</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {featureKeys.map((k) => (
            <Card key={k}>
              <CardHeader>
                <div className="text-2xl" aria-hidden>
                  {t(`features.items.${k}.icon`)}
                </div>
                <CardTitle className="mt-2 text-lg">{t(`features.items.${k}.name`)}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-relaxed text-muted-foreground">
                {t(`features.items.${k}.desc`)}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-semibold tracking-tight">{t('whyChoose.title')}</h2>
        <div className="grid gap-6 md:grid-cols-2">
          {reasonKeys.map((k) => (
            <div key={k} className="rounded-lg border border-border p-5">
              <h3 className="text-base font-semibold">{t(`whyChoose.items.${k}.title`)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {t(`whyChoose.items.${k}.desc`)}
              </p>
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
