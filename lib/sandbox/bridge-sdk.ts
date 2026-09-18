export const BRIDGE_SDK_SOURCE = `
window.atomslite = {
  db: {
    list(collection) {
      return window.parent.postMessage({ type: 'atomslite:db', method: 'list', collection }, '*');
    },
    insert(collection, doc) { return Promise.resolve(doc); },
    update(collection, id, patch) { return Promise.resolve({ id, ...patch }); },
    remove(collection, id) { return Promise.resolve(); },
  },
  toast(message) { console.log('[atomslite.toast]', message); },
  ready() { window.parent.postMessage({ type: 'atomslite:ready' }, '*'); }
};
`.trim();
