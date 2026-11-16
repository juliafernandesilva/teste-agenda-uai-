
const form = document.getElementById("formPerfil");
const campoFoto = document.getElementById("fotoLoja");
const previewFoto = document.getElementById("previewFoto");
const iconeFoto = document.getElementById("iconeFoto");
const mensagem = document.getElementById("mensagem");

const campos = [
    "nomeLoja",
    "descricao",
    "telefone",
    "email",
    "endereco",
    "cidade",
    "estado"
];

const CHAVE_PERFIL = "agendaUaiPerfilProfissional";

// Carrega os dados previamente salvos
function carregarPerfil() {
    try {
        const perfil = JSON.parse(
            localStorage.getItem(CHAVE_PERFIL) || "{}"
        );

        campos.forEach(id => {
            const campo = document.getElementById(id);

            if (perfil[id] !== undefined) {
                campo.value = perfil[id];
            }
        });

        if (perfil.foto) {
            previewFoto.src = perfil.foto;
            previewFoto.hidden = false;
            iconeFoto.hidden = true;
        }
    } catch (erro) {
        console.error("Não foi possível carregar o perfil:", erro);
    }
}

// Mostra a foto escolhida
campoFoto.addEventListener("change", () => {
    const arquivo = campoFoto.files[0];

    if (!arquivo) return;

    if (!arquivo.type.startsWith("image/")) {
        mensagem.textContent = "Selecione um arquivo de imagem válido.";
        campoFoto.value = "";
        return;
    }

    // Evita imagens muito grandes no armazenamento local
    if (arquivo.size > 2 * 1024 * 1024) {
        mensagem.textContent =
            "A imagem deve ter no máximo 2 MB.";
        campoFoto.value = "";
        return;
    }

    const leitor = new FileReader();

    leitor.onload = () => {
        previewFoto.src = leitor.result;
        previewFoto.hidden = false;
        iconeFoto.hidden = true;
        mensagem.textContent = "";
    };

    leitor.readAsDataURL(arquivo);
});

// Salva os dados do perfil
form.addEventListener("submit", evento => {
    evento.preventDefault();

    const perfil = {};

    campos.forEach(id => {
        perfil[id] = document.getElementById(id).value.trim();
    });

    // Mantém a foto atual se nenhuma nova for selecionada
    perfil.foto = previewFoto.hidden ? "" : previewFoto.src;


    try {
        // Salva os dados do perfil no navegador
        localStorage.setItem(CHAVE_PERFIL, JSON.stringify(perfil));

        // Exibe a mensagem de sucesso
        mensagem.textContent = "Perfil salvo com sucesso!";

        // Aguarda 1 segundo e retorna ao painel do profissional
        setTimeout(() => {
            window.location.href =
                "../painel%20do%20profissional/index.html";
        }, 1000);

    } catch (erro) {
        // Informa se ocorreu um erro ao salvar os dados
        mensagem.textContent =
            "Não foi possível salvar. Tente usar uma imagem menor.";

        console.error("Erro ao salvar o perfil:", erro);
    }
});

// Carrega os dados salvos quando a página é aberta
carregarPerfil();
