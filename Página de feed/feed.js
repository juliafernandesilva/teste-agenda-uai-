document.addEventListener("DOMContentLoaded", async () => {
  const api = window.AgendaUaiApi;
  const categorySelect = document.getElementById("filtro-categoria");
  const searchInput = document.getElementById("filtro-busca");
  const grid = document.getElementById("lista-profissionais");
  const message = document.getElementById("feed-mensagem");
  const categoryNotice = document.getElementById("feed-categoria-aviso");
  const counter = document.getElementById("contador-profissionais");
  const heading = document.getElementById("titulo-resultados");

  if (!api || !categorySelect || !searchInput || !grid || !message || !counter) return;

  const normalize = value => String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
  const money = value => new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(Number(value) || 0);

  let categories = [];
  let stores = [];
  const categorySearchTerms = {
    "barbearia": ["barba", "barbeiro", "barbearia", "corte masculino", "cabelo masculino", "navalha", "pezinho", "degrade"],
    "salao-de-beleza": ["cabelo", "cabeleireiro", "cabeleireira", "escova", "unha", "manicure", "pedicure", "coloracao", "mechas"],
    "pet-shop": ["pet", "cachorro", "cão", "gato", "banho", "tosa", "veterinario"],
    "lava-jato": ["carro", "automotivo", "lavagem", "lava-jato", "polimento", "veiculo"],
    "clinica-de-estetica": ["estetica", "pele", "facial", "depilacao", "botox", "massagem", "sobrancelha"]
  };

  function selectedCategory() {
    return categories.find(category => category.slug === categorySelect.value) || null;
  }

  function setCategoryFromAddress() {
    const params = new URLSearchParams(window.location.search);
    const requested = params.get("categoria") || document.body.dataset.categoriaInicial || "";
    if (!requested) return;
    const found = categories.find(category =>
      category.id === requested ||
      category.slug === requested ||
      normalize(category.nome) === normalize(requested)
    );
    if (found) categorySelect.value = found.slug;
  }

  function setSearchFromAddress() {
    const params = new URLSearchParams(window.location.search);
    searchInput.value = params.get("busca") || "";
  }

  function updateAddress() {
    const url = new URL(window.location.href);
    const category = selectedCategory();
    if (category) url.searchParams.set("categoria", category.slug);
    else url.searchParams.delete("categoria");
    const query = searchInput.value.trim();
    if (query) url.searchParams.set("busca", query);
    else url.searchParams.delete("busca");
    window.history.replaceState({}, "", url);
  }

  function createStoreCard(store) {
    const card = document.createElement("article");
    card.className = "card-profissional";

    if (store.logo_url) {
      const image = document.createElement("img");
      image.className = "foto-profissional";
      image.src = store.logo_url;
      image.alt = `Foto da loja ${store.nome}`;
      image.loading = "lazy";
      image.onerror = () => image.remove();
      card.append(image);
    } else {
      const placeholder = document.createElement("div");
      placeholder.className = "foto-profissional feed-foto-vazia";
      placeholder.setAttribute("aria-hidden", "true");
      placeholder.textContent = String(store.nome || "A").trim().slice(0, 1).toLocaleUpperCase("pt-BR");
      card.append(placeholder);
    }

    const content = document.createElement("div");
    content.className = "conteudo-card";

    const categoriesBox = document.createElement("div");
    categoriesBox.className = "feed-categorias-card";
    (store.categorias || []).forEach(name => {
      const badge = document.createElement("span");
      badge.className = "categoria";
      badge.textContent = name;
      categoriesBox.append(badge);
    });
    if (!categoriesBox.childElementCount) {
      const badge = document.createElement("span");
      badge.className = "categoria";
      badge.textContent = "Serviços locais";
      categoriesBox.append(badge);
    }

    const title = document.createElement("h3");
    title.textContent = store.nome || "Estabelecimento AgendaUai";

    const location = document.createElement("p");
    location.className = "localizacao";
    location.textContent = [store.endereco?.bairro, store.endereco?.cidade, store.endereco?.estado]
      .filter(Boolean)
      .join(" · ") || "Endereço em atualização";

    const services = document.createElement("div");
    services.className = "servicos";
    (store.servicos || []).slice(0, 3).forEach(service => {
      const chip = document.createElement("span");
      chip.textContent = service.nome;
      services.append(chip);
    });
    if (!services.childElementCount) {
      const unavailable = document.createElement("span");
      unavailable.textContent = "Serviços em atualização";
      services.append(unavailable);
    }

    const prices = (store.servicos || []).map(service => Number(service.preco)).filter(Number.isFinite);
    const price = document.createElement("p");
    price.className = "preco";
    if (prices.length) {
      price.append("A partir de ");
      const amount = document.createElement("strong");
      amount.textContent = money(Math.min(...prices));
      price.append(amount);
    } else {
      price.textContent = "Consulte os valores dos serviços.";
    }

    const actions = document.createElement("div");
    actions.className = "feed-card-actions";
    const profileLink = document.createElement("a");
    profileLink.className = "botao-perfil botao-perfil--secundario";
    profileLink.href = `perfil-publico.html?loja=${encodeURIComponent(store.id)}`;
    profileLink.textContent = "Ver perfil";
    const bookingLink = document.createElement("a");
    bookingLink.className = "botao-perfil";
    bookingLink.href = `../agendamento/index.html?loja=${encodeURIComponent(store.id)}`;
    bookingLink.textContent = store.totalServicos ? `Agendar · ${store.totalServicos} serviços` : "Ver disponibilidade";
    actions.append(profileLink, bookingLink);

    content.append(categoriesBox, title, location, services, price, actions);
    card.append(content);
    return card;
  }

  function abrirDescricao(store) {
    let dialog = document.getElementById("feed-descricao-dialog");
    if (!dialog) {
      dialog = document.createElement("dialog");
      dialog.id = "feed-descricao-dialog";
      dialog.className = "feed-descricao-dialog";
      dialog.innerHTML = '<div class="feed-dialog-conteudo"><button type="button" class="feed-dialog-fechar" aria-label="Fechar">×</button><h2></h2><p></p></div>';
      dialog.addEventListener("click", event => { if (event.target === dialog) dialog.close(); });
      dialog.querySelector(".feed-dialog-fechar").addEventListener("click", () => dialog.close());
      document.body.append(dialog);
    }
    dialog.querySelector("h2").textContent = store.nome || "Sobre a loja";
    dialog.querySelector("p").textContent = store.descricao || "Conheça os serviços disponíveis neste estabelecimento.";
    dialog.showModal();
  }

  function render() {
    const category = selectedCategory();
    const query = normalize(searchInput.value);
    const terms = query.split(/\s+/).filter(term => term.length > 1);
    const filtered = stores.filter(store => {
      const matchesCategory = !category || (store.categoriaSlugs || []).includes(category.slug);
      const searchable = normalize([
        store.nome,
        store.descricao,
        ...(store.categorias || []),
        ...(store.servicos || []).map(service => service.nome),
        ...(store.servicos || []).map(service => service.descricao),
        store.endereco?.bairro,
        store.endereco?.cidade,
        store.endereco?.estado,
        ...(store.categoriaSlugs || []).flatMap(slug => categorySearchTerms[slug] || [])
      ].join(" "));
      const matchesSearch = !query || searchable.includes(query) ||
        (terms.length > 0 && terms.some(term => searchable.includes(term)));
      return matchesCategory && matchesSearch;
    });

    grid.replaceChildren(...filtered.map(createStoreCard));
    counter.textContent = `${filtered.length} ${filtered.length === 1 ? "estabelecimento" : "estabelecimentos"}`;
    if (heading) heading.textContent = category ? `Profissionais de ${category.nome}` : "Profissionais no AgendaUai";

    if (!stores.length) {
      message.textContent = "Ainda não há estabelecimentos publicados. Assim que as lojas forem publicadas, elas aparecerão aqui.";
      message.hidden = false;
    } else if (!filtered.length) {
      message.textContent = "Nenhum estabelecimento corresponde a esses filtros. Tente outra categoria ou busca.";
      message.hidden = false;
    } else {
      message.hidden = true;
    }
  }

  try {
    message.hidden = false;
    const [loadedCategories, loadedStores] = await Promise.all([
      api.listCategories(),
      api.listPublicStores()
    ]);
    categories = loadedCategories || [];
    stores = loadedStores || [];
    if (categoryNotice) categoryNotice.hidden = categories.length > 0;

    const options = categories.map(category => {
      const option = document.createElement("option");
      option.value = category.slug;
      option.textContent = category.nome;
      return option;
    });
    categorySelect.append(...options);
    setCategoryFromAddress();

    categorySelect.addEventListener("change", () => {
      updateAddress();
      render();
    });
    setSearchFromAddress();
    searchInput.addEventListener("input", () => { updateAddress(); render(); });
    render();
  } catch (error) {
    counter.textContent = "Indisponível";
    message.textContent = `Não foi possível carregar o feed JSON: ${error.message}`;
    message.hidden = false;
  }
});
