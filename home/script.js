// ==========================================================
// AgendaUai — Home/Busca
// Interações: busca (texto/voz) e menu mobile
// ==========================================================

const searchForm = document.getElementById('searchForm');
const searchInput = document.getElementById('searchInput');
const micButton = document.getElementById('micButton');
const micHint = document.getElementById('micHint');
const locationButton = document.getElementById('locationButton');
const locationStatus = document.getElementById('locationStatus');

const heroArt = document.querySelector('.hero__art');
const mapBox = document.getElementById('mapBox');

// ----------------------------------------------------------
// Lojas públicas da API: mesmo catálogo exibido na seção de lojas.
// ----------------------------------------------------------
let lojasPublicadasMapa = [];
function distanciaKm(lat1, lng1, lat2, lng2) {
  const rad = (g) => (g * Math.PI) / 180;
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}
function lojasParaOMapa() {
  return lojasPublicadasMapa.filter(loja => loja.endereco?.latitude !== null && loja.endereco?.longitude !== null && Number.isFinite(Number(loja.endereco?.latitude)) && Number.isFinite(Number(loja.endereco?.longitude)) && Math.abs(Number(loja.endereco.latitude)) <= 90 && Math.abs(Number(loja.endereco.longitude)) <= 180).map(loja => ({
    nome: loja.nome, categoria: (loja.categorias || []).join(' · ') || 'Serviços locais', cidade: loja.endereco?.cidade || '',
    lat: Number(loja.endereco.latitude), lng: Number(loja.endereco.longitude),
    link: `../Página%20de%20feed/perfil-publico.html?loja=${encodeURIComponent(loja.id)}`
  }));
}
async function carregarLojasDoMapa() {
  try { lojasPublicadasMapa = await window.AgendaUaiApi.listPublicStores(); }
  catch (error) { console.warn('Não foi possível carregar lojas para o mapa:', error); }
  if (mapa) mostrarMapa(userCoords || { latitude: -19.9677, longitude: -44.1983 });
}

// ----------------------------------------------------------
// Mapa Leaflet + OpenStreetMap: lojas aparecem mesmo sem geolocalização.
// ----------------------------------------------------------
let mapa = null;
let camadaMarcadores = null;
function mostrarMapa(coords) {
  heroArt.classList.add('has-map');
  if (typeof L === 'undefined') {
    mapBox.innerHTML = '<p class="hero__map-msg">Não foi possível carregar o mapa. Verifique sua conexão com a internet.</p>';
    return;
  }
  const { latitude: lat, longitude: lng } = coords;
  if (!mapa) {
    mapa = L.map('map').setView([lat, lng], 12);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(mapa);
    camadaMarcadores = L.layerGroup().addTo(mapa);
  }
  camadaMarcadores.clearLayers();
  const pontos = [];
  if (userCoords) {
    L.circleMarker([userCoords.latitude, userCoords.longitude], { radius: 9, color: '#fff', weight: 3, fillColor: '#2D6CA3', fillOpacity: 1 }).bindPopup('Você está aqui').addTo(camadaMarcadores);
    pontos.push([userCoords.latitude, userCoords.longitude]);
  }
  const agrupadas = new Map();
  lojasParaOMapa().forEach(loja => {
    const key = `${loja.lat.toFixed(5)},${loja.lng.toFixed(5)}`;
    if (!agrupadas.has(key)) agrupadas.set(key, []);
    agrupadas.get(key).push(loja);
  });
  agrupadas.forEach(grupo => {
    const [latLoja,lngLoja] = [grupo[0].lat,grupo[0].lng];
    const popup = document.createElement('div');
    grupo.forEach(loja => {
      const item = document.createElement('p');
      const strong = document.createElement('strong'); strong.textContent = loja.nome;
      const category = document.createElement('div'); category.textContent = loja.categoria;
      const city = document.createElement('div'); city.textContent = loja.cidade;
      const link = document.createElement('a'); link.href = loja.link; link.textContent = 'Ver perfil e agendar';
      item.append(strong, category, city);
      if (userCoords) { const km = distanciaKm(lat, lng, loja.lat, loja.lng).toFixed(1).replace('.', ','); const distance = document.createElement('div'); distance.textContent = `A ${km} km da sua localização`; item.append(distance); }
      item.append(link); popup.append(item);
    });
    L.circleMarker([latLoja,lngLoja], { radius: 9, color: '#fff', weight: 2, fillColor: '#C1272D', fillOpacity: .95 }).bindPopup(popup).addTo(camadaMarcadores);
    pontos.push([latLoja,lngLoja]);
  });
  // Na primeira visita, enquadra todos os bairros com lojas cadastradas.
  if (userCoords) mapa.setView([lat, lng], 13);
  else if (pontos.length) mapa.fitBounds(pontos, { padding: [24, 24], maxZoom: 10 });
  else mapa.setView([lat, lng], 11);
  setTimeout(() => mapa.invalidateSize(), 0);
}

