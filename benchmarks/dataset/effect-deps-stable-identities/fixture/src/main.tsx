import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { fetchMe } from './api/client';
import { App } from './App';

const root = createRoot(document.getElementById('root')!);

fetchMe().then(
  (me) =>
    root.render(
      <StrictMode>
        <App me={me} />
      </StrictMode>
    ),
  () => root.render(<p role="alert">The console could not load your accounts. Reload the page to try again.</p>)
);
