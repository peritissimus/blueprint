// Named snapshots are separate from the editor's working autosave.
export function createLayoutStore(storage, key) {
  const read = () => {
    const raw = storage.getItem(key);
    if (!raw) return [];
    const data = JSON.parse(raw);
    if (data.version !== 1 || !Array.isArray(data.layouts) || data.layouts.some(entry =>
      !entry || typeof entry.id !== 'string' || typeof entry.name !== 'string' ||
      !Number.isFinite(entry.updatedAt) || !validLayout(entry.layout))) {
      throw new Error('Saved layouts could not be read. Existing data has been preserved.');
    }
    return data.layouts;
  };
  const write = entries => storage.setItem(key, JSON.stringify({ version: 1, layouts: entries }));
  const nameOf = name => {
    const value = name.trim();
    if (!value || value.length > 80) throw new Error('Enter a name between 1 and 80 characters.');
    return value;
  };
  return {
    list: read,
    save(name, layout, id) {
      name = nameOf(name);
      if (!validLayout(layout)) throw new Error('This layout cannot be saved.');
      const entries = read();
      if (entries.some(entry => entry.id !== id && entry.name.toLowerCase() === name.toLowerCase())) {
        throw new Error('That name is already used. Choose another name or update the existing layout.');
      }
      const entry = id ? entries.find(entry => entry.id === id) : null;
      if (id && !entry) throw new Error('This saved layout no longer exists. Reopen Saved layouts.');
      const next = { id: id || (typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Array.from(crypto.getRandomValues(new Uint32Array(4)), n => n.toString(16).padStart(8, '0')).join('')), name, updatedAt: Date.now(), layout };
      write(entry ? entries.map(entry => entry.id === id ? next : entry) : [next, ...entries]);
    },
    rename(id, name) {
      const entry = read().find(entry => entry.id === id);
      if (!entry) throw new Error('This saved layout no longer exists.');
      this.save(name, entry.layout, id);
    },
    remove(id) { write(read().filter(entry => entry.id !== id)); }
  };
}

export function validLayout(layout) {
  const point = p => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite);
  return !!layout && typeof layout.baseFloor === 'boolean' && Number.isInteger(layout.nextId) && layout.nextId > 0 &&
    Array.isArray(layout.walls) && layout.walls.every(w => w && point(w.a) && point(w.b)) &&
    Array.isArray(layout.openings) && layout.openings.every(o => o && point(o.a) && point(o.b) &&
      ['door', 'double', 'window'].includes(o.type) && (o.type === 'window' || point(o.swing))) &&
    Array.isArray(layout.items) && layout.items.every(i => i && typeof i.id === 'string' && typeof i.type === 'string' &&
      Number.isFinite(i.x) && Number.isFinite(i.z) && Number.isFinite(i.rot ?? 0)) &&
    Array.isArray(layout.labels) && layout.labels.every(l => l && typeof l.text === 'string' && point(l.p));
}

export function mountSavedLayouts({ store, snapshot, openLayout }) {
  const dialog = document.getElementById('layoutsDialog');
  const list = document.getElementById('layoutsList');
  const form = document.getElementById('saveLayoutForm');
  const name = document.getElementById('layoutName');
  const feedback = document.getElementById('layoutsFeedback');
  const trigger = document.getElementById('layoutsBtn');
  function message(text, error = false) {
    feedback.textContent = text;
    feedback.classList.toggle('error', error);
  }
  function run(action, success) {
    try { action(); render(); message(success); name.focus(); return true; }
    catch (error) { message(error.name === 'QuotaExceededError' || error.name === 'SecurityError'
      ? 'Browser storage is unavailable or full. Your saved layouts were not changed.' : error.message, true); return false; }
  }
  function button(text, action, parent) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'mini'; b.textContent = text;
    b.addEventListener('click', action); parent.append(b); return b;
  }
  function confirmButton(label, action, parent) {
    let armed = false, timer;
    const b = button(label, () => {
      if (!armed) {
        armed = true; b.textContent = 'Confirm ' + label.toLowerCase();
        timer = setTimeout(() => { armed = false; b.textContent = label; }, 4000);
      } else { clearTimeout(timer); armed = false; b.textContent = label; action(); }
    }, parent);
    return b;
  }
  function render() {
    const entries = store.list();
    list.replaceChildren();
    if (!entries.length) {
      const empty = document.createElement('p'); empty.className = 'layouts-empty';
      empty.textContent = 'No saved layouts yet. Give your current arrangement a name to keep a copy.'; list.append(empty);
    }
    entries.forEach(entry => {
      const row = document.createElement('li'); row.className = 'layout-card';
      const title = document.createElement('h3'); title.textContent = entry.name;
      const meta = document.createElement('p');
      meta.textContent = `${entry.layout.items.length} pieces · ${entry.layout.walls.length} walls · ${new Date(entry.updatedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}`;
      const actions = document.createElement('div'); actions.className = 'row';
      button('Open', () => {
        if (run(() => {
          const current = store.list().find(item => item.id === entry.id);
          if (!current) throw new Error('This saved layout no longer exists.');
          openLayout(current.layout, current.name);
        }, 'Layout opened. Undo restores your previous arrangement.')) dialog.close();
      }, actions);
      button('Rename', () => {
        const rename = document.createElement('form'); rename.className = 'layout-rename';
        const input = document.createElement('input'); input.className = 'layout-input'; input.value = entry.name;
        input.required = true; input.maxLength = 80; input.setAttribute('aria-label', 'New layout name');
        const submit = document.createElement('button'); submit.className = 'mini'; submit.textContent = 'Save name'; submit.type = 'submit';
        rename.append(input, submit); button('Cancel', () => { render(); name.focus(); }, rename);
        rename.addEventListener('submit', event => { event.preventDefault(); run(() => store.rename(entry.id, input.value), 'Layout renamed.'); });
        actions.replaceWith(rename); input.focus(); input.select();
      }, actions);
      confirmButton('Update', () => run(() => store.save(entry.name, snapshot(), entry.id), 'Saved layout updated with the current arrangement.'), actions);
      confirmButton('Delete', () => run(() => store.remove(entry.id), 'Saved layout deleted. Your current arrangement is unchanged.'), actions).classList.add('danger');
      row.append(title, meta, actions); list.append(row);
    });
  }
  trigger.addEventListener('click', () => {
    message('');
    try { render(); } catch { list.replaceChildren(); message('Saved layouts could not be read. Existing data has been preserved.', true); }
    dialog.showModal();
  });
  document.getElementById('closeLayouts').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => trigger.focus());
  dialog.addEventListener('keydown', event => event.stopPropagation());
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (run(() => store.save(name.value, snapshot()), 'Layout saved. You can keep editing without changing this copy.')) name.value = '';
  });
}
