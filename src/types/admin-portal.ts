export type PortalRole = 'admin' | 'assistant' | 'support';

export type StaffMember = {
  id: string;
  full_name: string | null;
  email: string;
  roles: string[];
};
