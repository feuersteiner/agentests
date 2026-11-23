import type { Account } from '../api/client';
import { useAccount } from '../context/AccountContext';

export function AccountSwitcher({ accounts }: { accounts: Account[] }) {
  const { account, setAccount } = useAccount();
  return (
    <label>
      Account{' '}
      <select
        value={account.id}
        onChange={(event) => {
          const picked = accounts.find((candidate) => candidate.id === event.target.value);
          if (picked) setAccount(picked);
        }}
      >
        {accounts.map((candidate) => (
          <option key={candidate.id} value={candidate.id}>
            {candidate.name}
          </option>
        ))}
      </select>
    </label>
  );
}
