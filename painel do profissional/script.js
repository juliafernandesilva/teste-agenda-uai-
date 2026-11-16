document.addEventListener('DOMContentLoaded',()=>{
    const store=window.AgendaUaiStore;
    if(!store)return;
    const themeButton=document.createElement('button');
    themeButton.type='button';
    themeButton.className='theme-toggle';
    const darkMode=store.read('modoNoturno',false)===true;
    function applyTheme(enabled,save=true){
        document.documentElement.dataset.theme=enabled?'dark':'light';
        themeButton.innerHTML=`<i class="fa-solid ${enabled?'fa-sun':'fa-moon'}" aria-hidden="true"></i>`;
        themeButton.setAttribute('aria-label',enabled?'Ativar modo claro':'Ativar modo noturno');
        themeButton.setAttribute('aria-pressed',String(enabled));
        themeButton.title=enabled?'Mudar para modo claro':'Mudar para modo noturno';
        if(save)store.write('modoNoturno',enabled);
    }
    applyTheme(darkMode,false);
    const headerActions=document.querySelector('.header-actions');
    if(headerActions){
        themeButton.addEventListener('click',()=>applyTheme(document.documentElement.dataset.theme!=='dark'));
        headerActions.prepend(themeButton);
    }
    const profile=store.read('perfilProfissional',{});
    const nome=profile.nome||store.read('estabelecimento','');
    document.querySelectorAll('.establishment-name').forEach(el=>{
        if(nome)el.textContent=nome
    }
    );
    const title=document.getElementById('establishment-title');
    if(title&&nome)title.textContent=nome;
    const description=document.getElementById('establishment-description');
    if(description&&(profile.especialidade||profile.descricao))description.textContent=[profile.especialidade,profile.descricao].filter(Boolean).join(' · ');
    const statusText=document.getElementById('status-text');
    const statusBadge=document.getElementById('status-badge');
    if(statusText&&profile.nome&&profile.especialidade){statusText.textContent='Perfil de demonstração configurado';statusBadge?.classList.add('configured');}
    const image=store.read('foto','');
    const avatar=document.getElementById('avatar-button');
    if(avatar&&image){
        avatar.innerHTML=`<img src="${image}" alt="Foto do estabelecimento" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
        avatar.style.padding='0';
        avatar.style.overflow='hidden'
    }
    const input=document.getElementById('file-input');
    if(avatar&&input){
        avatar.addEventListener('click',()=>input.click());
        input.addEventListener('change',()=>{
            const file=input.files&&input.files[0];
            if(!file)return;
            if(!file.type.startsWith('image/'))return;
            const reader=new FileReader();
            reader.onload=()=>{
                const src=reader.result;
                if(store.write('foto',src)){
                    avatar.innerHTML=`<img src="${src}" alt="Foto do estabelecimento" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
                    avatar.style.padding='0';
                    avatar.style.overflow='hidden'
                }
            }
            ;
            reader.readAsDataURL(file)
        }
        )
    }
    const userMenu=document.querySelector('.user-menu');
    if(userMenu)document.addEventListener('click',e=>{
        if(!userMenu.contains(e.target))userMenu.removeAttribute('open')
    }
    );
    if(document.body.dataset.page==='home')loadDashboard(store);
    if(window.AgendaUaiApi){
        window.AgendaUaiApi.getStore().then(remoteStore=>{
            if(!remoteStore)return;
            document.querySelectorAll('.establishment-name').forEach(el=>el.textContent=remoteStore.nome||'Minha loja');
            const title=document.getElementById('establishment-title');
            if(title)title.textContent=remoteStore.nome||'Minha loja';
            const description=document.getElementById('establishment-description');
            if(description)description.textContent=remoteStore.descricao||'Complete a descrição da loja para apresentar seu negócio aos clientes.';
            const avatar=document.getElementById('avatar-button');
            if(avatar&&remoteStore.logo_url){
                const image=document.createElement('img');
                image.src=remoteStore.logo_url;
                image.alt='Foto da loja';
                image.style.cssText='width:100%;height:100%;object-fit:cover;border-radius:50%';
                avatar.replaceChildren(image);
                avatar.style.padding='0';
                avatar.style.overflow='hidden';
            }
            const status=document.getElementById('status-text');
            if(status)status.textContent=remoteStore.status==='publicada'?'Loja publicada':'Loja em rascunho';
            const badge=document.getElementById('status-badge');
            if(badge&&remoteStore.status==='publicada')badge.classList.add('configured');
        }).catch(error=>console.info('Não foi possível carregar os dados da loja.',error));
    }
}
);

