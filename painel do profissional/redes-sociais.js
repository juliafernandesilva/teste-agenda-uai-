document.addEventListener("DOMContentLoaded", async () => {
  const api = window.AgendaUaiApi;
  const form = document.getElementById("form-rede");
  const list = document.getElementById("lista-redes");
  const empty = document.getElementById("redes-vazio");
  const message = document.getElementById("rede-msg");
  if (!api || !form || !list) return;

  const type = document.getElementById("rede-tipo");
  const value = document.getElementById("rede-valor");
  const titleByType = {
    instagram: "Perfil ou endereço do Instagram",
    whatsapp: "Número com DDD",
    facebook: "Perfil ou endereço do Facebook",
    tiktok: "Perfil ou endereço do TikTok",
    youtube: "Canal ou endereço do YouTube",
    site: "Endereço do site"
  };
  const domainByType = {
    instagram: "instagram.com",
    facebook: "facebook.com",
    tiktok: "tiktok.com/@",
    youtube: "youtube.com/@"
  };

  type.addEventListener("change", () => {
    document.getElementById("rede-label").textContent = titleByType[type.value] || "Endereço";
    document.getElementById("rede-dica").textContent = type.value === "whatsapp"
      ? "Informe o número brasileiro com DDD, somente dígitos ou com formatação."
      : "Cole o endereço completo ou informe o nome do perfil.";
  });

  function normalizeUrl(platform, raw) {
    const input = raw.trim();
    if (platform === "whatsapp") {
      let digits = input.replace(/\D/g, "");
      if (digits.length === 10 || digits.length === 11) digits = "55" + digits;
      if (digits.length < 12 || digits.length > 13) throw new Error("Informe um número válido com DDD.");
      return `https://wa.me/${digits}`;
    }
    if (/^https?:\/\//i.test(input)) {
      const url = new URL(input);
      if (!url.hostname.includes(".")) throw new Error("Informe um endereço válido.");
      return url.href;
    }
    const profile = input.replace(/^@/, "").replace(/^\/+|\/+$/g, "");
    const domain = domainByType[platform];
    if (!domain || !profile) throw new Error("Informe o endereço completo do perfil.");
    return `https://www.${domain}${domain.endsWith("/@") ? profile : "/" + profile}`;
  }

  async function render() {
    const rows = await api.getSocialLinks();
    list.replaceChildren();
    empty.hidden = rows.length > 0;
    rows.forEach(row => {
      const item = document.createElement("li");
      item.className = "item-row";
      const link = document.createElement("a");
      link.href = row.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = `${row.plataforma}: ${row.url}`;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "btn-action btn-red-outline";
      remove.textContent = "Remover";
      remove.addEventListener("click", async () => {
        remove.disabled = true;
        try {
          await api.deleteSocialLink(row.id);
          await render();
        } catch (error) {
          message.textContent = `Não foi possível remover: ${error.message}`;
          remove.disabled = false;
        }
      });
      item.append(link, remove);
      list.append(item);
    });
  }

  form.addEventListener("submit", async event => {
    event.preventDefault();
    message.textContent = "";
    try {
      await api.createSocialLink({ plataforma: type.value, url: normalizeUrl(type.value, value.value) });
      form.reset();
      type.dispatchEvent(new Event("change"));
      message.className = "form-msg success";
      message.textContent = "Rede social salva na loja.";
      await render();
    } catch (error) {
      message.className = "form-msg";
      message.textContent = `Não foi possível salvar: ${error.message}`;
    }
  });

  try {
    await render();
  } catch (error) {
    message.textContent = `Não foi possível carregar as redes da loja: ${error.message}`;
  }
});
