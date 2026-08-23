'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { PortalRole, StaffMember } from '@/types/admin-portal';

export type { PortalRole, StaffMember };

type AdminPortalContextValue = {
  portalRole: PortalRole | null;
  userId: string | null;
  loading: boolean;
  isAdmin: boolean;
  isAssistant: boolean;
  isSupport: boolean;
  staff: StaffMember[];
  staffLoading: boolean;
};

type AdminPortalProviderProps = {
  children: React.ReactNode;
  initialPortalRole?: PortalRole | null;
  initialUserId?: string | null;
  initialStaff?: StaffMember[];
  staffPrefetched?: boolean;
};

const AdminPortalContext = createContext<AdminPortalContextValue | null>(null);

export function AdminPortalProvider({
  children,
  initialPortalRole = null,
  initialUserId = null,
  initialStaff = [],
  staffPrefetched = false,
}: AdminPortalProviderProps) {
  const [portalRole, setPortalRole] = useState<PortalRole | null>(initialPortalRole);
  const [userId, setUserId] = useState<string | null>(initialUserId);
  const [loading, setLoading] = useState(!initialPortalRole && !initialUserId);
  const [staff, setStaff] = useState<StaffMember[]>(initialStaff);
  const [staffLoading, setStaffLoading] = useState(false);

  useEffect(() => {
    if (initialPortalRole || initialUserId) {
      setPortalRole(initialPortalRole);
      setUserId(initialUserId);
      setLoading(false);
      return;
    }

    fetch('/api/admin/me', { cache: 'no-store', credentials: 'same-origin' })
      .then((response) => response.json())
      .then((result) => {
        const role = result?.data?.portalRole;
        if (role === 'admin' || role === 'assistant' || role === 'support') {
          setPortalRole(role);
        }
        setUserId(result?.data?.userId || null);
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [initialPortalRole, initialUserId]);

  useEffect(() => {
    if (staffPrefetched || initialStaff.length > 0) {
      setStaff(initialStaff);
      return;
    }

    if (portalRole !== 'admin') {
      setStaff([]);
      return;
    }

    setStaffLoading(true);
    fetch('/api/admin/staff/assistants', { cache: 'no-store', credentials: 'same-origin' })
      .then((response) => response.json())
      .then((result) => setStaff(result?.data?.staff || result?.data?.assistants || []))
      .catch(() => setStaff([]))
      .finally(() => setStaffLoading(false));
  }, [portalRole, staffPrefetched, initialStaff]);

  const value = useMemo(
    () => ({
      portalRole,
      userId,
      loading,
      isAdmin: portalRole === 'admin',
      isAssistant: portalRole === 'assistant',
      isSupport: portalRole === 'support',
      staff,
      staffLoading,
    }),
    [portalRole, userId, loading, staff, staffLoading]
  );

  return <AdminPortalContext.Provider value={value}>{children}</AdminPortalContext.Provider>;
}

export function useAdminPortalRole() {
  const context = useContext(AdminPortalContext);
  if (!context) {
    throw new Error('useAdminPortalRole must be used within AdminPortalProvider');
  }
  return context;
}
