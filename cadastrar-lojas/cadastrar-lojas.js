/* =========================================================
   CADASTRAR LOJA — AGENDAUAI
   Comportamento da tela: foto, contador, público-alvo,
   serviços e validação final.
   Os dados são enviados à API local e salvos em arquivos JSON.
========================================================= */

(function () {
    "use strict";

    /* ---------------------------------
       CONFIGURAÇÕES (fáceis de mudar)
    --------------------------------- */
    const LIMITE_DESCRICAO = 600;
    const LIMITE_PUBLICOS = 7;
    const TAMANHO_MAX_FOTO_MB = 5;
    const TIPOS_FOTO = ["image/jpeg", "image/png", "image/webp"];

    // Opções que aparecem no popup do público-alvo
    const OPCOES_PUBLICO = [
        "Crianças",
        "Adolescentes",
        "Jovens adultos",
        "Adultos",
        "Idosos",
        "Mulheres",
        "Homens",
        "Famílias",
        "Casais",
        "Gestantes",
        "Pessoas com deficiência",
        "Donos de pets",
        "Empresas e profissionais",
        "Moradores do bairro"
    ];


    /* ---------------------------------
       ELEMENTOS DA PÁGINA
    --------------------------------- */
    const $ = (id) => document.getElementById(id);

    const form = $("form-cadastro-loja");
    const mensagem = $("mensagem-cadastro");
    const nomeLoja = $("nome-loja");
    const categoriaLoja = $("categoria-loja");
    const enderecoLoja = $("endereco-loja");
    const bairroLoja = $("bairro-loja");
    const cidadeLoja = $("cidade-loja");
    const estadoLoja = $("estado-loja");
    const cepLoja = $("cep-loja");
    const latitudeLoja = $("latitude-loja");
    const longitudeLoja = $("longitude-loja");
    const localizarEndereco = $("localizar-endereco");
    const statusLocalizacao = $("status-localizacao");
    const api = window.AgendaUaiApi;

    async function geocodificarEndereco() {
        const partes = [enderecoLoja.value, bairroLoja.value, cidadeLoja.value, estadoLoja.value, cepLoja.value, "Brasil"].filter(Boolean);
        if (partes.length < 5) { statusLocalizacao.textContent = "Preencha rua, bairro, cidade e estado antes de localizar."; return false; }
        localizarEndereco.disabled = true;
        statusLocalizacao.textContent = "Localizando endereço…";
        try {
            const url = new URL("https://nominatim.openstreetmap.org/search");
            url.searchParams.set("format", "jsonv2"); url.searchParams.set("limit", "1"); url.searchParams.set("q", partes.join(", "));
            const response = await fetch(url, { headers: { "Accept-Language": "pt-BR" } });
            if (!response.ok) throw new Error("O serviço de mapas não respondeu.");
            const results = await response.json();
            if (!results.length) throw new Error("Endereço não encontrado. Confira os dados ou informe as coordenadas manualmente.");
            latitudeLoja.value = Number(results[0].lat).toFixed(7);
            longitudeLoja.value = Number(results[0].lon).toFixed(7);
            statusLocalizacao.textContent = "Endereço localizado! Confira as coordenadas antes de salvar.";
            statusLocalizacao.style.color = "#237a4b";
            return true;
        } catch (error) {
            statusLocalizacao.textContent = `${error.message} Você pode preencher latitude e longitude manualmente.`;
            statusLocalizacao.style.color = "#b42318";
            return false;
        } finally { localizarEndereco.disabled = false; }
    }
    localizarEndereco?.addEventListener("click", geocodificarEndereco);
    [enderecoLoja, bairroLoja, cidadeLoja, estadoLoja, cepLoja].forEach(input => input?.addEventListener("change", () => {
        latitudeLoja.value = ""; longitudeLoja.value = "";
        statusLocalizacao.textContent = "Endereço alterado. Localize novamente para atualizar o ponto no mapa.";
    }));

    // Foto
    const inputFoto = $("foto-loja");
    const areaFoto = $("foto-loja-preview");

    // Descrição
    const descricao = $("descricao-loja");
    const contadorDescricao = $("contador-descricao");

    // Público-alvo
    const publicosSelecionadosBox = $("publicos-selecionados");
    const botaoAbrirPublicos = $("abrir-popup-publicos");
    const popupPublicos = $("popup-publicos");
    const opcoesPublicosBox = $("opcoes-publicos");
    const contadorPublicos = $("contador-publicos");
    const erroPublicos = $("erro-publicos");
    const botaoFecharPublicos = $("fechar-popup-publicos");
    const botaoCancelarPublicos = $("cancelar-publicos");
    const botaoConcluirPublicos = $("concluir-publicos");

    // Serviços
    const listaServicos = $("servicos-lista");
    const semServicos = $("sem-servicos");
    const botaoAbrirServico = $("abrir-cadastro-servico");
    const formServico = $("form-servico-container");
    const nomeServico = $("nome-servico");
    const precoServico = $("preco-servico");
    const duracaoServico = $("duracao-servico");
    const botaoCancelarServico = $("cancelar-servico");
    const botaoSalvarServico = $("salvar-servico");


    /* ---------------------------------
       ESTADO (dados em memória)
    --------------------------------- */
    let urlFotoAtual = null;        // endereço temporário da foto
    let publicosConfirmados = [];   // públicos já concluídos
    let servicos = [];              // serviços cadastrados
    let proximoIdServico = 1;

    async function carregarCategorias() {
        if (!categoriaLoja || !api) return;
        try {
            const categorias = await api.listCategories();
            categoriaLoja.replaceChildren(new Option("Selecione uma categoria", ""));
            categorias.forEach(categoria => categoriaLoja.add(new Option(categoria.nome, categoria.id)));
            if (!categorias.length) categoriaLoja.replaceChildren(new Option("Nenhuma categoria disponível", ""));
        } catch (error) {
            categoriaLoja.replaceChildren(new Option("Não foi possível carregar as categorias", ""));
            mostrarMensagem(`Não foi possível carregar as categorias: ${error.message}`, true);
        }
    }
    carregarCategorias();


    /* =========================================================
       MENSAGEM GERAL (sucesso ou erro)
    ========================================================= */
    function mostrarMensagem(texto, ehErro) {
        mensagem.textContent = texto;
        mensagem.classList.toggle("erro", Boolean(ehErro));

        if (texto) {
            mensagem.scrollIntoView({ behavior: "smooth", block: "center" });
        }
    }


    /* =========================================================
       1. FOTO DA LOJA — mostra a imagem escolhida no bloco
    ========================================================= */
    function mostrarFoto(arquivo) {
        // Libera a foto anterior da memória do navegador
        if (urlFotoAtual) {
            URL.revokeObjectURL(urlFotoAtual);
        }

        // Cria um endereço temporário para exibir a imagem
        urlFotoAtual = URL.createObjectURL(arquivo);

        areaFoto.innerHTML = "";
        areaFoto.classList.add("tem-foto");

        const imagem = document.createElement("img");
        imagem.src = urlFotoAtual;
        imagem.alt = "Foto escolhida para a loja";

        const aviso = document.createElement("span");
        aviso.className = "foto-loja-troca";
        aviso.textContent = "Clique para trocar a foto";

        areaFoto.appendChild(imagem);
        areaFoto.appendChild(aviso);
    }

    function limparFoto() {
        if (urlFotoAtual) {
            URL.revokeObjectURL(urlFotoAtual);
            urlFotoAtual = null;
        }

        inputFoto.value = "";
        areaFoto.classList.remove("tem-foto");
        areaFoto.innerHTML =
            '<span class="foto-loja-placeholder">+</span>' +
            '<span class="foto-loja-placeholder-text">Adicionar foto</span>';
    }

    inputFoto.addEventListener("change", function () {
        const arquivo = inputFoto.files[0];

        // Se a pessoa cancelou a janela de escolha, não muda nada
        if (!arquivo) {
            return;
        }

        if (!TIPOS_FOTO.includes(arquivo.type)) {
            limparFoto();
            mostrarMensagem("Formato inválido. Use uma imagem JPG, PNG ou WEBP.", true);
            return;
        }

        if (arquivo.size > TAMANHO_MAX_FOTO_MB * 1024 * 1024) {
            limparFoto();
            mostrarMensagem("A foto é muito grande. O limite é de " + TAMANHO_MAX_FOTO_MB + " MB.", true);
            return;
        }

        mostrarMensagem("", false);
        mostrarFoto(arquivo);
    });


    /* =========================================================
       2. DESCRIÇÃO — contador e bloqueio no limite
    ========================================================= */
    function atualizarContadorDescricao() {
        // Garante o limite mesmo se o texto for colado
        if (descricao.value.length > LIMITE_DESCRICAO) {
            descricao.value = descricao.value.slice(0, LIMITE_DESCRICAO);
        }

        const total = descricao.value.length;
        contadorDescricao.textContent = total;

        const caixaContador = contadorDescricao.parentElement;
        caixaContador.classList.toggle("perto", total >= LIMITE_DESCRICAO * 0.9 && total < LIMITE_DESCRICAO);
        caixaContador.classList.toggle("limite", total >= LIMITE_DESCRICAO);
    }

    descricao.setAttribute("maxlength", LIMITE_DESCRICAO);
    descricao.addEventListener("input", atualizarContadorDescricao);
    atualizarContadorDescricao();


    /* =========================================================
       3. PÚBLICO-ALVO — popup com as opções
    ========================================================= */

    // Cria as opções (checkboxes) dentro do popup, uma única vez
    function criarOpcoesPublico() {
        opcoesPublicosBox.innerHTML = "";

        OPCOES_PUBLICO.forEach(function (nome) {
            const rotulo = document.createElement("label");
            rotulo.className = "cadastro-loja-opcao-publico";

            const caixa = document.createElement("input");
            caixa.type = "checkbox";
            caixa.value = nome;

            const texto = document.createElement("span");
            texto.textContent = nome;

            rotulo.appendChild(caixa);
            rotulo.appendChild(texto);
            opcoesPublicosBox.appendChild(rotulo);
        });
    }

    function caixasPublico() {
        return Array.from(opcoesPublicosBox.querySelectorAll("input[type='checkbox']"));
    }

    function marcadosNoPopup() {
        return caixasPublico().filter((c) => c.checked).map((c) => c.value);
    }

    function atualizarContadorPublicos() {
        contadorPublicos.textContent = marcadosNoPopup().length;
    }

    // Marca no popup apenas o que já foi confirmado antes
    function sincronizarPopupComConfirmados() {
        caixasPublico().forEach(function (caixa) {
            caixa.checked = publicosConfirmados.includes(caixa.value);
        });
        erroPublicos.textContent = "";
        atualizarContadorPublicos();
    }

    function abrirPopupPublicos() {
        sincronizarPopupComConfirmados();
        popupPublicos.hidden = false;
        document.body.style.overflow = "hidden";

        const primeira = caixasPublico()[0];
        if (primeira) {
            primeira.focus();
        }
    }

    function fecharPopupPublicos() {
        popupPublicos.hidden = true;
        document.body.style.overflow = "";
        botaoAbrirPublicos.focus();
    }

    // Controla o limite de 7 opções
    opcoesPublicosBox.addEventListener("change", function (evento) {
        if (marcadosNoPopup().length > LIMITE_PUBLICOS) {
            evento.target.checked = false;
            erroPublicos.textContent =
                "Você pode selecionar no máximo " + LIMITE_PUBLICOS + " opções.";
        } else {
            erroPublicos.textContent = "";
        }

        atualizarContadorPublicos();
    });

    // Mostra as etiquetas (tags) dos públicos confirmados
    function renderizarPublicosConfirmados() {
        publicosSelecionadosBox.innerHTML = "";

        publicosConfirmados.forEach(function (nome) {
            const etiqueta = document.createElement("span");
            etiqueta.className = "cadastro-loja-publico-tag";

            const texto = document.createElement("span");
            texto.textContent = nome;

            const remover = document.createElement("button");
            remover.type = "button";
            remover.className = "cadastro-loja-remover-publico";
            remover.setAttribute("aria-label", "Remover " + nome);
            remover.textContent = "×";
            remover.addEventListener("click", function () {
                publicosConfirmados = publicosConfirmados.filter((p) => p !== nome);
                renderizarPublicosConfirmados();
            });

            etiqueta.appendChild(texto);
            etiqueta.appendChild(remover);
            publicosSelecionadosBox.appendChild(etiqueta);
        });
    }

    botaoAbrirPublicos.addEventListener("click", abrirPopupPublicos);
    botaoFecharPublicos.addEventListener("click", fecharPopupPublicos);
    botaoCancelarPublicos.addEventListener("click", fecharPopupPublicos);

    botaoConcluirPublicos.addEventListener("click", function () {
        publicosConfirmados = marcadosNoPopup();
        renderizarPublicosConfirmados();
        fecharPopupPublicos();
    });

    // Clicar fora da janela também fecha o popup
    popupPublicos.addEventListener("click", function (evento) {
        if (evento.target === popupPublicos) {
            fecharPopupPublicos();
        }
    });

    // Tecla Esc fecha o popup
    document.addEventListener("keydown", function (evento) {
        if (evento.key === "Escape" && !popupPublicos.hidden) {
            fecharPopupPublicos();
        }
    });

    criarOpcoesPublico();

    function renderizarServicos() {
        listaServicos.replaceChildren();
        if (!servicos.length) {
            listaServicos.append(semServicos);
            return;
        }
        servicos.forEach(function (servico, indice) {
            const item = document.createElement("article");
            item.className = "cadastro-loja-servico-item";
            const texto = document.createElement("div");
            const titulo = document.createElement("strong");
            titulo.textContent = servico.nome;
            const detalhe = document.createElement("p");
            detalhe.textContent = `R$ ${Number(servico.preco).toFixed(2).replace(".", ",")} · ${servico.duracaoMinutos} min`;
            texto.append(titulo, detalhe);
            const remover = document.createElement("button");
            remover.type = "button";
            remover.className = "cadastro-loja-remover-publico";
            remover.textContent = "Remover";
            remover.setAttribute("aria-label", `Remover serviço ${servico.nome}`);
            remover.addEventListener("click", function () {
                servicos.splice(indice, 1);
                renderizarServicos();
            });
            item.append(texto, remover);
            listaServicos.append(item);
        });
    }

    botaoAbrirServico.addEventListener("click", function (evento) {
        evento.preventDefault();
        formServico.hidden = false;
        nomeServico.focus();
    });
    botaoCancelarServico.addEventListener("click", function () {
        formServico.hidden = true;
        nomeServico.value = "";
        precoServico.value = "";
        duracaoServico.value = "";
    });
    botaoSalvarServico.addEventListener("click", function () {
        const nome = nomeServico.value.trim();
        const preco = Number(precoServico.value);
        const duracaoMinutos = Number(duracaoServico.value);
        if (!nome || !Number.isFinite(preco) || preco < 0 || !Number.isInteger(duracaoMinutos) || duracaoMinutos < 1) {
            mostrarMensagem("Preencha o nome, o preço e a duração do serviço.", true);
            return;
        }
        servicos.push({ nome, preco, duracaoMinutos, descricao: "" });
        renderizarServicos();
        nomeServico.value = "";
        precoServico.value = "";
        duracaoServico.value = "";
        formServico.hidden = true;
        mostrarMensagem("Serviço adicionado ao cadastro da loja.", false);
    });


    
    /* =========================================================
       5. ENVIO DO FORMULÁRIO (validação final)
    ========================================================= */
    form.addEventListener("submit", async function (evento) {
        evento.preventDefault();

        if (!nomeLoja.value.trim()) {
            mostrarMensagem("Informe o nome da loja.", true);
            nomeLoja.focus();
            return;
        }

        if (!categoriaLoja.value) {
            mostrarMensagem("Selecione a categoria do estabelecimento.", true);
            categoriaLoja.focus();
            return;
        }
        if (!latitudeLoja.value || !longitudeLoja.value || !Number.isFinite(Number(latitudeLoja.value)) || !Number.isFinite(Number(longitudeLoja.value))) {
            mostrarMensagem("Localize o endereço no mapa ou informe latitude e longitude válidas.", true);
            localizarEndereco.focus();
            return;
        }

        if (!inputFoto.files[0]) {
            mostrarMensagem("Adicione uma foto da loja.", true);
            return;
        }

        if (descricao.value.trim().length === 0) {
            mostrarMensagem("Escreva a descrição da sua loja.", true);
            descricao.focus();
            return;
        }

        if (publicosConfirmados.length === 0) {
            mostrarMensagem("Escolha pelo menos um público-alvo.", true);
            return;
        }

        if (servicos.length === 0) {
            mostrarMensagem("Cadastre pelo menos um serviço.", true);
            return;
        }

        const botaoEnviar = form.querySelector('button[type="submit"]');
        if (!api) {
            mostrarMensagem("Não foi possível acessar a camada local do navegador. Atualize a página e tente novamente.", true);
            return;
        }
        botaoEnviar.disabled = true;
        try {
            await api.createStore({
                nome: nomeLoja.value.trim(),
                categoriaId: categoriaLoja.value,
                descricao: descricao.value.trim(),
                publicos: publicosConfirmados,
                servicos: servicos.map(item => ({
                    nome: item.nome,
                    descricao: item.descricao || "",
                    preco: Number(item.preco),
                    duracao_minutos: Number(item.duracaoMinutos)
                })),
                foto: inputFoto.files[0],
                endereco: { rua: enderecoLoja.value.trim(), bairro: bairroLoja.value.trim(), cidade: cidadeLoja.value.trim(), estado: estadoLoja.value.trim().toUpperCase(), cep: cepLoja.value.trim(), latitude: Number(latitudeLoja.value), longitude: Number(longitudeLoja.value) }
            });
            mostrarMensagem("Loja salva neste navegador. Ela aparece na Home e no mapa deste mesmo dispositivo.", false);
            window.setTimeout(function () {
                window.location.href = "../painel%20do%20profissional/index.html";
            }, 1500);
        } catch (error) {
            mostrarMensagem(`Não foi possível salvar a loja: ${error.message}`, true);
        } finally {
            botaoEnviar.disabled = false;
        }
    });

})();
