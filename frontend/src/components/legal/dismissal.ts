// One in-memory value per account in this tab. Never browser storage or a persisted acceptance.
export const createLegalDismissalStore = () => {
  const dismissed = new Map<string, string>();
  const listeners = new Set<() => void>();
  return {
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    read: (userId: string) => dismissed.get(userId) ?? null,
    dismiss: (userId: string, setKey: string) => {
      dismissed.set(userId, setKey);
      for (const listener of listeners) listener();
    },
  };
};

export const legalDismissalStore = createLegalDismissalStore();
