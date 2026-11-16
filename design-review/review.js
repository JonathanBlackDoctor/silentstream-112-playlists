// Review-only preview state. Excluded from the production build.
try { sessionStorage.setItem('ss112-open-v1', new URLSearchParams(location.search).has('locked') ? '' : 'open'); } catch {}
