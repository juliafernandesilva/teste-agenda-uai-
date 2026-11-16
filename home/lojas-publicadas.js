document.addEventListener("DOMContentLoaded", async () => {
  const api = window.AgendaUaiApi;
  const grid = document.getElementById("lista-lojas-publicadas");
  const message = document.getElementById("lojas-publicadas-mensagem");
  const categoryGrid = document.getElementById("categorias-do-catalogo");
  if (!api || !grid || !message) return;

  const normalize = value => String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();

  function renderCategories(categories) {
    if (!categoryGrid) return;
    categoryGrid.replaceChildren();

    if (!categories.length) {
      const empty = document.createElement("p");
      empty.className = "public-stores__message";
      empty.textContent = "Nenhuma categoria ativa foi encontrada no catálogo JSON.";
      categoryGrid.append(empty);
    } else {
      categories.forEach(category => {
        const link = document.createElement("a");
        link.className = "service-card";
        link.href = `../Página%20de%20feed/index.html?categoria=${encodeURIComponent(category.slug)}`;
        link.textContent = category.nome;
        categoryGrid.append(link);
      });
    }

    const all = document.createElement("a");
    all.className = "service-card service-card--all";
    all.href = "../Página%20de%20feed/index.html";
    all.textContent = "Ver todos os profissionais";
    categoryGrid.append(all);
  }

  function storeMatchesCategory(store, category) {
    if (!category) return true;
    return (store.categoriaIds || []).includes(category.id) ||
      (store.categoriaSlugs || []).includes(category.slug) ||
      (store.categorias || []).some(name => normalize(name) === normalize(category.nome));
  }

  function renderStores(stores, category) {
    const heading = document.querySelector("#lojas-publicadas .section-title");
    const visibleStores = stores.filter(store => storeMatchesCategory(store, category));
    if (heading) heading.textContent = category ? `Lojas de ${category.nome}` : "Lojas no AgendaUai";

    grid.replaceChildren();
    if (!visibleStores.length) {
      message.textContent = category
        ? `Ainda não há lojas publicadas na categoria ${category.nome}.`
        : "Ainda não há lojas publicadas. Volte em breve para conhecer os estabelecimentos do AgendaUai.";
      grid.append(message);
      return;
    }

    visibleStores.forEach(store => {
      const card = document.createElement("article");
      card.className = "public-store-card";
      const profileImage = store.foto_url || store.logo_url;
      if (profileImage) {
        const image = document.createElement("img");
        image.className = "public-store-card__image";
        image.src = profileImage;
        image.alt = `Foto de ${store.nome}`;
        image.loading = "lazy";
        card.append(image);
      }

      const content = document.createElement("div");
      content.className = "public-store-card__content";
      const name = document.createElement("h3");
      name.textContent = store.nome;
      const categoryLabel = document.createElement("p");
      categoryLabel.className = "public-store-card__category";
      categoryLabel.textContent = store.categorias.join(" · ") || "Serviços locais";
      const description = document.createElement("p");
      description.className = "public-store-card__description";
      description.textContent = store.descricao || "Conheça os serviços e horários deste estabelecimento.";
      const address = document.createElement("p");
      address.className = "public-store-card__address";
      address.textContent = [store.endereco?.bairro, store.endereco?.cidade, store.endereco?.estado]
        .filter(Boolean).join(" · ") || "Endereço em atualização";
      const link = document.createElement("a");
      link.className = "btn btn--primary";
      link.href = `../Página%20de%20feed/perfil-publico.html?loja=${encodeURIComponent(store.id)}`;
      link.textContent = "Ver perfil e agendar";

      content.append(name, categoryLabel, description, address, link);
      card.append(content);
      grid.append(card);
    });
  }

  try {
    const [categories, stores] = await Promise.all([
      api.listCategories(),
      api.listPublicStores()
    ]);
    renderCategories(categories || []);

    const requested = new URLSearchParams(window.location.search).get("categoria") || "";
    const category = (categories || []).find(item =>
      item.id === requested || item.slug === requested || normalize(item.nome) === normalize(requested)
    ) || null;
    renderStores(stores || [], category);
  } catch (error) {
    if (categoryGrid) {
      categoryGrid.replaceChildren();
      const categoryError = document.createElement("p");
      categoryError.className = "public-stores__message";
      categoryError.textContent = `As categorias não puderam ser carregadas: ${error.message}`;
      categoryGrid.append(categoryError);
    }
    message.textContent = `Não foi possível carregar as lojas do catálogo JSON: ${error.message}`;
    grid.replaceChildren(message);
  }
});

