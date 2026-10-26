'use client';

import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/components/i18n/LocaleProvider';
import { openTawkChat, type TawkVisitorContext } from '@/components/support/TawkChat';
import { buildWhatsappUrl, getSupportContactConfig } from '@/lib/support/contact';
import { cn } from '@/lib/utils';

type OrderSupportActionsProps = {
  context: TawkVisitorContext;
  className?: string;
  compact?: boolean;
};

export function OrderSupportActions({ context, className, compact = false }: OrderSupportActionsProps) {
  const { t } = useLocale();
  const support = getSupportContactConfig();
  const whatsappMessage = t('supportWhatsappOrderMessage')
    .replace('{orderId}', context.orderId || '')
    .replace('{reference}', context.paymentReference || '')
    .replace('{amount}', context.amount || '');
  const whatsappUrl = buildWhatsappUrl(whatsappMessage);

  if (!support.tawkEnabled && !whatsappUrl && !support.wechatId) {
    return null;
  }

  const openChat = () => {
    const opened = openTawkChat(context);
    if (!opened && whatsappUrl) {
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      {!compact ? (
        <p className="text-xs text-slate-500">{t('supportOrderHint')}</p>
      ) : null}
      <div className={cn('flex flex-wrap gap-2', compact && 'justify-center')}>
        {support.tawkEnabled ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-[#1f2f66]/20 text-[#1f2f66]"
            onClick={openChat}
          >
            <MessageCircle className="mr-1.5 size-3.5" />
            {t('supportChatWithUs')}
          </Button>
        ) : null}
        {whatsappUrl ? (
          <Button asChild variant="outline" size="sm" className="border-emerald-200 text-emerald-800">
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
              {t('supportWhatsapp')}
            </a>
          </Button>
        ) : null}
      </div>
      {support.wechatId ? (
        <p className="text-xs text-slate-500">
          {t('supportWechat')}: <span className="font-mono">{support.wechatId}</span>
        </p>
      ) : null}
    </div>
  );
}
