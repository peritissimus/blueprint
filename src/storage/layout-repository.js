import { normalizeLayout } from '../model/layout.js';

export function createLayoutRepository(storage, key, catalog) {
  let unreadable = false;
  return {
    read() {
      try {
        const raw = storage.getItem(key);
        const layout = raw ? normalizeLayout(JSON.parse(raw), catalog) : null;
        unreadable = false;
        return layout;
      } catch (error) { unreadable = true; throw error; }
    },
    write(layout, { replace = false } = {}) {
      const next = normalizeLayout(layout, catalog);
      if (unreadable) {
        if (!replace) throw new Error('Existing layout could not be read. Open a saved layout or reset to recover.');
        const raw = storage.getItem(key);
        if (raw != null) storage.setItem(key + '-recovery', raw);
      }
      storage.setItem(key, JSON.stringify(next));
      unreadable = false;
      return next;
    }
  };
}
