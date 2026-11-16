# AgendaUai — versão estática

Esta versão usa HTML, CSS e JavaScript. O catálogo inicial de lojas e categorias está em `data/catalogo.json`. O navegador lê esse JSON e os arquivos de `uploads/` sem uma API ou banco de dados.

## Publicar no GitHub Pages

1. Envie todo o conteúdo desta pasta para a raiz do repositório: `index.html`, `home/`, `shared/`, `data/`, `uploads/` e as demais pastas.
2. No GitHub, abra **Settings → Pages**.
3. Em **Build and deployment**, selecione **Deploy from a branch**, branch `main` e `/(root)`, então salve.
4. Abra a URL mostrada em Settings → Pages. O `index.html` da raiz encaminha para `home/`.

Não publique apenas a pasta `home/`: as páginas dependem das pastas `shared/`, `data/`, `uploads/` e das demais telas.

## Armazenamento da demonstração

Cadastros, perfis, serviços e agendamentos feitos pelos formulários são guardados em `localStorage` no navegador atual. Eles não são gravados no repositório, não aparecem para outros visitantes e desaparecem se os dados do navegador forem limpos. As lojas em `data/catalogo.json` são a lista pública inicial; para alterá-la para todos, edite o arquivo e publique um novo commit.

Esta autenticação local serve apenas para demonstrar o fluxo de telas em um projeto acadêmico. Não use senhas, documentos, fotos ou informações pessoais reais. A recuperação de senha por e-mail não está disponível.

## Mapa e coordenadas

O mapa usa Leaflet e blocos do OpenStreetMap. O catálogo de origem informava apenas bairros para as quatro lojas, sem endereço de rua. Para exibi-las, inseri coordenadas aproximadas do centro de Savassi, Park Dona Gumercinda Martins e Jardim Padre Lauro; o popup informa que o ponto é aproximado. Duas lojas do Jardim Padre Lauro compartilham o mesmo marcador. Atualize os valores de `latitude` e `longitude` quando tiverem o endereço completo de cada estabelecimento.

## Testar no computador

Para abrir localmente, sirva esta pasta com um servidor web simples e acesse a URL local, por exemplo `http://localhost:8000`. Não abra os arquivos JSON/HTML pelo caminho `file://`, pois navegadores bloqueiam a leitura do JSON dessa origem.
