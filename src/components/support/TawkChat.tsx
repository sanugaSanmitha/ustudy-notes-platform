'use client';

import { useEffect } from 'react';

export type TawkVisitorContext = {
  name?: string;
  email?: string;
  hash?: string;
  orderId?: string;
  paymentReference?: string;
  paymentMethod?: string;
  amount?: string;
  page?: string;
};

type TawkApi = {
  maximize?: () => void;
  minimize?: () => void;
  toggle?: () => void;
  showWidget?: () => void;
  hideWidget?: () => void;
  setAttributes?: (attrs: Record<string, string>, callback?: (error?: Error) => void) => void;
  addTags?: (tags: string[], callback?: (error?: Error) => void) => void;
  visitor?: Record<string, string>;
  onLoad?: () => void;
};

declare global {
  interface Window {
    Tawk_API?: TawkApi;
    Tawk_LoadStart?: Date;
    __ustudyTawkReady?: boolean;
  }
}

const SCRIPT_ID = 'ustudy-tawk-script';

function getTawkApi(): TawkApi | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.Tawk_API;
}

export function applyTawkContext(context: TawkVisitorContext) {
  const api = getTawkApi();
  if (!api) return;

  const attrs: Record<string, string> = {};
  if (context.orderId) attrs.order_id = context.orderId;
  if (context.paymentReference) attrs.payment_reference = context.paymentReference;
  if (context.paymentMethod) attrs.payment_method = context.paymentMethod;
  if (context.amount) attrs.amount = context.amount;
  if (context.page) attrs.page = context.page;

  if (context.name || context.email) {
    api.visitor = {
      ...(api.visitor || {}),
      ...(context.name ? { name: context.name } : {}),
      ...(context.email ? { email: context.email } : {}),
      ...(context.hash ? { hash: context.hash } : {}),
    };
  }

  if (Object.keys(attrs).length > 0 && typeof api.setAttributes === 'function') {
    api.setAttributes(attrs, () => undefined);
  }

  if (context.orderId && typeof api.addTags === 'function') {
    api.addTags([`order:${context.orderId}`], () => undefined);
  }
}

export function openTawkChat(context?: TawkVisitorContext) {
  if (typeof window === 'undefined') return false;
  window.Tawk_API = window.Tawk_API || {};
  if (context) applyTawkContext(context);

  const api = getTawkApi();
  if (api?.maximize) {
    api.showWidget?.();
    api.maximize();
    return true;
  }

  // Widget still loading — open once ready.
  window.Tawk_API.onLoad = () => {
    window.__ustudyTawkReady = true;
    if (context) applyTawkContext(context);
    window.Tawk_API?.showWidget?.();
    window.Tawk_API?.maximize?.();
  };
  return Boolean(process.env.NEXT_PUBLIC_TAWK_PROPERTY_ID);
}

export function TawkChat({
  propertyId,
  widgetId = 'default',
}: {
  propertyId: string;
  widgetId?: string;
}) {
  useEffect(() => {
    if (!propertyId) return;
    window.Tawk_API = window.Tawk_API || {};
    window.Tawk_LoadStart = new Date();

    const existing = document.getElementById(SCRIPT_ID);
    if (existing) return;

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.async = true;
    script.src = `https://embed.tawk.to/${propertyId}/${widgetId}`;
    script.charset = 'UTF-8';
    script.setAttribute('crossorigin', '*');
    document.body.appendChild(script);

    window.Tawk_API.onLoad = () => {
      window.__ustudyTawkReady = true;
    };

    return () => {
      // Keep script mounted across client navigations; Tawk is global.
    };
  }, [propertyId, widgetId]);

  return null;
}
