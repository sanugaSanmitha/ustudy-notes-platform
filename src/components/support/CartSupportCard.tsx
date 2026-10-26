'use client';

import { MessageCircle, MessageSquareText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useLocale } from '@/components/i18n/LocaleProvider';
import { openTawkChat } from '@/components/support/TawkChat';
import { buildWhatsappUrl, getSupportContactConfig } from '@/lib/support/contact';
import { formatHkd } from '@/lib/utils/cart-utils';

type CartSupportCardProps = {
  itemCount?: number;
  totalHkd?: number;
};

export function CartSupportCard({ itemCount = 0, totalHkd = 0 }: CartSupportCardProps) {
  const { t } = useLocale();
  const support = getSupportContactConfig();
  const whatsappUrl = buildWhatsappUrl(
    t('supportWhatsappCartMessage')
      .replace('{count}', String(itemCount))
      .replace('{total}', formatHkd(totalHkd))
  );

  const openChat = () => {
    const opened = openTawkChat({
      page: 'cart',
      amount: totalHkd > 0 ? formatHkd(totalHkd) : undefined,
    });
    if (!opened && whatsappUrl) {
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    }
  };

  if (!support.tawkEnabled && !support.whatsappUrl && !support.wechatId) {
    return null;
  }

  return (
    <Card className="mt-4 space-y-3 border-[#dbe4ff] bg-[#f5f8ff] p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-[#1f2f66] shadow-sm">
          <MessageSquareText className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#1f2f66]">{t('supportNeedHelp')}</p>
          <p className="mt-1 text-xs leading-5 text-slate-600">{t('supportCartHint')}</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {support.tawkEnabled ? (
          <Button
            type="button"
            variant="outline"
            className="w-full justify-center border-[#1f2f66]/20 bg-white text-[#1f2f66] hover:bg-white hover:text-[#18244f]"
            onClick={openChat}
          >
            <MessageCircle className="mr-2 size-4" />
            {t('supportChatWithUs')}
          </Button>
        ) : null}

        {whatsappUrl ? (
          <Button asChild variant="outline" className="w-full justify-center border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50">
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
              {t('supportWhatsapp')}
            </a>
          </Button>
        ) : null}

        {support.wechatId ? (
          <p className="text-center text-xs text-slate-500">
            {t('supportWechat')}: <span className="font-mono font-medium text-slate-700">{support.wechatId}</span>
          </p>
        ) : null}
      </div>
    </Card>
  );
}