// Coordenadas do usuário, preenchidas pela Geolocation API.
// Usadas para levar "lat" e "lng" junto da busca até a tela de Resultados.
let userCoords = null;

// --- Busca por texto (envia para a tela de resultados) ---
searchForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const query = searchInput.value.trim();
  if (!query) {
    searchInput.focus();
    return;
  }
  irParaResultados(query);
});

// --- Tags de exemplo preenchem e disparam a busca ---
document.querySelectorAll('.tag').forEach((tag) => {
  tag.addEventListener('click', () => {
    const query = tag.dataset.query;
    searchInput.value = query;
    irParaResultados(query);
  });
});

// Os marcadores de demonstração ainda abrem estes perfis estáticos.
// A busca abre o catálogo JSON filtrado pela categoria identificada.
const CATEGORIAS = [
  { nome: 'Barbearia', palavras: ['barbe', 'barba', 'masculin', 'degrade'] },
  { nome: 'Pet shop', palavras: ['pet', 'cachorro', 'gato', 'tosa', 'animal'] },
  { nome: 'Lava-jato', palavras: ['lava', 'carro', 'veiculo', 'automotiv'] },
  { nome: 'Clínica de estética', palavras: ['estetic', 'botox', 'depila', 'facial'] },
  { nome: 'Salão de beleza', palavras: ['salao', 'cabelo', 'cacheado', 'cabeleir', 'coloracao', 'hidrata'] },
];

function irParaResultados(query) {
  // tira acentos e põe tudo em minúsculo para comparar com as palavras-chave
  const texto = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const categoria = CATEGORIAS.find((c) => c.palavras.some((p) => texto.includes(p)));
  const destino = new URL('../Página%20de%20feed/index.html', window.location.href);
  if (categoria) destino.searchParams.set('categoria', categoria.nome);
  else destino.searchParams.delete('categoria');
  // Preserve o texto para que o feed combine a categoria sugerida com a busca.
  destino.searchParams.set('busca', query);
  window.location.href = destino.href;
}

// --- Geolocalização (Geolocation API do navegador) ---
locationButton.addEventListener('click', () => {
  if (!('geolocation' in navigator)) {
    locationStatus.textContent = 'Seu navegador não tem suporte à geolocalização.';
    locationStatus.classList.add('is-error');
    return;
  }

  locationButton.disabled = true;
  locationStatus.classList.remove('is-error');
  locationStatus.textContent = 'Localizando...';

  navigator.geolocation.getCurrentPosition(
    (position) => {
      userCoords = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      // Guarda também no localStorage, para outras telas reaproveitarem
      // a localização sem pedir permissão de novo nesta sessão.
      localStorage.setItem('agendauai:coords', JSON.stringify(userCoords));

      locationStatus.textContent = 'Localização ativada — mostrando resultados perto de você.';
      mostrarMapa(userCoords);
      locationButton.disabled = false;
    },
    (error) => {
      const mensagens = {
        1: 'Permissão de localização negada.',
        2: 'Não foi possível obter sua localização.',
        3: 'Tempo esgotado ao buscar sua localização.',
      };
      locationStatus.textContent = mensagens[error.code] || 'Erro ao obter localização.';
      locationStatus.classList.add('is-error');
      locationButton.disabled = false;
    },
    { enableHighAccuracy: true, timeout: 8000 }
  );
});

// Carrega as lojas cadastradas e exibe o mapa desde a primeira visita.
const storedCoords = localStorage.getItem('agendauai:coords');
if (storedCoords) {
  try { userCoords = JSON.parse(storedCoords); locationStatus.textContent = 'Localização ativa.'; }
  catch (e) { localStorage.removeItem('agendauai:coords'); }
}
mostrarMapa(userCoords || { latitude: -19.9677, longitude: -44.1983 });
carregarLojasDoMapa();

// --- Busca por voz (Web Speech API, quando suportada pelo navegador) ---
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
  const recognition = new SpeechRecognition();
  recognition.lang = 'pt-BR';
  recognition.interimResults = false;

  micButton.addEventListener('click', () => {
    micButton.classList.add('is-listening');
    micHint.hidden = false;
    recognition.start();
  });

  recognition.addEventListener('result', (event) => {
    const transcript = event.results[0][0].transcript;
    searchInput.value = transcript;
  });

  recognition.addEventListener('end', () => {
    micButton.classList.remove('is-listening');
    micHint.hidden = true;
  });

  recognition.addEventListener('error', () => {
    micButton.classList.remove('is-listening');
    micHint.hidden = true;
  });
} else {
  // Navegador sem suporte: o botão de microfone fica visível, mas avisa o usuário.
  micButton.addEventListener('click', () => {
    alert('Seu navegador não tem suporte à busca por voz. Use o campo de texto.');
  });
}

