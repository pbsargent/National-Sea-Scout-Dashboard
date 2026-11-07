(() => {
  document.getElementById('printHelp').addEventListener('click', () => window.print());
  fetch('../data/dashboard-data.json')
    .then(response => {
      if (!response.ok) throw new Error('Dashboard data unavailable');
      return response.json();
    })
    .then(({ meta }) => {
      const date = new Date(meta.generatedAt);
      if (Number.isNaN(date.getTime())) return;
      const formatted = new Intl.DateTimeFormat('en-US', {
        dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Chicago'
      }).format(date);
      document.getElementById('helpFreshness').textContent =
        `Data refreshed ${formatted} Central${meta.sourceCaptureName ? ` · Capture: ${meta.sourceCaptureName}` : ''}`;
    })
    .catch(() => { /* Keep the visible fallback and the guide usable offline. */ });
})();
