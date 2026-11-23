import { useState } from 'react';
import { Billing } from './pages/Billing';
import { Settings } from './pages/Settings';
import { Team } from './pages/Team';

const pages = { Settings, Billing, Team };
type PageName = keyof typeof pages;

export function App() {
  const [page, setPage] = useState<PageName>('Settings');
  const Page = pages[page];
  return (
    <div className="app">
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
      <main>
        <Page />
      </main>
    </div>
  );
}
