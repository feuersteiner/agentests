type Kind = 'success' | 'error';

function show(kind: Kind, message: string): void {
  const host = document.getElementById('toasts');
  if (!host) return;
  const item = document.createElement('div');
  item.className = `toast toast-${kind}`;
  item.setAttribute('role', kind === 'error' ? 'alert' : 'status');
  item.textContent = message;
  host.append(item);
  window.setTimeout(() => item.remove(), 4000);
}

export const toast = {
  success: (message: string) => show('success', message),
  error: (message: string) => show('error', message)
};
