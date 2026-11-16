document.addEventListener("DOMContentLoaded", async () => {
  const api = window.AgendaUaiApi;
  const form = document.getElementById("perfil-form");
  if (!api || !form) return;

  const $ = id => document.getElementById(id);
  const fields = {
    nomeLoja: $("perfil-nome"),
    nomeCompleto: $("perfil-profissional"),
    categoria: $("perfil-especialidade"),
    descricao: $("perfil-descricao"),
    telefone: $("perfil-telefone"),
    instagram: $("perfil-instagram"),
    cep: $("perfil-cep"),
    rua: $("perfil-rua"),
    numero: $("perfil-numero"),
    complemento: $("perfil-complemento"),
    bairro: $("perfil-bairro"),
    cidade: $("perfil-cidade"),
    estado: $("perfil-estado")
  };
  const photoInput = $("perfil-foto");
  const message = $("perfil-msg");
  const workPhotoInput = $("perfil-fotos-trabalho");
  const workPhotoCaption = $("perfil-foto-legenda");
  const workPhotoButton = $("perfil-fotos-enviar");
  const workPhotoGrid = $("portfolio-grid");
  const workPhotoMessage = $("portfolio-msg");
  let saved = null;
  let previewPhotoUrl = "";
  let workPhotos = [];

  function renderWorkPhotos() {
    workPhotoGrid.replaceChildren();
    if (!workPhotos.length) {
      workPhotoGrid.textContent = "Suas fotos de trabalho aparecerão aqui e no perfil público da loja.";
      workPhotoGrid.classList.add("portfolio-empty");
      return;
    }
    workPhotoGrid.classList.remove("portfolio-empty");
    workPhotos.forEach(photo => {
      const item = document.createElement("figure");
      item.className = "portfolio-item";
      const image = document.createElement("img");
      image.src = photo.url;
      image.alt = photo.legenda || "Foto de trabalho";
      const caption = document.createElement("figcaption");
      caption.textContent = photo.legenda || "Trabalho realizado";
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "portfolio-remove";
      remove.textContent = "Remover";
      remove.addEventListener("click", async () => {
        remove.disabled = true;
        try {
          await api.deleteWorkPhoto(photo.id);
          workPhotos = workPhotos.filter(entry => entry.id !== photo.id);
          renderWorkPhotos();
          workPhotoMessage.textContent = "Foto removida do perfil.";
        } catch (error) {
          workPhotoMessage.textContent = `Não foi possível remover a foto: ${error.message}`;
          remove.disabled = false;
        }
      });
      item.append(image, caption, remove);
      workPhotoGrid.append(item);
    });
  }

  workPhotoInput.addEventListener("change", () => {
    const files = Array.from(workPhotoInput.files || []);
    if (files.length + workPhotos.length > 12) {
      workPhotoInput.value = "";
      workPhotoMessage.textContent = "O perfil pode ter até 12 fotos de trabalho.";
      return;
    }
    const invalid = files.find(file => !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024);
    if (invalid) {
      workPhotoInput.value = "";
      workPhotoMessage.textContent = "Use imagens JPG, PNG ou WEBP de até 5 MB cada.";
      return;
    }
    workPhotoMessage.textContent = files.length ? `${files.length} foto(s) selecionada(s).` : "";
  });

  workPhotoButton.addEventListener("click", async () => {
    const files = Array.from(workPhotoInput.files || []);
    if (!files.length) {
      workPhotoMessage.textContent = "Escolha pelo menos uma foto.";
      return;
    }
    if (files.length + workPhotos.length > 12) {
      workPhotoMessage.textContent = "O perfil pode ter até 12 fotos de trabalho.";
      return;
    }
    workPhotoButton.disabled = true;
    workPhotoMessage.textContent = "Enviando fotos…";
    try {
      for (const file of files) {
        const photo = await api.addWorkPhoto(file, workPhotoCaption.value.trim());
        workPhotos.push(photo);
      }
      workPhotoInput.value = "";
      workPhotoCaption.value = "";
      renderWorkPhotos();
      workPhotoMessage.textContent = "Fotos adicionadas ao perfil público.";
    } catch (error) {
      workPhotoMessage.textContent = `Não foi possível enviar as fotos: ${error.message}`;
      workPhotos = await api.listWorkPhotos().catch(() => workPhotos);
      renderWorkPhotos();
    } finally {
      workPhotoButton.disabled = false;
    }
  });

  function formatAddress(address) {
    return [
      [address.rua, address.numero].filter(Boolean).join(", "),
      address.complemento,
      address.bairro,
      [address.cidade, address.estado].filter(Boolean).join(" - "),
      address.cep
    ].filter(Boolean).join(" · ");
  }

  function render() {
    const storeName = fields.nomeLoja.value.trim();
    const personName = fields.nomeCompleto.value.trim();
    $("preview-nome").textContent = storeName || "Nome da sua loja";
    $("preview-especialidade").textContent = fields.categoria.selectedOptions[0]?.textContent || "Escolha a categoria da loja";
    $("preview-descricao").textContent = fields.descricao.value.trim() || "A descrição da sua loja aparecerá aqui.";
    $("preview-telefone").textContent = fields.telefone.value.trim() || "Adicione o WhatsApp da loja";
    $("preview-endereco").textContent = formatAddress({
      rua: fields.rua.value.trim(), numero: fields.numero.value.trim(),
      complemento: fields.complemento.value.trim(), bairro: fields.bairro.value.trim(),
      cidade: fields.cidade.value.trim(), estado: fields.estado.value.trim(), cep: fields.cep.value.trim()
    }) || "Adicione o endereço da loja";
    $("preview-instagram").textContent = fields.instagram.value.trim() || "Adicione o Instagram";

    const avatar = $("preview-avatar");
    const photoUrl = previewPhotoUrl || saved?.store?.logo_url || "";
    if (photoUrl) {
      avatar.replaceChildren();
      const image = document.createElement("img");
      image.src = photoUrl;
      image.alt = "Foto da loja";
      avatar.append(image);
    } else {
      avatar.textContent = (storeName || personName || "AU").split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();
    }
  }

  function instagramUrl(value) {
    const text = value.trim();
    if (!text) return "";
    if (/^https?:\/\//i.test(text)) return new URL(text).href;
    return `https://www.instagram.com/${text.replace(/^@/, "").replace(/^\/+|\/+$/g, "")}/`;
  }

  Object.values(fields).forEach(input => input.addEventListener("input", render));
  fields.categoria.addEventListener("change", render);
  photoInput.addEventListener("change", () => {
    const file = photoInput.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      photoInput.value = "";
      message.textContent = "Escolha uma imagem JPG, PNG ou WEBP.";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      photoInput.value = "";
      message.textContent = "A imagem deve ter no máximo 5 MB.";
      return;
    }
    if (previewPhotoUrl.startsWith("blob:")) URL.revokeObjectURL(previewPhotoUrl);
    previewPhotoUrl = URL.createObjectURL(file);
    render();
  });

  form.addEventListener("submit", async event => {
    event.preventDefault();
    message.className = "form-msg";
    const address = {
      cep: fields.cep.value.trim(),
      rua: fields.rua.value.trim(),
      numero: fields.numero.value.trim(),
      complemento: fields.complemento.value.trim(),
      bairro: fields.bairro.value.trim(),
      cidade: fields.cidade.value.trim(),
      estado: fields.estado.value.trim().toUpperCase()
    };
    const addressValues = [address.cep, address.rua, address.numero, address.bairro, address.cidade, address.estado];
    const anyAddressValue = Object.values(address).some(Boolean);
    if (!fields.nomeLoja.value.trim() || !fields.nomeCompleto.value.trim()) {
      message.textContent = "Informe o nome da loja e seu nome completo.";
      return;
    }
    if (!fields.categoria.value) {
      message.textContent = "Selecione a categoria do estabelecimento.";
      fields.categoria.focus();
      return;
    }
    if (anyAddressValue && addressValues.some(value => !value)) {
      message.textContent = "Para salvar o endereço, preencha CEP, rua, número, bairro, cidade e UF.";
      return;
    }
    if (address.estado && !/^[A-Z]{2}$/.test(address.estado)) {
      message.textContent = "A UF deve ter duas letras, por exemplo MG.";
      return;
    }

    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    message.textContent = "Salvando neste navegador…";
    try {
      await api.saveProfessionalProfile({
        nomeLoja: fields.nomeLoja.value.trim(),
        nomeCompleto: fields.nomeCompleto.value.trim(),
        categoriaId: fields.categoria.value,
        descricao: fields.descricao.value.trim(),
        telefone: fields.telefone.value.trim(),
        instagram: instagramUrl(fields.instagram.value),
        endereco: address,
        foto: photoInput.files?.[0] || null,
        fotoUrl: saved?.store?.logo_url || saved?.user?.avatar_url || ""
      });
      saved = await api.getProfessionalProfile();
      photoInput.value = "";
      if (previewPhotoUrl.startsWith("blob:")) URL.revokeObjectURL(previewPhotoUrl);
      previewPhotoUrl = "";
      message.className = "form-msg success";
      message.textContent = "Perfil e dados da loja salvos.";
      render();
    } catch (error) {
      message.className = "form-msg";
      message.textContent = `Não foi possível salvar: ${error.message}`;
    } finally {
      button.disabled = false;
    }
  });

  try {
    const categories = await api.listCategories();
    categories.forEach(category => {
      const option = document.createElement("option");
      option.value = category.id;
      option.textContent = category.nome;
      fields.categoria.append(option);
    });
  } catch (error) {
    fields.categoria.replaceChildren(new Option("Categorias indisponíveis", ""));
    message.textContent = `Não foi possível carregar as categorias: ${error.message}`;
  }

  try {
    saved = await api.getProfessionalProfile();
    fields.nomeLoja.value = saved.store.nome || "";
    fields.nomeCompleto.value = saved.user.nome_completo || "";
    fields.categoria.value = saved.categoryId || "";
    fields.descricao.value = saved.store.descricao || "";
    fields.telefone.value = saved.store.whatsapp || saved.user.telefone || "";
    fields.instagram.value = saved.instagram || "";
    Object.entries(saved.address).forEach(([key, value]) => {
      const field = fields[key];
      if (field) field.value = value || "";
    });
    render();
  } catch (error) {
    message.textContent = `Não foi possível carregar o perfil: ${error.message}. Confira o armazenamento local do navegador e tente novamente.`;
  }
  try { workPhotos = await api.listWorkPhotos(); }
  catch (error) { workPhotoMessage.textContent = `Não foi possível carregar as fotos: ${error.message}. Atualize a página e tente novamente.`; }
  renderWorkPhotos();
});
