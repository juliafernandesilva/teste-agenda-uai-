/* Integração isolada com disponibilidade do profissional e conflitos de agenda. */
(function(){
    const api=window.AgendaUaiApi;
    let availabilityCache={};
    let exceptionsCache={};
    let appointmentsCache=[];
    const weekKeys=['domingo','segunda','terca','quarta','quinta','sexta','sabado'];
    const money=value=>new Intl.NumberFormat('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(value)||0);
    const parsePrice=value=>typeof value==='number'?value:(Number(String(value||'0').replace(/\./g,'').replace(',','.'))||0);
    const toMinutes=value=>{const [hours,minutes]=String(value||'0:0').split(':').map(Number);return hours*60+minutes};
    const fromMinutes=value=>`${String(Math.floor(value/60)).padStart(2,'0')}:${String(value%60).padStart(2,'0')}`;
    const makeId=()=>window.crypto?.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random().toString(16).slice(2)}`;
    let selectedSlot=null;
    let selectedCalendarDate='';
    let calendarMonth=null;
    let calendarGrid=null;
    let calendarMessage=null;
    let calendarPanel=null;

    function localDateKey(date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
    function renderCalendar(){
        if(!calendarGrid||!calendarMonth)return;
        calendarGrid.replaceChildren();
        const monthTitle=document.querySelector('.agenda-calendario-titulo');
        if(monthTitle)monthTitle.textContent=calendarMonth.toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
        const today=new Date();today.setHours(0,0,0,0);
        const lastBookableDay=new Date(today);lastBookableDay.setDate(lastBookableDay.getDate()+90);
        const firstDay=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth(),1).getDay();
        const daysInMonth=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth()+1,0).getDate();
        const previous=document.querySelector('[data-calendar-prev]');
        const next=document.querySelector('[data-calendar-next]');
        if(previous)previous.disabled=calendarMonth.getFullYear()===today.getFullYear()&&calendarMonth.getMonth()===today.getMonth();
        if(next)next.disabled=calendarMonth.getFullYear()>today.getFullYear()+1||(calendarMonth.getFullYear()===today.getFullYear()+1&&calendarMonth.getMonth()>today.getMonth());
        for(let i=0;i<firstDay;i++){
            const blank=document.createElement('span');blank.className='agenda-calendario-vazio';blank.setAttribute('aria-hidden','true');calendarGrid.append(blank);
        }
        for(let day=1;day<=daysInMonth;day++){
            const date=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth(),day);date.setHours(0,0,0,0);
            const key=localDateKey(date),weekday=weekKeys[date.getDay()];
            const exception=exceptionsCache[key];
            const open=exception?(!exception.fechado&&Boolean(exception.inicio&&exception.fim)):Boolean(availabilityCache[weekday]?.length),past=date<today;
            const button=document.createElement('button');button.type='button';button.className='agenda-calendario-dia';button.textContent=String(day);
            button.disabled=past||!open||date>lastBookableDay;
            button.setAttribute('aria-label',`${day} de ${date.toLocaleDateString('pt-BR',{month:'long'})}${open?', há atendimento':', sem atendimento'}`);
            if(open&&!past)button.classList.add('disponivel');
            if(key===localDateKey(today))button.classList.add('hoje');
            if(key===selectedCalendarDate)button.classList.add('selecionado');
            button.addEventListener('click',()=>{
                selectedCalendarDate=key;
                const input=document.getElementById('input-data');if(input)input.value=key;
                window.dataSelecionada=key;window.horarioSelecionado='';selectedSlot=null;
                const error=document.getElementById('mensagem-erro');if(error)error.style.display='none';
                if(calendarMessage)calendarMessage.textContent=`Data escolhida: ${date.toLocaleDateString('pt-BR')}. Os horários livres aparecem após selecionar o serviço.`;
                renderCalendar();
                renderAvailableTimes();
            });
            calendarGrid.append(button);
        }
    }

    function setupCalendar(){
        const input=document.getElementById('input-data');
        const label=document.querySelector('label[for="input-data"]');
        if(!input)return;
        const today=new Date();today.setHours(0,0,0,0);
        calendarMonth=new Date(today.getFullYear(),today.getMonth(),1);
        selectedCalendarDate='';window.dataSelecionada='';input.value='';input.hidden=true;
        if(label)label.style.display='none';
        const panel=document.createElement('section');panel.className='agenda-calendario';panel.setAttribute('aria-label','Escolha uma data de atendimento');
        calendarPanel=panel;
        const heading=document.createElement('div');heading.className='agenda-calendario-cabecalho';
        const prev=document.createElement('button');prev.type='button';prev.className='agenda-calendario-nav';prev.dataset.calendarPrev='';prev.textContent='‹';prev.setAttribute('aria-label','Mês anterior');
        const title=document.createElement('strong');title.className='agenda-calendario-titulo';
        const next=document.createElement('button');next.type='button';next.className='agenda-calendario-nav';next.dataset.calendarNext='';next.textContent='›';next.setAttribute('aria-label','Próximo mês');
        heading.append(prev,title,next);
        const weekdays=document.createElement('div');weekdays.className='agenda-calendario-semana';
        ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].forEach(name=>{const item=document.createElement('span');item.textContent=name;weekdays.append(item);});
        calendarGrid=document.createElement('div');calendarGrid.className='agenda-calendario-grade';calendarGrid.setAttribute('role','group');calendarGrid.setAttribute('aria-label','Dias do mês');
        calendarMessage=document.createElement('p');calendarMessage.className='agenda-calendario-mensagem';calendarMessage.setAttribute('role','status');calendarMessage.textContent='Carregando os dias de atendimento…';
        panel.append(heading,weekdays,calendarGrid,calendarMessage);input.insertAdjacentElement('afterend',panel);
        prev.addEventListener('click',()=>{calendarMonth=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth()-1,1);renderCalendar();});
        next.addEventListener('click',()=>{calendarMonth=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth()+1,1);renderCalendar();});
        renderCalendar();
        window.addEventListener('load',()=>{if(!selectedCalendarDate){input.value='';window.dataSelecionada='';}});
        if(!api){calendarMessage.textContent='Não foi possível carregar os dias de atendimento.';return;}
        const todayKey=localDateKey(today);
        const endDate=new Date(today);endDate.setDate(endDate.getDate()+90);
        api.getAvailability().then(async days=>{
            availabilityCache={};
            days.forEach(day=>{
                const key=weekKeys[day.diaSemana];
                if(!key||!day.ativo)return;
                if(!availabilityCache[key])availabilityCache[key]=[];
                availabilityCache[key].push({inicio:day.inicio,fim:day.fim});
            });
            const exceptions=await api.getExceptions(todayKey,localDateKey(endDate));
            exceptionsCache={};
            exceptions.forEach(exception=>{exceptionsCache[exception.data]=exception;});
            renderCalendar();
            const openDay=calendarGrid.querySelector('.agenda-calendario-dia.disponivel:not(:disabled)');
            calendarMessage.textContent=openDay?'Os dias com atendimento estão destacados. Dias passados e sem expediente ficam indisponíveis.':'Não há dias de atendimento disponíveis neste mês.';
        }).catch(error=>{calendarMessage.textContent=`Não foi possível consultar os dias de atendimento: ${error.message}`;});
    }

    function init(){
        setupCalendar();
        window.gerarBotoesDeHorario=function(){
            const oldGrid=document.getElementById('lista-horarios');
            if(oldGrid){oldGrid.style.display='none';if(oldGrid.previousElementSibling)oldGrid.previousElementSibling.style.display='none';}
        };
        window.gerarOpcoesDeServico=function(){
            const select=document.getElementById('select-servico');
            const continueButton=document.getElementById('btn-ir-para-agenda');
            const serviceMessage=document.getElementById('servicos-mensagem');
            if(select){select.replaceChildren(new Option('Carregando serviços…',''));select.disabled=true;select.addEventListener('change',renderAvailableTimes);}
            if(continueButton)continueButton.disabled=true;
            if(serviceMessage){serviceMessage.hidden=false;serviceMessage.textContent='Carregando serviços…';}
            if(api){
                api.listServices().then(services=>{
                    if(!services.length)throw new Error('Nenhum serviço cadastrado para esta loja.');
                    window.tabelaServicos=services.map(service=>({id:service.id,nome:service.nome,descricao:service.descricao||'',preco:Number(service.preco),tempoMinutos:Number(service.duracaoMinutos)}));
                    select.replaceChildren(...window.tabelaServicos.map((service,index)=>{const option=document.createElement('option');option.value=index;option.textContent=`${service.nome} (${service.tempoMinutos} min) - R$ ${money(service.preco)}`;return option;}));
                    const serviceList=document.getElementById('lista-servicos-reserva');
                    if(serviceList){
                        serviceList.replaceChildren();
                        window.tabelaServicos.forEach((service,index)=>{
                            const row=document.createElement('article');row.className='servico-reserva-linha';
                            const info=document.createElement('div');info.className='servico-reserva-info';
                            const title=document.createElement('h3');title.textContent=service.nome;
                            const duration=document.createElement('p');duration.textContent=service.descricao?`${service.descricao} · ${service.tempoMinutos} min`:`${service.tempoMinutos} min`;
                            info.append(title,duration);
                            const price=document.createElement('strong');price.className='servico-reserva-preco';price.textContent=`R$ ${money(service.preco)}`;
                            const reserve=document.createElement('button');reserve.type='button';reserve.className='btn-acao servico-reserva-botao';reserve.textContent='Reservar';
                            reserve.addEventListener('click',()=>{select.value=String(index);window.irParaAgenda();});
                            row.append(info,price,reserve);serviceList.append(row);
                        });
                    }
                    select.disabled=false;
                    if(continueButton)continueButton.disabled=false;
                    if(serviceMessage)serviceMessage.hidden=true;
                    const requestedService=new URLSearchParams(window.location.search).get('servico');
                    if(requestedService){
                        const requestedIndex=window.tabelaServicos.findIndex(service=>String(service.id)===String(requestedService));
                        if(requestedIndex>=0){select.value=String(requestedIndex);window.irParaAgenda();}
                    }
                    if(selectedCalendarDate)renderAvailableTimes();
                }).catch(error=>{
                    select.replaceChildren(new Option('Serviços indisponíveis',''));
                    select.disabled=true;
                    if(serviceMessage){serviceMessage.hidden=false;serviceMessage.textContent=`Não foi possível carregar os serviços da API: ${error.message}`;}
                });
            } else {
                select.replaceChildren(new Option('Serviços indisponíveis',''));
                if(serviceMessage){serviceMessage.hidden=false;serviceMessage.textContent='A camada JavaScript do AgendaUai não foi carregada. Atualize a página.';}
            }
        };

        const originalTimeList=document.getElementById('lista-horarios');
        const slotLabel=document.createElement('label');
        slotLabel.textContent='Horários disponíveis para este serviço';
        slotLabel.htmlFor='horarios-gerados';
        const timeBox=document.createElement('div');
        timeBox.id='horarios-gerados';
        timeBox.className='agenda-horarios-gerados';
        timeBox.setAttribute('aria-live','polite');
        const slotMessage=document.createElement('p');
        slotMessage.className='agenda-horarios-mensagem';
        timeBox.append(slotMessage);
        const serviceSelect=document.getElementById('select-servico');
        const continueButton=document.getElementById('btn-ir-para-agenda');
        if(serviceSelect)serviceSelect.disabled=true;
        if(calendarPanel)calendarPanel.append(slotLabel,timeBox);
        if(continueButton)continueButton.disabled=true;
        if(originalTimeList){originalTimeList.style.display='none';if(originalTimeList.previousElementSibling)originalTimeList.previousElementSibling.style.display='none';}

        window.irParaAgenda=function(){
            const service=window.tabelaServicos?.[document.getElementById('select-servico')?.value];
            if(!service){const message=document.getElementById('servicos-mensagem');if(message){message.hidden=false;message.textContent='Selecione um serviço para continuar.';}return;}
            window.mudarTela('tela-home');
            const message=document.getElementById('mensagem-erro');
            if(message){message.textContent='Escolha uma data disponível e um horário para continuar.';message.style.display='block';}
            if(selectedCalendarDate)renderAvailableTimes();
        };

        window.irParaConfirmacao=function(){
            const service=window.tabelaServicos?.[document.getElementById('select-servico')?.value];
            if(!service||!selectedSlot){slotMessage.textContent='Selecione um horário disponível para continuar.';return;}
            const [year,month,day]=window.dataSelecionada.split('-');
            document.getElementById('resumo-data').textContent=`${day}/${month}/${year}`;
            document.getElementById('resumo-horario').textContent=`${selectedSlot.inicio} - ${selectedSlot.fim}`;
            document.getElementById('resumo-servico').textContent=service.nome;
            document.getElementById('resumo-preco').textContent=money(service.preco);
            window.mudarTela('tela-confirmacao');
        };

        window.finalizarAgendamento=async function(){
            const service=window.tabelaServicos?.[document.getElementById('select-servico')?.value];
            if(!service||!selectedSlot){window.alert('Escolha um serviço e um horário disponível.');return;}
            const submitButton=document.querySelector('#tela-confirmacao .btn-acao');
            if(submitButton?.disabled)return;
            if(submitButton){submitButton.disabled=true;submitButton.dataset.originalText=submitButton.textContent;submitButton.textContent='Enviando…';}
            try{
                const user=await api.getCurrentUser();
                if(!user){
                    const login=new URL('../login%20e%20cadastro/login1510.html',window.location.href);
                    login.searchParams.set('returnTo',window.location.pathname+window.location.search);
                    window.location.href=login.href;
                    return;
                }
                const created=await api.createBooking({
                    servicoId:service.id,
                    data:window.dataSelecionada,
                    hora:selectedSlot.inicio,
                    observacao:document.getElementById('input-observacao')?.value.trim()||''
                });
                window.horarioSelecionado='';selectedSlot=null;
                document.getElementById('input-observacao').value='';
                document.getElementById('select-servico').selectedIndex=0;
                window.alert('Pedido de agendamento enviado. A loja precisa confirmar o horário.');
                window.mudarTela('tela-meus-agendamentos');
            }catch(error){
                window.alert(`Não foi possível enviar o pedido: ${error.message}`);
                await renderAvailableTimes();
            }finally{
                if(submitButton){submitButton.disabled=false;submitButton.textContent=submitButton.dataset.originalText||'Confirmar Agendamento';}
            }
        };

        window.atualizarListaNaTela=async function(){
            const list=document.getElementById('lista-meus-agendamentos');
            if(!list)return;
            list.replaceChildren();
            try{
                const user=await api.getCurrentUser();
                if(!user){
                    const login=document.createElement('a');
                    login.href=`../login%20e%20cadastro/login1510.html?returnTo=${encodeURIComponent(window.location.pathname+window.location.search)}`;
                    login.textContent='Entre na sua conta para ver seus agendamentos.';
                    list.append(login);
                    return;
                }
                const appointments=(await api.listAppointments()).filter(item=>item.clienteId===user.id);
                if(!appointments.length){list.textContent='Seus pedidos de agendamento aparecerão aqui.';return;}
                appointments.slice().sort((a,b)=>(a.data+a.hora).localeCompare(b.data+b.hora)).forEach(item=>{
                const card=document.createElement('div');card.className='item-agendamento';
                const title=document.createElement('h4');title.textContent=`📅 ${formatDate(item.data)} · ${item.hora}${item.horaFim?' - '+item.horaFim:''}`;
                const service=document.createElement('p');service.textContent=`✂️ Serviço: ${item.servico}`;
                const status=document.createElement('p');status.className='agenda-status-cliente';status.textContent=`Status: ${({pendente:'Pendente',confirmado:'Confirmado',rejeitado:'Recusado',concluido:'Concluído',cancelado:'Cancelado'})[String(item.status).toLowerCase()]||item.status}`;
                const price=document.createElement('p');price.textContent=`💰 Preço: R$ ${money(item.valor)}`;
                card.append(title,service,status,price);
                if(!['cancelado','concluido'].includes(String(item.status).toLowerCase())){
                    const cancel=document.createElement('button');cancel.type='button';cancel.className='btn-secundario';cancel.textContent='Cancelar pedido';
                    cancel.addEventListener('click',async()=>{
                        try{await api.updateStatus(item.id,'cancelado');window.atualizarListaNaTela();}
                        catch(error){window.alert(`Não foi possível cancelar o pedido: ${error.message}`);}
                    });
                    card.append(cancel);
                }
                list.append(card);
                });
            }catch(error){list.textContent=`Não foi possível carregar seus agendamentos: ${error.message}`;}
        };
        if(api){
            api.getStore().then(store=>{
                const name=document.getElementById('agendamento-nome-loja');
                const subtitle=document.getElementById('agendamento-descricao');
                if(name&&store?.nome)name.textContent=store.nome;
                if(subtitle)subtitle.textContent='Escolha um serviço e encontre um horário disponível.';
            }).catch(()=>{});
        }
        window.mudarTela('tela-servicos');
        renderAvailableTimes();
        window.setInterval(()=>{
            const clientAppointments=document.getElementById('tela-meus-agendamentos');
            if(clientAppointments&&clientAppointments.style.display!=='none'&&window.atualizarListaNaTela){
                window.atualizarListaNaTela();
            }
        },15000);
    }

    function formatDate(value){const [year,month,day]=String(value||'').split('-');return year&&month&&day?`${day}/${month}/${year}`:value;}
    function hasConflict(appointments,date,start,end){
        const candidateStart=toMinutes(start),candidateEnd=toMinutes(end);
        return appointments.some(item=>{
            if(item.data!==date||String(item.status).toLowerCase()==='cancelado')return false;
            const existingStart=toMinutes(item.hora);
            const duration=Number(item.duracaoMinutos)||(item.horaFim?toMinutes(item.horaFim)-existingStart:60);
            const existingEnd=existingStart+Math.max(1,duration);
            return candidateStart<existingEnd&&candidateEnd>existingStart;
        });
    }
    async function renderAvailableTimes(){
        const box=document.getElementById('horarios-gerados');
        if(!box)return;
        const message=box.querySelector('.agenda-horarios-mensagem');
        const continueButton=document.querySelector('#tela-home .btn-acao');
        box.querySelectorAll('button').forEach(button=>button.remove());
        if(continueButton)continueButton.disabled=true;
        selectedSlot=null;window.horarioSelecionado='';
        const date=window.dataSelecionada||document.getElementById('input-data')?.value||'';
        const service=window.tabelaServicos?.[document.getElementById('select-servico')?.value];
        if(!date||!service){message.textContent='Selecione o serviço para ver os horários disponíveis.';return;}
        let schedules;
        try{
            const [dayWindows,appointments]=await Promise.all([api.getAvailabilityForDate(date),api.listBusySlots(date)]);
            schedules=dayWindows;
            appointmentsCache=appointments;
        }catch(error){message.textContent=`Não foi possível consultar a agenda compartilhada: ${error.message}`;return;}
        const weekday=weekKeys[new Date(`${date}T12:00:00`).getDay()];
        schedules=schedules||availabilityCache[weekday]||[];
        if(!schedules.length){message.textContent='O profissional não atende neste dia.';return;}
        const duration=Math.max(5,Number(service.tempoMinutos)||30);
        const now=new Date();
        const isToday=date===localDateKey(now);
        const currentMinute=now.getHours()*60+now.getMinutes();
        let count=0;
        schedules.forEach(schedule=>{
            const open=toMinutes(schedule.inicio),close=toMinutes(schedule.fim);
            for(let start=open;start+duration<=close;start+=duration){
                if(isToday&&start<=currentMinute)continue;
                const end=start+duration;
                const inicio=fromMinutes(start),fim=fromMinutes(end);
                if(hasConflict(appointmentsCache,date,inicio,fim))continue;
                const button=document.createElement('button');button.type='button';button.className='btn-horario';button.textContent=`${inicio} - ${fim}`;
                button.addEventListener('click',()=>{
                    box.querySelectorAll('button').forEach(item=>item.classList.remove('btn-horario-selecionado'));
                    button.classList.add('btn-horario-selecionado');selectedSlot={inicio,fim};window.horarioSelecionado=inicio;window.horaFimSelecionada=fim;message.textContent='';
                    if(continueButton)continueButton.disabled=false;
                });
                box.append(button);count++;
            }
        });
        if(continueButton)continueButton.disabled=true;
        message.textContent=count?'Horários gerados pela duração do serviço e conferidos com os agendamentos existentes.':`Não há horários livres para um atendimento de ${duration} minutos nesta data.`;
    }
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
