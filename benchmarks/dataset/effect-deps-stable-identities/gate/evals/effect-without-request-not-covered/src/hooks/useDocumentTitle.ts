import { useEffect } from 'react';

/** Sets the browser tab's title, such as `Members · Northpoint Ltd · Fernhill`. */
export function useDocumentTitle(parts: string[]): void {
  useEffect(() => {
    const previous = document.title;
    document.title = [...parts, 'Fernhill'].join(' · ');
    return () => {
      document.title = previous;
    };
  }, [parts]);
}
