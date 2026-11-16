document.addEventListener('DOMContentLoaded',async()=>{
    const store=window.AgendaUaiStore;
    const api=window.AgendaUaiApi;
    if(!store||document.body.dataset.page!=='agendamentos')return;
    const $=(sel,root=document)=>root.querySelector(sel),$$=(sel,root=document)=>[...root.querySelectorAll(sel)];
    const box=$$('.ag-layout .content-box')[1],empty=$('.empty-state',box),toggle=$('#ag-toggle'),form=$('.ag-modal form'),calendar=$('.ag-cal-grid');
    if(!box||!form||!calendar)return;
    let items=store.read('agendamentos',[]),selectedDay='';
    let availability=store.read('disponibilidade',{});
    const fromApi=item=>({...item,cliente:item.nomeCliente,telefone:item.telefoneCliente,servico:item.servico,valor:item.valor,status:String(item.status).toLowerCase(),duracaoMinutos:item.duracaoMinutos,observacao:item.observacao||'',_api:true});
    const today=new Date();
    const keyDate=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const dateFromKey=s=>{
        const [y,m,d]=s.split('-').map(Number);
        return new Date(y,m-1,d)
    }
    ;
    const fmtDate=s=>dateFromKey(s).toLocaleDateString('pt-BR');
    const apiErrorDetail=error=>window.location.protocol==='file:'
        ?'Abra o painel pelo endereço http://localhost:5500/painel%20do%20profissional/agendamentos.html. Arquivos abertos diretamente não conseguem acessar a API.'
        :error.message;
    const money=n=>new Intl.NumberFormat('pt-BR',{
        style:'currency',currency:'BRL'
    }
    ).format(Number(n)||0);
    const calendarStamp=date=>`${date.getFullYear()}${String(date.getMonth()+1).padStart(2,'0')}${String(date.getDate()).padStart(2,'0')}T${String(date.getHours()).padStart(2,'0')}${String(date.getMinutes()).padStart(2,'0')}00`;
    function googleCalendarUrl(item){
        const start=dateFromKey(item.data);
        const [hours,minutes]=item.hora.split(':').map(Number);
        start.setHours(hours,minutes,0,0);
        const end=new Date(start);
        if(item.horaFim){
            const [endHours,endMinutes]=item.horaFim.split(':').map(Number);
            end.setHours(endHours,endMinutes,0,0);
        }else{
            end.setMinutes(end.getMinutes()+(Number(item.duracaoMinutos||item.duracao)||60));
        }
        const details=[`Cliente: ${item.cliente}`,item.telefone?`WhatsApp: ${item.telefone}`:'',`Serviço: ${item.servico}`,`Valor: ${money(item.valor)}`].filter(Boolean).join('\n');
        const params=new URLSearchParams({
            action:'TEMPLATE',
            text:`AgendaUai - ${item.servico} (${item.cliente})`,
            dates:`${calendarStamp(start)}/${calendarStamp(end)}`,
            details,
            ctz:'America/Sao_Paulo'
        });
        return `https://calendar.google.com/calendar/render?${params.toString()}`;
    }
    function renderCalendar(){
        const year=today.getFullYear(),month=today.getMonth(),first=new Date(year,month,1).getDay(),days=new Date(year,month+1,0).getDate();
        calendar.replaceChildren();
        for(let i=0;
        i<first;
        i++){
            const e=document.createElement('span');
            e.className='ag-dia vazio';
            calendar.append(e)
        }
        for(let d=1;
        d<=days;
        d++){
            const date=new Date(year,month,d),el=document.createElement('button');
            el.type='button';
            el.className='ag-dia';
            el.textContent=d;
            el.dataset.date=keyDate(date);
            if(d===today.getDate())el.classList.add('hoje');
            if(selectedDay===el.dataset.date)el.classList.add('selecionado');
            if(items.some(x=>x.data===el.dataset.date))el.classList.add('tem-agendamento');
            el.addEventListener('click',()=>{
                selectedDay=selectedDay===el.dataset.date?'':el.dataset.date;
                renderCalendar();
                renderList()
            }
            );
            calendar.append(el)
        }
        const monthLabel=$('.ag-mes-nav strong');
        if(monthLabel)monthLabel.textContent=today.toLocaleDateString('pt-BR',{
            month:'long',year:'numeric'
        }
        );
        const title=$('.ag-titulo');
        if(title)title.textContent='Agendamentos do Mês'
    }
    function renderList(){
        const old=$$('.ag-item',box);
        old.forEach(el=>el.remove());
        const shown=selectedDay?items.filter(x=>x.data===selectedDay):items.slice().sort((a,b)=>(a.data+a.hora).localeCompare(b.data+b.hora));
        empty.hidden=shown.length>0;
        const fragment=document.createDocumentFragment();
        shown.forEach(item=>{
            const row=document.createElement('div');
            row.className='ag-item';
            const when=document.createElement('div');
            when.className='ag-quando';
            const date=document.createElement('strong');
            date.textContent=fmtDate(item.data);
            const time=document.createElement('span');
            time.textContent=item.hora;
            when.append(date,time);
            const who=document.createElement('div');
            who.className='ag-quem';
            const client=document.createElement('strong');
            client.textContent=item.cliente;
            const service=document.createElement('span');
            service.textContent=item.servico;
            who.append(client,service);
            const observation=String(item.observacao||item.obs||'').trim();
            if(observation){
                const note=document.createElement('span');
                note.className='ag-observacao';
                note.textContent=`Observação: ${observation}`;
                who.append(note);
            }
            const price=document.createElement('div');
            price.className='ag-valor';
            price.textContent=money(item.valor);
            const status=document.createElement('span');
            status.className='ag-status '+item.status;
            status.textContent=({
                pendente:'Pendente',confirmado:'Confirmado',rejeitado:'Recusado',concluido:'Concluído',cancelado:'Cancelado'
            }
            )[item.status]||item.status;
            const actions=document.createElement('div');
            actions.className='ag-item-actions';

            if(item.status!=='cancelado'){
                if(item.status==='pendente'||item.status==='confirmado'){
                    const nextStatus=item.status==='pendente'?'confirmado':'concluido';
                    const statusAction=document.createElement('button');
                    statusAction.type='button';
                    statusAction.className='btn-action btn-ghost ag-status-action';
                    statusAction.innerHTML=item.status==='pendente'?'<i class="fa-solid fa-check" aria-hidden="true"></i> Aceitar e abrir Google Agenda':'<i class="fa-solid fa-check-double" aria-hidden="true"></i> Concluir';
                    statusAction.addEventListener('click',async()=>{
                        const calendarTab=item.status==='pendente'?window.open('about:blank','_blank'):null;
                        if(calendarTab)calendarTab.opener=null;
                        statusAction.disabled=true;
                        try{
                            if(item._api)await api.updateStatus(item.id,nextStatus==='concluido'?'Concluido':'Confirmado');
                            item.status=nextStatus;save();render();
                            if(calendarTab)calendarTab.location.href=googleCalendarUrl(item);
                        }catch(error){if(calendarTab)calendarTab.close();statusAction.disabled=false;window.alert(`Não foi possível atualizar o agendamento: ${apiErrorDetail(error)}`);}
                    });
                    actions.append(statusAction);
                    if(item.status==='pendente'){
                        const rejectButton=document.createElement('button');
                        rejectButton.type='button';
                        rejectButton.className='btn-action btn-red-outline ag-rejeitar';
                        rejectButton.textContent='Recusar pedido';
                        rejectButton.addEventListener('click',async()=>{
                            rejectButton.disabled=true;
                            try{
                                if(item._api)await api.updateStatus(item.id,'rejeitado');
                                item.status='rejeitado';save();render();
                            }catch(error){rejectButton.disabled=false;window.alert(`Não foi possível recusar o pedido: ${apiErrorDetail(error)}`);}
                        });
                        actions.append(rejectButton);
                    }
                }
                if(item.status==='confirmado'){
                    const calendarLink=document.createElement('a');
                    calendarLink.className='btn-action btn-ghost ag-calendar-link';
                    calendarLink.href=googleCalendarUrl(item);
                    calendarLink.target='_blank';
                    calendarLink.rel='noopener noreferrer';
                    calendarLink.innerHTML='<i class="fa-regular fa-calendar-plus" aria-hidden="true"></i> Google Agenda';
                    calendarLink.setAttribute('aria-label','Adicionar agendamento de '+item.cliente+' ao Google Agenda');
                    actions.append(calendarLink);
                }

                if(item.status==='confirmado'){
                  const cancel=document.createElement('button');
                  cancel.type='button';
                  cancel.className='btn-action btn-red-outline ag-cancelar';
                  cancel.textContent='Cancelar e avisar';
                  cancel.addEventListener('click',async()=>{
                    const confirmado=window.confirm(`Tem certeza que deseja cancelar o agendamento de ${item.cliente} em ${fmtDate(item.data)} às ${item.hora}? O cancelamento ficará no histórico e o WhatsApp será aberto com uma mensagem para o cliente.`);
                    if(!confirmado)return;
                    const dataFormatada=fmtDate(item.data);
                    const mensagem=`Olá, ${item.cliente}. Preciso cancelar seu agendamento de ${item.servico} no dia ${dataFormatada} às ${item.hora}. Peço desculpas pelo imprevisto. Podemos combinar outro horário?`;
                    const telefone=(item.telefone||'').replace(/\D/g,'');
                    const notificationTab=telefone.length>=10?window.open('about:blank','_blank'):null;
                    if(notificationTab)notificationTab.opener=null;
                    if(item._api){
                        try{await api.updateStatus(item.id,'cancelado');}
                        catch(error){
                            if(notificationTab)notificationTab.close();
                            window.alert(`Não foi possível cancelar o agendamento: ${apiErrorDetail(error)}`);return;
                        }
                    }
                    item.status='cancelado';
                    save();
                    render();
                    if(telefone.length>=10){
                        const numero=telefone.startsWith('55')?telefone:'55'+telefone;
                        const whatsappUrl=`https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
                        if(notificationTab)notificationTab.location.href=whatsappUrl;
                        else window.alert('Agendamento cancelado, mas o navegador bloqueou a abertura do WhatsApp. Verifique o bloqueador de pop-ups.');
                    }else{
                        window.alert('Agendamento cancelado. O telefone do cliente não está cadastrado para abrir o WhatsApp.');
                    }
                  });
                  actions.append(cancel);
                }
            }

            row.append(when,who,price,status,actions);
            fragment.append(row)
        }
        );
        box.append(fragment);
        updateMetrics()
    }
    function updateMetrics(){
        const count=items.length,pending=items.filter(x=>x.status==='pendente').length,done=items.filter(x=>x.status==='concluido'),sum=done.reduce((acc,x)=>acc+(Number(x.valor)||0),0);
        const cards=$$('.ag-resumo .metric-card');
        const values=[count,pending,done.length,money(sum)];
        cards.forEach((card,i)=>{
            const val=$('.metric-value',card),sub=$('.metric-sub',card);
            if(val)val.textContent=values[i];
            if(sub&&i===0)sub.textContent=count===0?'Nenhum agendamento neste mês':`${count} agendamento${count===1?'':'s'} cadastrado${count===1?'':'s'}`;
            if(sub&&i===1)sub.textContent=`${pending} aguardando confirmação`;
            if(sub&&i===2)sub.textContent=`${done.length} atendimento${done.length===1?' finalizado':'s finalizados'}`;
            if(sub&&i===3)sub.textContent='Soma dos concluídos'
        }
        )
    }
    function save(){
        store.write('agendamentos',items)
    }
    const weekdays=[
        {key:'domingo',label:'Domingo'},
        {key:'segunda',label:'Segunda-feira'},
        {key:'terca',label:'Terça-feira'},
        {key:'quarta',label:'Quarta-feira'},
        {key:'quinta',label:'Quinta-feira'},
        {key:'sexta',label:'Sexta-feira'},
        {key:'sabado',label:'Sábado'}
    ];
    const availabilityToggle=$('#ag-disponibilidade-toggle');
    const availabilityForm=$('#form-disponibilidade');
    const availabilityList=$('#ag-disponibilidade-lista');
    const availabilityMessage=$('#ag-disponibilidade-msg');
    function normalizeDayAvailability(saved={}){
        const slots=Array.isArray(saved.horarios)?saved.horarios:
            (saved.inicio&&saved.fim?[{inicio:saved.inicio,fim:saved.fim}]:[]);
        return {ativo:Boolean(saved.ativo),horarios:slots.map(slot=>({inicio:slot.inicio||'14:00',fim:slot.fim||'16:00'}))};
    }
    function createSlotRow(slot={inicio:'14:00',fim:'16:00'}){
        const slotRow=document.createElement('div');
        slotRow.className='ag-vaga-disponibilidade';
        slotRow.innerHTML='<label>Início<input type="time" name="inicio"></label><label>Fim<input type="time" name="fim"></label><button type="button" class="ag-remover-vaga" aria-label="Remover vaga">Remover</button>';
        slotRow.querySelector('[name="inicio"]').value=slot.inicio;
        slotRow.querySelector('[name="fim"]').value=slot.fim;
        slotRow.querySelector('.ag-remover-vaga').addEventListener('click',()=>{
            const row=slotRow.closest('.ag-dia-disponibilidade');
            slotRow.remove();
            updateDayHeader(row);
        });
        return slotRow;
    }
    function updateDayHeader(row){
        if(!row)return;
        const active=row.querySelector('[name="ativo"]').checked;
        const count=row.querySelectorAll('.ag-vaga-disponibilidade').length;
        row.querySelector('.ag-vaga-contagem').textContent=active?`${count} ${count===1?'vaga':'vagas'}`:'Não atende';
    }
    function renderAvailability(){
        if(!availabilityForm||!availabilityList)return;
        availabilityList.replaceChildren();
        weekdays.forEach(day=>{
            const saved=normalizeDayAvailability(availability[day.key]||{});
            const row=document.createElement('section');
            row.className='ag-dia-disponibilidade';
            row.dataset.day=day.key;
            row.innerHTML=`<div class="ag-dia-cabecalho"><label class="ag-dia-check"><input type="checkbox" name="ativo" ${saved.ativo?'checked':''}><span>${day.label}</span></label><span class="ag-vaga-contagem"></span><button type="button" class="ag-editar-dia" aria-expanded="false">Editar vagas</button></div><div class="ag-vagas-editor" hidden><div class="ag-vagas-lista"></div><button type="button" class="ag-adicionar-vaga"><i class="fa-solid fa-plus" aria-hidden="true"></i> Adicionar vaga</button></div>`;
            const editor=row.querySelector('.ag-vagas-editor');
            const slots=row.querySelector('.ag-vagas-lista');
            (saved.horarios.length?saved.horarios:[{inicio:'14:00',fim:'16:00'}]).forEach(slot=>slots.append(createSlotRow(slot)));
            const editButton=row.querySelector('.ag-editar-dia');
            const toggleEditor=show=>{editor.hidden=!show;editButton.setAttribute('aria-expanded',String(show));editButton.textContent=show?'Ocultar vagas':'Editar vagas';};
            editButton.addEventListener('click',()=>{
                const checkbox=row.querySelector('[name="ativo"]');
                if(!checkbox.checked)checkbox.checked=true;
                toggleEditor(editor.hidden);
                updateDayHeader(row);
            });
            row.querySelector('[name="ativo"]').addEventListener('change',event=>{
                if(!event.target.checked)toggleEditor(false);
                else toggleEditor(true);
                updateDayHeader(row);
            });
            row.querySelector('.ag-adicionar-vaga').addEventListener('click',()=>{
                const checkbox=row.querySelector('[name="ativo"]');
                if(!checkbox.checked){checkbox.checked=true;toggleEditor(true);}
                slots.append(createSlotRow());
                updateDayHeader(row);
            });
            updateDayHeader(row);
            availabilityList.append(row);
        });
    }
    if(availabilityForm){
        availabilityForm.addEventListener('submit',async event=>{
            event.preventDefault();
            const next={};
            const apiRows=[];
            for(const [index,day] of weekdays.entries()){
                const row=availabilityList.querySelector(`[data-day="${day.key}"]`);
                const ativo=row.querySelector('[name="ativo"]').checked;
                const slots=[...row.querySelectorAll('.ag-vaga-disponibilidade')].map(slotRow=>({
                    inicio:slotRow.querySelector('[name="inicio"]').value,
                    fim:slotRow.querySelector('[name="fim"]').value
                }));
                if(ativo&&!slots.length){
                    availabilityMessage.textContent=`Adicione pelo menos uma vaga para ${day.label}.`;
                    return;
                }
                if(ativo&&slots.some(slot=>!slot.inicio||!slot.fim||slot.fim<=slot.inicio)){
                    availabilityMessage.textContent=`Confira as vagas de ${day.label}: o fim precisa ser depois do início.`;
                    return;
                }
                slots.sort((a,b)=>a.inicio.localeCompare(b.inicio));
                if(ativo&&slots.some((slot,slotIndex)=>slotIndex>0&&slot.inicio<slots[slotIndex-1].fim)){
                    availabilityMessage.textContent=`As vagas de ${day.label} estão se sobrepondo. Ajuste os horários.`;
                    return;
                }
                next[day.key]={ativo,horarios:ativo?slots:[]};
                if(ativo)slots.forEach(slot=>apiRows.push({diaSemana:index,ativo:true,...slot}));
                else apiRows.push({diaSemana:index,ativo:false,inicio:'09:00',fim:'18:00'});
            }
            if(api){
                try{await api.saveAvailability(apiRows);}
                catch(error){availabilityMessage.textContent=`Não foi possível salvar na API: ${error.message}`;return;}
            }
            if(!store.write('disponibilidade',next)){
                availabilityMessage.textContent='Não foi possível salvar. Verifique o armazenamento do navegador.';
                return;
            }
            availability=next;
            availabilityMessage.textContent='Vagas salvas. Elas serão oferecidas conforme a duração de cada serviço.';
            if(availabilityToggle)availabilityToggle.checked=false;
        });
    }
    function render(){
        renderCalendar();
        renderList()
    }
    const dateInput=$('[name=data]',form);
    if(dateInput)dateInput.value=keyDate(today);
    form.addEventListener('submit',async e=>{
        e.preventDefault();
        const data=Object.fromEntries(new FormData(form));
        const status=['pendente','confirmado','concluido','cancelado'].includes(data.status)?data.status:'pendente';
        const duration=Math.max(5,Number(data.duracao)||60);
        const startMinutes=Number(data.hora.slice(0,2))*60+Number(data.hora.slice(3,5));
        const endMinutes=startMinutes+duration;
        const conflict=items.some(item=>{
            if(item.data!==data.data||item.status==='cancelado'||status==='cancelado')return false;
            const otherStart=Number(item.hora.slice(0,2))*60+Number(item.hora.slice(3,5));
            const otherDuration=Number(item.duracaoMinutos)||(item.horaFim?Number(item.horaFim.slice(0,2))*60+Number(item.horaFim.slice(3,5))-otherStart:60);
            const otherEnd=otherStart+otherDuration;
            return startMinutes<otherEnd&&endMinutes>otherStart;
        });
        if(conflict){
            window.alert('Este atendimento se sobrepõe a outro agendamento. Escolha outro horário.');
            return;
        }
        const newItem={
            id:crypto.randomUUID(),cliente:data.cliente.trim(),telefone:(data.telefone||'').trim(),servico:data.servico.trim(),data:data.data,hora:data.hora,duracaoMinutos:duration,valor:Number(data.valor)||0,status
        };
        if(api){
            try{
                const saved=await api.createManualAppointment({nomeCliente:newItem.cliente,telefoneCliente:newItem.telefone,servico:newItem.servico,data:newItem.data,hora:newItem.hora,duracaoMinutos:duration,valor:newItem.valor,status:newItem.status,observacao:''});
                items.push(fromApi(saved));
            }catch(error){window.alert(`Não foi possível salvar pela API: ${apiErrorDetail(error)}`);return;}
        }else{items.push(newItem);}
        save();
        form.reset();
        if(dateInput)dateInput.value=keyDate(today);
        if(toggle)toggle.checked=false;
        selectedDay='';
        render()
    }
    );
    document.addEventListener('keydown',e=>{
        if(e.key==='Escape'){
            if(toggle)toggle.checked=false;
            if(availabilityToggle)availabilityToggle.checked=false;
        }
    }
    );
    if(api){
        try{
            const remoteAvailability=await api.getAvailability();
            const remoteItems=await api.listAppointments();
            availability={};
            weekdays.forEach(day=>{availability[day.key]={ativo:false,horarios:[]};});
            remoteAvailability.forEach(day=>{
                const key=weekdays[day.diaSemana]?.key;
                if(!key||!day.ativo)return;
                availability[key].ativo=true;
                availability[key].horarios.push({inicio:day.inicio,fim:day.fim});
            });
            Object.values(availability).forEach(day=>day.horarios.sort((a,b)=>a.inicio.localeCompare(b.inicio)));
            items=remoteItems.map(fromApi);
            store.write('disponibilidade',availability);
            store.write('agendamentos',items);
        }catch(error){console.warn('API AgendaUai indisponível; usando dados locais.',error);}
    }
    renderAvailability();
    render();
}
);
