import { useState } from 'react';
import type { Me } from './api/client';
import { AccountSwitcher } from './components/AccountSwitcher';
import { AccountProvider } from './context/AccountContext';
import { Dashboard } from './pages/Dashboard';
import { Members } from './pages/Members';

const pages = { Dashboard, Members };
type PageName = keyof typeof pages;

export function App({ me }: { me: Me }) {
  const [page, setPage] = useState<PageName>('Dashboard');
  const Page = pages[page];
  return (
    <AccountProvider initialAccount={me.accounts[0]}>
      <header>
        <AccountSwitcher accounts={me.accounts} />
        <nav>
          {(Object.keys(pages) as PageName[]).map((name) => (
            <a
              key={name}
              href={`#${name.toLowerCase()}`}
              aria-current={name === page ? 'page' : undefined}
              onClick={() => setPage(name)}
            >
              {name}
            </a>
          ))}
        </nav>
        <span>{me.email}</span>
      </header>
      <main>
        <Page />
      </main>
    </AccountProvider>
  );
}