function googleCalendarUrlForAppointment(item){
    const [year,month,day]=String(item.data).split('-').map(Number);
    const start=new Date(year,month-1,day);
    const [hour,minute]=String(item.hora||'09:00').slice(0,5).split(':').map(Number);
    start.setHours(hour,minute,0,0);
    const end=new Date(start);
    if(item.horaFim){
        const [endHour,endMinute]=String(item.horaFim).slice(0,5).split(':').map(Number);
        end.setHours(endHour,endMinute,0,0);
    }else end.setMinutes(end.getMinutes()+Number(item.duracaoMinutos||60));
    const stamp=date=>`${date.getFullYear()}${String(date.getMonth()+1).padStart(2,'0')}${String(date.getDate()).padStart(2,'0')}T${String(date.getHours()).padStart(2,'0')}${String(date.getMinutes()).padStart(2,'0')}00`;
    const money=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(item.valor)||0);
    const details=[`Cliente: ${item.cliente||item.nomeCliente||'Cliente'}`,item.telefone?`WhatsApp: ${item.telefone}`:'',`Serviço: ${item.servico||'Serviço'}`,`Valor: ${money}`].filter(Boolean).join('\n');
    const params=new URLSearchParams({action:'TEMPLATE',text:`AgendaUai - ${item.servico||'Atendimento'} (${item.cliente||item.nomeCliente||'Cliente'})`,dates:`${stamp(start)}/${stamp(end)}`,details,ctz:'America/Sao_Paulo'});
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function renderHomeAppointments(appointments,store,errorText=''){
    const list=document.getElementById('home-agendamentos');
    const empty=document.getElementById('home-agendamentos-vazio');
    const errorBox=document.getElementById('home-agendamentos-erro');
    const badge=document.getElementById('home-pedidos-pendentes');
    if(!list||!empty)return;
    list.replaceChildren();
    const today=new Date();today.setHours(0,0,0,0);
    const dateKey=date=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
    const upcoming=appointments.filter(item=>item.data>=dateKey(today)&&!['cancelado','rejeitado','concluido'].includes(String(item.status).toLowerCase())).sort((a,b)=>(a.data+a.hora).localeCompare(b.data+b.hora)).slice(0,8);
    const pendingCount=errorText?0:upcoming.filter(item=>String(item.status).toLowerCase()==='pendente').length;
    if(badge){badge.textContent=pendingCount?`${pendingCount} ${pendingCount===1?'pedido pendente':'pedidos pendentes'}`:'';badge.hidden=!pendingCount;}
    if(errorBox){errorBox.textContent=errorText?`Não foi possível ler os agendamentos locais: ${errorText}`:'';errorBox.hidden=!errorText;}
    empty.hidden=Boolean(errorText)||upcoming.length>0;
    if(errorText)return;

    const statusNames={pendente:'Aguardando resposta',confirmado:'Confirmado',concluido:'Concluído'};
    upcoming.forEach(item=>{
        const row=document.createElement('article');row.className='item-row home-appointment';
        const info=document.createElement('div');info.className='item-main';
        const name=document.createElement('strong');name.textContent=item.cliente||item.nomeCliente||'Cliente';
        const detail=document.createElement('span');
        const date=item.data?new Date(`${item.data}T12:00:00`).toLocaleDateString('pt-BR'):'';
        const status=String(item.status||'pendente').toLowerCase();
        detail.textContent=`${date} às ${item.hora||'—'} · ${item.servico||'Serviço'} · ${statusNames[status]||status}`;
        info.append(name,detail);
        const observation=String(item.observacao||item.obs||'').trim();
        if(observation){const note=document.createElement('span');note.className='home-observacao';note.textContent=`Observação: ${observation}`;info.append(note);}
        const actions=document.createElement('div');actions.className='home-appointment-actions';
        if(status==='pendente'){
            const accept=document.createElement('button');accept.type='button';accept.className='btn-action btn-ghost';accept.textContent='Aceitar';
            accept.addEventListener('click',async()=>{
                const calendarTab=window.open('about:blank','_blank');
                if(calendarTab)calendarTab.opener=null;
                accept.disabled=true;
                try{
                    if(window.AgendaUaiApi)await window.AgendaUaiApi.updateStatus(item.id,'confirmado');
                    item.status='confirmado';store.write('agendamentos',appointments);
                    renderHomeAppointments(appointments,store);
                    if(calendarTab)calendarTab.location.href=googleCalendarUrlForAppointment(item);
                }catch(error){
                    if(calendarTab)calendarTab.close();
                    accept.disabled=false;
                    window.alert(`Não foi possível aceitar o pedido: ${error.message}`);
                }
            });
            const reject=document.createElement('button');reject.type='button';reject.className='btn-action btn-red-outline';reject.textContent='Recusar';
            reject.addEventListener('click',async()=>{
                reject.disabled=true;
                try{
                    if(window.AgendaUaiApi)await window.AgendaUaiApi.updateStatus(item.id,'rejeitado');
                    item.status='rejeitado';store.write('agendamentos',appointments);
                    renderHomeAppointments(appointments,store);
                }catch(error){reject.disabled=false;window.alert(`Não foi possível recusar o pedido: ${error.message}`);}
            });
            actions.append(accept,reject);
        }else if(status==='confirmado'){
            const calendarLink=document.createElement('a');calendarLink.className='btn-action btn-ghost';calendarLink.href=googleCalendarUrlForAppointment(item);calendarLink.target='_blank';calendarLink.rel='noopener noreferrer';calendarLink.textContent='Google Agenda';
            actions.append(calendarLink);
        }
        row.append(info,actions);list.append(row);
    });
}

