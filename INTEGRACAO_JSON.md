# Integração do catálogo e armazenamento local

As lojas e categorias de partida são lidas de `data/catalogo.json`. Para alterar a lista publicada, edite esse arquivo e faça commit no GitHub. As imagens referenciadas estão em `uploads/`.

Os formulários de demonstração usam `shared/agenda-uai-api.js` como camada JavaScript local. Ela persiste contas de demonstração, lojas cadastradas, serviços, horários e agendamentos em `localStorage`. Isso funciona sem API ou banco, mas os dados só ficam no navegador e dispositivo que os criou.

Use somente dados fictícios. O armazenamento do navegador não sincroniza entre visitantes e não oferece autenticação segura. Para abrir a pasta no próprio computador, use um servidor estático local e acesse-o por `http://localhost`; não use `file://`.
