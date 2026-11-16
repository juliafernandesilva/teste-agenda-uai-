var dataSelecionada = "";
        var horarioSelecionado = "";
        
        // Tabela de serviços guardada numa lista simples (Array de Objetos)
        var tabelaServicos = [
            
        ];

        var meusAgendamentos = [];

        window.onload = function() {
            gerarBotoesDeHorario();
            gerarOpcoesDeServico();
            gerarOpcoesDeLembrete();
            
            var hoje = new Date().toISOString().split('T')[0];
            document.getElementById('input-data').setAttribute('min', hoje);
            document.getElementById('input-data').value = hoje;
        };

        function mudarTela(idTela) {
            document.getElementById('tela-home').style.display = 'none';
            document.getElementById('tela-servicos').style.display = 'none';
            document.getElementById('tela-confirmacao').style.display = 'none';
            document.getElementById('tela-meus-agendamentos').style.display = 'none';
            
            document.getElementById(idTela).style.display = 'block';

            document.getElementById('tab-home').classList.remove('ativa');
            document.getElementById('tab-lista').classList.remove('ativa');
            
            if(idTela === 'tela-home' || idTela === 'tela-servicos' || idTela === 'tela-confirmacao') {
                document.getElementById('tab-home').classList.add('ativa');
            } else if (idTela === 'tela-meus-agendamentos') {
                document.getElementById('tab-lista').classList.add('ativa');
                atualizarListaNaTela();
            }
        }

        function gerarBotoesDeHorario() {
            var divHorarios = document.getElementById('lista-horarios');
            var html = "";

            for(var hora = 8; hora <= 18; hora++) {
                var horaFormatada = hora < 10 ? "0" + hora : hora;
                html += "<button class='btn-horario' onclick=\"clicouNoHorario('" + horaFormatada + ":00', this)\">" + horaFormatada + ":00</button>";
                if(hora < 18) {
                    html += "<button class='btn-horario' onclick=\"clicouNoHorario('" + horaFormatada + ":30', this)\">" + horaFormatada + ":30</button>";
                }
            }
            divHorarios.innerHTML = html;
        }

        function clicouNoHorario(horario, botaoClicado) {
            horarioSelecionado = horario; 

            var botoes = document.getElementsByClassName('btn-horario');
            for(var i = 0; i < botoes.length; i++) {
                botoes[i].classList.remove('btn-horario-selecionado');
            }

            botaoClicado.classList.add('btn-horario-selecionado');
            document.getElementById('mensagem-erro').style.display = 'none';
        }

        function irParaServicos() {
            dataSelecionada = document.getElementById('input-data').value;

            if(dataSelecionada === "" || horarioSelecionado === "") {
                document.getElementById('mensagem-erro').style.display = 'block';
                return; 
            }
            mudarTela('tela-servicos');
        }

        // Função nova: Preenche o select de serviços com base na nossa tabela
        function gerarOpcoesDeServico() {
            var select = document.getElementById('select-servico');
            var opcoesHtml = "";
            
            for(var i = 0; i < tabelaServicos.length; i++) {
                var s = tabelaServicos[i];
                // Mostramos no texto do select o nome, a duração e o preço para ficar claro
                var textoOpcao = s.nome + " (" + s.tempoMinutos + " min) - R$ " + s.preco;
                // Guardamos o índice "i" no value para podermos recuperar os dados facilmente depois
                opcoesHtml += "<option value='" + i + "'>" + textoOpcao + "</option>";
            }
            
            select.innerHTML = opcoesHtml;
        }

        // Função nova: Calcula que horas o serviço termina
        function calcularHorarioFim(horarioInicio, tempoMinutos) {
            var partes = horarioInicio.split(':');
            var horas = parseInt(partes[0]);
            var minutos = parseInt(partes[1]);

            minutos += tempoMinutos;
            
            // Transforma minutos extra em horas (ex: 70 min vira 1h e 10m)
            horas += Math.floor(minutos / 60);
            minutos = minutos % 60;

            var horasStr = horas < 10 ? "0" + horas : horas;
            var minutosStr = minutos < 10 ? "0" + minutos : minutos;

            return horasStr + ":" + minutosStr;
        }

        function irParaConfirmacao() {
            // Pegar o índice do serviço escolhido no select
            var indiceEscolhido = document.getElementById('select-servico').value;
            var servicoEscolhido = tabelaServicos[indiceEscolhido];

            // Formatar Data
            var partesData = dataSelecionada.split('-');
            var dataFormatada = partesData[2] + "/" + partesData[1] + "/" + partesData[0];

            // Calcular Horário Final
            var horarioFinal = calcularHorarioFim(horarioSelecionado, servicoEscolhido.tempoMinutos);
            var formatoHorario = horarioSelecionado + " - " + horarioFinal;

            // Preencher o resumo
            document.getElementById('resumo-data').innerHTML = dataFormatada;
            document.getElementById('resumo-horario').innerHTML = formatoHorario;
            document.getElementById('resumo-servico').innerHTML = servicoEscolhido.nome;
            document.getElementById('resumo-preco').innerHTML = servicoEscolhido.preco;

            mudarTela('tela-confirmacao');
        }

        function gerarOpcoesDeLembrete() {
            var select = document.getElementById('select-lembrete');
            var opcoesHtml = "";

            opcoesHtml += "<option value='30 minutos antes'>30 minutos antes</option>";
            opcoesHtml += "<option value='1 hora antes'>1 hora antes</option>";
            opcoesHtml += "<option value='1 hora e 30 minutos antes'>1 hora e 30 minutos antes</option>";
            opcoesHtml += "<option value='2 horas antes'>2 horas antes</option>";
            opcoesHtml += "<option value='2 horas e 30 minutos antes'>2 horas e 30 minutos antes</option>";
            opcoesHtml += "<option value='3 horas antes'>3 horas antes</option>";

            for(var i = 4; i <= 24; i++) {
                opcoesHtml += "<option value='" + i + " horas antes'>" + i + " horas antes</option>";
            }

            select.innerHTML = opcoesHtml;
        }

        function finalizarAgendamento() {
            var observacao = document.getElementById('input-observacao').value;
            var lembrete = document.getElementById('select-lembrete').value;

            // Recuperar dados calculados
            var indiceEscolhido = document.getElementById('select-servico').value;
            var servicoEscolhido = tabelaServicos[indiceEscolhido];
            
            var partesData = dataSelecionada.split('-');
            var dataFormatada = partesData[2] + "/" + partesData[1] + "/" + partesData[0];
            
            var horarioFinal = calcularHorarioFim(horarioSelecionado, servicoEscolhido.tempoMinutos);

            var novoAgendamento = {
                data: dataFormatada,
                horaInicio: horarioSelecionado,
                horaFim: horarioFinal,
                servico: servicoEscolhido.nome,
                preco: servicoEscolhido.preco,
                obs: observacao,
                aviso: lembrete
            };

            meusAgendamentos.push(novoAgendamento);

            // Limpar formulário
            horarioSelecionado = "";
            document.getElementById('input-observacao').value = "";
            document.getElementById('select-servico').selectedIndex = 0;
            
            var botoesHorario = document.getElementsByClassName('btn-horario');
            for(var i = 0; i < botoesHorario.length; i++) {
                botoesHorario[i].classList.remove('btn-horario-selecionado');
            }

            mudarTela('tela-meus-agendamentos');
        }

        function atualizarListaNaTela() {
            var divLista = document.getElementById('lista-meus-agendamentos');
            
            if(meusAgendamentos.length === 0) {
                divLista.innerHTML = "<p style='text-align: center; color: #6B7280; padding: 30px 0;'>Nenhum agendamento cadastrado ainda.<br>Use o formulário para adicionar o primeiro.</p>";
                return;
            }

            var html = "";
            for(var i = 0; i < meusAgendamentos.length; i++) {
                var item = meusAgendamentos[i];
                
                html += "<div class='item-agendamento'>";
                html += "<h4>📅 " + item.data + "</h4>";
                
                // Exibição mais organizada baseada no resumo
                html += "<p><strong>⏰ Horário:</strong> " + item.horaInicio + " - " + item.horaFim + "</p>";
                html += "<p><strong>✂️ Serviço:</strong> " + item.servico + "</p>";
                html += "<p style='color: #C1272D; font-weight: bold; margin-top: 5px;'>💰 Preço: R$ " + item.preco + "</p>";
                
                html += "<hr style='border: 0; border-top: 1px solid #E5E7EB; margin: 10px 0;'>";
                html += "<p><strong>Lembrete:</strong> " + item.aviso + "</p>";
                
                if(item.obs !== "") {
                    html += "<p><strong>Observação:</strong> " + item.obs + "</p>";
                }
                
                html += "<button class='btn-secundario' style='margin-top: 15px; width: 200px; color: #C1272D; border-color: #C1272D;' onclick='cancelarAgendamento(" + i + ")'>Cancelar Agendamento</button>";
                html += "</div>";
            }

            divLista.innerHTML = html;
        }

        function cancelarAgendamento(posicaoNoArray) {
            meusAgendamentos.splice(posicaoNoArray, 1);
            atualizarListaNaTela();
        }
