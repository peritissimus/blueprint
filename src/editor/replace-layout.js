import { normalizeLayout } from '../model/layout.js';

// Validate and persist before touching the current document or its history.
// All replacement commands share the same scene/cache reset callback.
export function createLayoutReplacer({ catalog, repository, getState, history, apply }) {
  return (layout, { undo = false } = {}) => {
    const next = normalizeLayout(layout, catalog);
    const previous = normalizeLayout(getState(), catalog);
    repository.write(next, { replace: true });
    if (undo) history.pop();
    else { history.push(JSON.stringify(previous)); if (history.length > 80) history.shift(); }
    apply(next);
  };
}
