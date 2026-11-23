import { createContext, useContext, useState, type ReactNode } from 'react';
import type { Account } from '../api/client';

export interface AccountContextValue {
  /** The account picked in the header. */
  account: Account;
  setAccount: (account: Account) => void;
}

const AccountContext = createContext<AccountContextValue | null>(null);

export function AccountProvider({ initialAccount, children }: { initialAccount: Account; children: ReactNode }) {
  const [account, setAccount] = useState(initialAccount);
  return <AccountContext.Provider value={{ account, setAccount }}>{children}</AccountContext.Provider>;
}

export function useAccount(): AccountContextValue {
  const value = useContext(AccountContext);
  if (!value) throw new Error('useAccount must be called inside an AccountProvider');
  return value;
}
