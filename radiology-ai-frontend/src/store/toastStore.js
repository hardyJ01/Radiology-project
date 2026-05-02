import { useState, useEffect } from 'react';

let toasts = [];
const listeners = new Set();

function notify() {
  listeners.forEach((l) => l());
}

export const toastActions = {
  show(message, type = 'info', duration = 3000) {
    const id = Date.now().toString();
    toasts = [...toasts, { id, message, type }];
    notify();
    setTimeout(() => {
      toasts = toasts.filter((t) => t.id !== id);
      notify();
    }, duration);
  },
  success(message) { this.show(message, 'success'); },
  error(message)   { this.show(message, 'error'); },
  info(message)    { this.show(message, 'info'); },
};

export function useToastStore() {
  const [, rerender] = useState(0);

  useEffect(() => {
    const listener = () => rerender((n) => n + 1);
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, []);

  return { toasts };
}