'use client';

import { useState, type ComponentProps } from 'react';
import { Input } from '@/components/ui/input';
import { AuthIconField } from '@/components/auth/AuthIconField';
import { authPasswordFieldClassName } from '@/components/auth/AuthSplitShell';
import { cn } from '@/lib/utils';

type AuthPasswordFieldProps = Omit<ComponentProps<typeof Input>, 'type'>;

export function AuthPasswordField({ className, ...props }: AuthPasswordFieldProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <AuthIconField
      iconSrc="/icons/auth-lock.svg"
      iconWidth={16}
      iconHeight={21}
      endAdornment={
        <button
          type="button"
          onClick={() => setShowPassword((current) => !current)}
          className="absolute right-[17px] top-1/2 flex h-6 w-7 -translate-y-1/2 items-center justify-center overflow-clip"
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          <img src="/icons/auth-eye.svg" alt="" width={28} height={24} className="h-full w-full" />
        </button>
      }
    >
      <Input
        type={showPassword ? 'text' : 'password'}
        className={cn(authPasswordFieldClassName, className)}
        {...props}
      />
    </AuthIconField>
  );
}
