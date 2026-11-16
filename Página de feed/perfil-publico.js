document.addEventListener('DOMContentLoaded', async () => {
  const $ = id => document.getElementById(id);
  const status = $('perfil-status'), content = $('perfil-conteudo');
  const storeId = new URLSearchParams(location.search).get('loja');
  const money = value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0);
  const locationText = store => [store.endereco?.rua, store.endereco?.numero, store.endereco?.bairro, store.endereco?.cidade, store.endereco?.estado].filter(Boolean).join(', ');
  if (!storeId) { status.textContent = 'Este perfil não tem uma loja selecionada.'; return; }
  try {
    const stores = await AgendaUaiApi.listPublicStores();
    const store = stores.find(item => String(item.id) === String(storeId));
    if (!store) { status.textContent = 'Este estabelecimento não está disponível no momento.'; return; }
    const bookingUrl = `../agendamento/index.html?loja=${encodeURIComponent(store.id)}`;
    document.title = `${store.nome} | AgendaUai`;
    $('perfil-nome').textContent = store.nome || 'Estabelecimento AgendaUai';
    $('perfil-sticky-nome').textContent = store.nome || 'Estabelecimento AgendaUai';
    const local = [store.endereco?.bairro, store.endereco?.cidade, store.endereco?.estado].filter(Boolean).join(' · ') || 'Localização em atualização';
    $('perfil-local').textContent = local; $('perfil-sticky-local').textContent = local;
    $('perfil-descricao').textContent = store.descricao || 'Este estabelecimento ainda não adicionou uma descrição.';
    $('perfil-profissional').textContent = store.nome_profissional ? `Profissional: ${store.nome_profissional}` : '';
    ['perfil-agendar-topo','perfil-agendar-hero','perfil-agendar-lateral'].forEach(id => $(id).href = bookingUrl);
    const addr = locationText(store) || local; $('perfil-endereco').textContent = addr;
    $('perfil-mapa').href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;
    const imageUrl = store.logo_url || store.foto_url || '';
    const logo = $('perfil-marca'), stickyLogo = $('perfil-sticky-marca');
    const initial = String(store.nome || 'A').trim().slice(0,1).toUpperCase();
    if (imageUrl) { const img=document.createElement('img');img.className='perfil-foto-capa';img.src=imageUrl;img.alt=`Foto do perfil de ${store.nome}`;img.loading='eager';$('perfil-capa').prepend(img);logo.hidden=true;stickyLogo.textContent=initial; }
    else { logo.textContent=initial; stickyLogo.textContent=initial; }
    (store.categorias || []).forEach(name => { const tag=document.createElement('span'); tag.textContent=name; $('perfil-categorias').append(tag); });
    const contact=$('perfil-contato');
    if(store.whatsapp||store.telefone){const phone=String(store.whatsapp||store.telefone).replace(/\D/g,'');const link=document.createElement('a');link.href=`https://wa.me/55${phone}`;link.target='_blank';link.rel='noopener';link.textContent='Conversar pelo WhatsApp';contact.append(link);}
    (store.redesSociais||[]).forEach(social=>{if(!social.url)return;const link=document.createElement('a');link.href=social.url;link.target='_blank';link.rel='noopener';link.textContent=social.plataforma==='instagram'?'Instagram':social.plataforma;contact.append(link);});

    const services=$('perfil-servicos-lista');
    const renderServices = query => { services.replaceChildren(); const filtered=(store.servicos||[]).filter(service=>`${service.nome||''} ${service.descricao||''}`.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR')));
      if(!filtered.length){services.textContent=(store.servicos||[]).length?'Nenhum serviço corresponde à busca.':'Este estabelecimento ainda não cadastrou serviços.';return;}
      filtered.forEach(service=>{const row=document.createElement('article');row.className='perfil-servico-linha';const info=document.createElement('div');const title=document.createElement('h4');title.textContent=service.nome||'Serviço';const desc=document.createElement('p');desc.textContent=service.descricao||`${Number(service.duracaoMinutos)||0} min`;info.append(title,desc);const meta=document.createElement('div');meta.className='perfil-servico-preco';const price=document.createElement('strong');price.textContent=money(service.preco);const duration=document.createElement('small');duration.textContent=`${Number(service.duracaoMinutos)||0} min`;meta.append(price,duration);const book=document.createElement('a');book.className='perfil-cta perfil-cta-servico';book.href=`${bookingUrl}&servico=${encodeURIComponent(service.id)}`;book.textContent='Agendar';row.append(info,meta,book);services.append(row);}); };
    renderServices(''); $('perfil-buscar-servico').addEventListener('input', event => renderServices(event.target.value.trim()));
    const photos=store.fotosTrabalho||[]; if(photos.length){photos.forEach(photo=>{const figure=document.createElement('figure'),img=document.createElement('img');img.src=photo.url;img.alt=photo.legenda||`Trabalho realizado por ${store.nome}`;img.loading='lazy';figure.append(img);if(photo.legenda){const caption=document.createElement('figcaption');caption.textContent=photo.legenda;figure.append(caption);} $('perfil-galeria').append(figure);});$('perfil-galeria-secao').hidden=false;}

    try { const days=await AgendaUaiApi.getAvailability(); const labels=['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];const mapped=new Map();days.forEach(day=>{const key=Number(day.diaSemana);if(!day.ativo)return;if(!mapped.has(key))mapped.set(key,[]);mapped.get(key).push(`${day.inicio}–${day.fim}`);});$('perfil-horarios').replaceChildren();labels.forEach((label,index)=>{const row=document.createElement('div');row.className='perfil-horario-linha';const name=document.createElement('span');name.textContent=label;const hours=document.createElement('strong');hours.textContent=mapped.get(index)?.join(', ')||'Fechado';row.append(name,hours);$('perfil-horarios').append(row);}); } catch (_) { /* Horários ficam com orientação de agendamento se API não os fornecer. */ }
    async function renderReviews() {
      const list=$('perfil-review-lista'), empty=$('perfil-review-vazio'), access=$('perfil-review-acesso'), form=$('perfil-review-form'), select=$('perfil-review-agendamento');
      try {
        const reviews=await AgendaUaiApi.listStoreReviews(store.id);
        list.replaceChildren();
        const total=reviews.length, average=total?reviews.reduce((sum,item)=>sum+Number(item.nota),0)/total:0;
        $('perfil-nota-media').textContent=total?`★ ${average.toFixed(1)} · ${total} ${total===1?'avaliação':'avaliações'}`:'Ainda sem avaliações';
        empty.hidden=total>0;
        reviews.forEach(item=>{const card=document.createElement('article');card.className='perfil-review-card';const head=document.createElement('div');head.className='perfil-review-card-cabecalho';const who=document.createElement('strong');who.textContent=item.nomeCliente||'Cliente AgendaUai';const stars=document.createElement('span');stars.className='perfil-review-estrelas';stars.textContent=`${'★'.repeat(Number(item.nota))}${'☆'.repeat(5-Number(item.nota))}`;head.append(who,stars);const date=document.createElement('small');date.textContent=item.created_at?new Date(item.created_at).toLocaleDateString('pt-BR'):'';card.append(head,date);if(item.comentario){const comment=document.createElement('p');comment.textContent=item.comentario;card.append(comment);}list.append(card);});
        const user=await AgendaUaiApi.getCurrentUser().catch(()=>null);
        if(!user){form.hidden=true;access.hidden=false;access.replaceChildren();const link=document.createElement('a');link.href=`../login%20e%20cadastro/login1510.html?returnTo=${encodeURIComponent(location.pathname+location.search)}`;link.textContent='Entre na sua conta para avaliar após um atendimento concluído.';access.append(link);return;}
        const appointments=await AgendaUaiApi.listAppointments().catch(()=>[]);
        const reviewed=new Set(reviews.map(item=>item.agendamentoId));
        const eligible=appointments.filter(item=>String(item.lojaId)===String(store.id)&&String(item.clienteId)===String(user.id)&&String(item.status).toLowerCase()==='concluido'&&!reviewed.has(item.id));
        access.hidden=eligible.length>0;access.textContent='Você poderá avaliar depois que um atendimento desta loja for concluído.';
        form.hidden=eligible.length===0;
        if(eligible.length){select.replaceChildren(...eligible.map(item=>{const option=document.createElement('option');option.value=item.id;option.textContent=`${item.data?new Date(`${item.data}T12:00:00`).toLocaleDateString('pt-BR'):''} · ${item.hora||''} · ${item.servico||'Atendimento'}`;return option;}));}
      } catch(error) { $('perfil-nota-media').textContent=`Não foi possível carregar as avaliações: ${error.message}`;empty.hidden=true; }
    }
    $('perfil-review-form').addEventListener('submit',async event=>{event.preventDefault();const form=event.currentTarget,button=form.querySelector('button[type="submit"]'),message=$('perfil-review-status');button.disabled=true;message.textContent='Enviando avaliação…';try{await AgendaUaiApi.createStoreReview(store.id,{agendamentoId:$('perfil-review-agendamento').value,nota:Number($('perfil-review-nota').value),comentario:$('perfil-review-comentario').value.trim()});$('perfil-review-comentario').value='';message.textContent='Obrigado pela avaliação!';await renderReviews();}catch(error){message.textContent=error.message;}finally{button.disabled=false;}});
    await renderReviews();
    const others=stores.filter(item=>String(item.id)!==String(store.id)).slice(0,4);if(others.length){others.forEach(item=>{const card=document.createElement('a');card.className='perfil-recomendado-card';card.href=`perfil-publico.html?loja=${encodeURIComponent(item.id)}`;if(item.logo_url){const img=document.createElement('img');img.src=item.logo_url;img.alt='';card.append(img);}const name=document.createElement('strong');name.textContent=item.nome;const cat=document.createElement('small');cat.textContent=(item.categorias||[]).join(' · ')||'Serviços locais';card.append(name,cat);$('perfil-recomendados').append(card);});$('perfil-recomendados-secao').hidden=false;}
    $('perfil-compartilhar').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(location.href);$('perfil-compartilhar').textContent='Link copiado';setTimeout(()=>$('perfil-compartilhar').textContent='Compartilhar',1800);}catch(_){location.href=`mailto:?subject=${encodeURIComponent(store.nome)}&body=${encodeURIComponent(location.href)}`;}});
    const sticky=$('perfil-sticky');const onScroll=()=>{sticky.hidden=scrollY<280;};window.addEventListener('scroll',onScroll,{passive:true});onScroll();status.hidden=true;content.hidden=false;
  } catch (error) { status.textContent = `Não foi possível carregar este perfil: ${error.message}`; }
});
