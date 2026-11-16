document.addEventListener("DOMContentLoaded", async () => {
  const api = window.AgendaUaiApi;
  const list = document.getElementById("lista-lojas");
  const empty = document.getElementById("lojas-vazias");
  const message = document.getElementById("lojas-msg");
  try {
    const [stores, current] = await Promise.all([api.listStores(), api.getStore()]);
    empty.hidden = stores.length > 0;
    list.replaceChildren();
    stores.forEach(store => {
      const card = document.createElement("article");
      card.className = "item-row";
      const detail = document.createElement("div");
      detail.className = "item-main";
      const name = document.createElement("strong");
      name.textContent = store.nome;
      const status = document.createElement("span");
      const statusLabels = { publicada: "Publicada", pausada: "Pausada", arquivada: "Arquivada", rascunho: "Rascunho" };
      status.textContent = `${statusLabels[store.status] || store.status}${current?.id === store.id ? " · selecionada" : ""}`;
      detail.append(name, status);
      const select = document.createElement("button");
      select.type = "button";
      select.className = "btn-action btn-ghost";
      select.textContent = current?.id === store.id ? "Selecionada" : "Administrar esta loja";
      select.disabled = current?.id === store.id;
      select.addEventListener("click", async () => {
        select.disabled = true;
        try {
          await api.setStoreId(store.id);
          window.location.href = "index.html";
        } catch (error) {
          message.textContent = `Não foi possível selecionar a loja: ${error.message}`;
          select.disabled = false;
        }
      });
      const actions = document.createElement("div");
      actions.className = "form-actions";
      const statusButton = document.createElement("button");
      statusButton.type = "button";
      statusButton.className = "btn-action btn-red-outline";
      statusButton.textContent = store.status === "publicada" ? "Pausar loja" : "Publicar loja";
      statusButton.disabled = store.status === "arquivada";
      statusButton.addEventListener("click", async () => {
        statusButton.disabled = true;
        try {
          const nextStatus = store.status === "publicada" ? "pausada" : "publicada";
          await api.setStoreStatus(store.id, nextStatus);
          window.location.reload();
        } catch (error) {
          message.textContent = `Não foi possível atualizar a loja: ${error.message}`;
          statusButton.disabled = false;
        }
      });
      actions.append(select, statusButton);
      card.append(detail, actions);
      list.append(card);
    });
  } catch (error) {
    message.textContent = `Não foi possível carregar suas lojas: ${error.message}`;
  }
});
