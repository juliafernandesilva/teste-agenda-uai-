(() => {
  const user = window.AgendaUaiApi?.getCurrentUser;
  if (!user) return;
  user().then(account => {
    if (account) return;
    const target = `${location.pathname}${location.search}${location.hash}`;
    const login = new URL('../login%20e%20cadastro/login1510.html', location.href);
    login.searchParams.set('returnTo', target);
    location.replace(login.href);
  }).catch(() => {
    const login = new URL('../login%20e%20cadastro/login1510.html', location.href);
    login.searchParams.set('returnTo', `${location.pathname}${location.search}`);
    location.replace(login.href);
  });
})();
