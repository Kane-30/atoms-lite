export const BRIDGE_SDK_SOURCE = `
window.atomslite = (function () {
  var pending = {};
  var seq = 0;

  window.addEventListener("message", function (event) {
    if (event.source !== window.parent) return;
    var data = event.data;
    if (!data || data.type !== "atomslite:res" || typeof data.id !== "string") return;
    var waiter = pending[data.id];
    if (!waiter) return;
    delete pending[data.id];
    if (data.ok) waiter.resolve(data.data);
    else waiter.reject(new Error(typeof data.error === "string" ? data.error : "bridge_error"));
  });

  function request(method, collection, extra) {
    return new Promise(function (resolve, reject) {
      if (typeof collection !== "string" || !collection) {
        reject(new Error("missing_collection"));
        return;
      }
      seq += 1;
      var id = "r" + seq + "-" + Date.now().toString(36);
      var msg = { type: "atomslite:req", id: id, method: method, collection: collection };
      if (extra) {
        if (extra.docId !== undefined) msg.docId = extra.docId;
        if (extra.doc !== undefined) msg.doc = extra.doc;
        if (extra.patch !== undefined) msg.patch = extra.patch;
      }
      var settled = false;
      var timer = null;
      function finish(err, data) {
        if (settled) return;
        settled = true;
        if (timer) clearInterval(timer);
        delete pending[id];
        if (err) reject(err);
        else resolve(data);
      }
      pending[id] = {
        resolve: function (data) { finish(null, data); },
        reject: function (err) { finish(err); }
      };
      var tries = 0;
      function send() {
        try {
          window.parent.postMessage(msg, "*");
        } catch (err) {
          finish(err);
        }
      }
      send();
      timer = setInterval(function () {
        if (settled) return;
        tries += 1;
        if (tries >= 6) {
          finish(new Error("bridge_timeout"));
          return;
        }
        send();
      }, 800);
    });
  }

  return {
    db: {
      list: function (collection) {
        return request("list", collection);
      },
      insert: function (collection, doc) {
        var row = Object.assign({}, doc || {});
        if (!row.id) row.id = Date.now().toString(36) + Math.random().toString(16).slice(2);
        return request("insert", collection, { docId: String(row.id), doc: row });
      },
      update: function (collection, id, patch) {
        if (id === undefined || id === null || id === "") {
          return Promise.reject(new Error("missing_doc_id"));
        }
        return request("update", collection, { docId: String(id), patch: patch || {} });
      },
      remove: function (collection, id) {
        if (id === undefined || id === null || id === "") {
          return Promise.reject(new Error("missing_doc_id"));
        }
        return request("remove", collection, { docId: String(id) });
      }
    },
    toast: function (message) { console.log("[atomslite.toast]", message); },
    ready: function () { window.parent.postMessage({ type: "atomslite:ready" }, "*"); }
  };
})();

(function () {
  var store = {};
  function idFor(key) {
    var hex = "";
    for (var i = 0; i < key.length; i += 1) {
      var code = key.charCodeAt(i).toString(16);
      hex += code.length < 2 ? "0" + code : code;
    }
    return ("k" + hex).slice(0, 180);
  }
  var fake = {
    getItem: function (key) {
      var name = String(key);
      return Object.prototype.hasOwnProperty.call(store, name) ? store[name] : null;
    },
    setItem: function (key, value) {
      var name = String(key);
      var text = String(value);
      store[name] = text;
      window.atomslite.db.insert("kv", { id: idFor(name), key: name, value: text });
    },
    removeItem: function (key) {
      var name = String(key);
      delete store[name];
      window.atomslite.db.remove("kv", idFor(name));
    },
    clear: function () {
      Object.keys(store).forEach(function (name) { fake.removeItem(name); });
    },
    key: function (index) {
      var names = Object.keys(store);
      return names[index] === undefined ? null : names[index];
    },
    get length() { return Object.keys(store).length; }
  };
  try {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get: function () { return fake; }
    });
  } catch (err) {}
  window.__atomsliteReady = window.atomslite.db.list("kv").then(function (rows) {
    if (!Array.isArray(rows)) return;
    for (var i = 0; i < rows.length; i += 1) {
      var row = rows[i];
      if (row && typeof row.key === "string") {
        store[row.key] = row.value == null ? "" : String(row.value);
      }
    }
  }).catch(function () {});
})();
`.trim();