async function loadDashboard(store){
    const api=window.AgendaUaiApi;
    const availabilityList=document.getElementById('home-disponibilidade');
    const availabilityEmpty=document.getElementById('home-disponibilidade-vazia');
    const money=value=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(value)||0);
    let appointments=store.read('agendamentos',[]);
    let availability=store.read('disponibilidade',{});
    let appointmentLoadError='';
    if(api){
        const [appointmentResult,availabilityResult]=await Promise.allSettled([api.listAppointments(),api.getAvailability()]);
        if(appointmentResult.status==='fulfilled'){
            appointments=appointmentResult.value.map(item=>({...item,cliente:item.nomeCliente,telefone:item.telefoneCliente,servico:item.servico,status:String(item.status).toLowerCase()}));
            store.write('agendamentos',appointments);
        }else{
            appointmentLoadError=appointmentResult.reason?.message||'Falha na leitura dos pedidos.';
            console.warn('Não foi possível consultar os pedidos de agendamento.',appointmentResult.reason);
        }
        if(availabilityResult.status==='fulfilled'){
            availability={};
            const keys=['domingo','segunda','terca','quarta','quinta','sexta','sabado'];
            keys.forEach(key=>availability[key]={ativo:false,horarios:[]});
            availabilityResult.value.forEach(item=>{
                const key=keys[item.diaSemana];
                if(key&&item.ativo){availability[key].ativo=true;availability[key].horarios.push({inicio:item.inicio,fim:item.fim});}
            });
        }else console.warn('Não foi possível carregar a disponibilidade.',availabilityResult.reason);
    }
    store.write('agendamentos',appointments);
    store.write('disponibilidade',availability);
    renderHomeAppointments(appointments,store,appointmentLoadError);
    if(api&&!window.__agendaUaiHomeAppointmentPoll){
        window.__agendaUaiHomeAppointmentPoll=window.setInterval(async()=>{
            if(document.visibilityState==='hidden')return;
            try{
                const remoteAppointments=await api.listAppointments();
                appointments=remoteAppointments.map(item=>({...item,cliente:item.nomeCliente,telefone:item.telefoneCliente,servico:item.servico,status:String(item.status).toLowerCase()}));
                store.write('agendamentos',appointments);
                renderHomeAppointments(appointments,store);
            }catch(error){
                console.warn('Não foi possível atualizar os pedidos do painel.',error);
                if(!appointments.length)renderHomeAppointments(appointments,store,error.message||'Falha na leitura dos pedidos.');
            }
        },15000);
    }
    if(api){
        try{
            const [metrics,occupancy]=await Promise.all([api.getDashboardMetrics(),api.getOccupancyMetrics()]);
            const values={
                'home-total-lojas':metrics?.total_lojas,
                'home-servicos-ativos':metrics?.total_servicos_ativos,
                'home-agendamentos-mes':metrics?.agendamentos_do_mes,
                'home-faturamento':money(metrics?.faturamento_mensal),
                'home-novos-clientes':metrics?.novos_clientes_mes,
                'home-ocupacao':`${Number(occupancy?.percentual_ocupacao||0).toLocaleString('pt-BR')}%`
            };
            Object.entries(values).forEach(([id,value])=>{
                const element=document.getElementById(id);
                if(element&&value!==undefined&&value!==null)element.textContent=value;
            });
        }catch(error){
            console.info('Os indicadores do painel não puderam ser consultados.',error);
            ['home-total-lojas','home-servicos-ativos','home-agendamentos-mes','home-faturamento','home-novos-clientes','home-ocupacao'].forEach(id=>{
                const element=document.getElementById(id);
                if(element)element.textContent='—';
            });
        }
    }

    if(availabilityList&&availabilityEmpty){
        availabilityList.replaceChildren();
        const labels=[['domingo','Domingo'],['segunda','Segunda-feira'],['terca','Terça-feira'],['quarta','Quarta-feira'],['quinta','Quinta-feira'],['sexta','Sexta-feira'],['sabado','Sábado']];
        let count=0;
        labels.forEach(([key,label])=>{
            const day=availability[key];
            if(!day?.ativo)return;
            const row=document.createElement('article');row.className='item-row home-availability';
            const name=document.createElement('strong');name.textContent=label;
            const hours=document.createElement('span');hours.textContent=(day.horarios||[]).map(slot=>`${slot.inicio}–${slot.fim}`).join(' · ')||'Horário configurado';
            row.append(name,hours);availabilityList.append(row);count++;
        });
        availabilityEmpty.hidden=count>0;
    }
}
