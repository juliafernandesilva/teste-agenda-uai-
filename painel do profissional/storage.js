/* Armazenamento local apenas para preferências de interface do painel. */
(function () {
  "use strict";
  const prefix = "agendauai:profissional:";

  window.AgendaUaiStore = {
    read(key, fallback) {
      try {
        const value = localStorage.getItem(prefix + key);
        return value === null ? fallback : JSON.parse(value);
      } catch {
        return fallback;
      }
    },
    write(key, value) {
      try {
        localStorage.setItem(prefix + key, JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    },
    remove(key) {
      try {
        localStorage.removeItem(prefix + key);
        return true;
      } catch {
        return false;
      }
    }
  };
})();
