/* AgendaUai estático: dados de demonstração no localStorage do navegador. */
(() => {
  'use strict';
  const scriptUrl = document.currentScript?.src || new URL('agenda-uai-api.js', location.href).href;
  const root = new URL('../', scriptUrl);
  const STORAGE = 'agendauai:static:v2';
  const SESSION = 'agendauai:static:v2:user';
  const SELECTED = 'agendauai:static:v2:store';
  const id = () => crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const read = () => { try { return JSON.parse(localStorage.getItem(STORAGE)) || { users:[], stores:[], services:[], appointments:[], availability:[], exceptions:[], socials:[], photos:[], reviews:[] }; } catch { return { users:[], stores:[], services:[], appointments:[], availability:[], exceptions:[], socials:[], photos:[], reviews:[] }; } };
  const write = state => { try { localStorage.setItem(STORAGE, JSON.stringify(state)); } catch { throw new Error('O armazenamento deste navegador está cheio. Reduza/remova fotos e tente novamente.'); } };
  let catalogPromise;
  const getCatalog = () => catalogPromise ||= fetch(new URL('data/catalogo.json', root)).then(r => { if (!r.ok) throw new Error(`Falha ao ler catálogo: HTTP ${r.status}`); return r.json(); });
  const asset = value => !value || /^(https?:|data:|blob:)/i.test(value) ? value : new URL(value.replace(/^\/?/, ''), root).href;
  const activeUser = () => { const userId = localStorage.getItem(SESSION); return read().users.find(u => u.id === userId) || null; };
  const getCurrentStoreId = state => { const requested=new URLSearchParams(location.search).get('loja'); if(requested)return requested; const userId=activeUser()?.id; const selected=localStorage.getItem(SELECTED); if(selected&&state.stores.some(s=>s.id===selected&&s.profissional_id===userId))return selected; return state.stores.find(s=>s.profissional_id===userId)?.id||''; };
  const imageData = file => new Promise((resolve,reject) => {
    if (!file) return resolve('');
    const reader = new FileReader(); reader.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
    reader.onload = () => {
      const img = new Image(); img.onerror = () => resolve(reader.result);
      img.onload = () => { const scale = Math.min(1, 1200 / Math.max(img.width,img.height)); const canvas = document.createElement('canvas'); canvas.width = Math.round(img.width*scale); canvas.height = Math.round(img.height*scale); canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height); resolve(canvas.toDataURL('image/jpeg',.78)); };
      img.src = reader.result;
    }; reader.readAsDataURL(file);
  });
  const hash = async (password,salt) => { const bytes = new TextEncoder().encode(`${salt}:${password}`); const result = await crypto.subtle.digest('SHA-256',bytes); return [...new Uint8Array(result)].map(x=>x.toString(16).padStart(2,'0')).join(''); };
  const publicUser = user => user ? ({ id:user.id, email:user.email, user_metadata:{nome_completo:user.nome_completo,tipo_conta:user.tipo_conta}, nome_completo:user.nome_completo, tipo_conta:user.tipo_conta }) : null;
  const toStore = (s,categories=[]) => {
    const categoriesById = new Map(categories.map(c=>[c.id,c]));
    const linked = s.categoriaId ? [categoriesById.get(s.categoriaId)].filter(Boolean) : (s.categorias||[]);
    const data = s.endereco || {};
    return { ...s, logo_url:asset(s.logo_url||s.logoUrl), foto_url:asset(s.foto_url||s.fotoUrl||s.logo_url||s.logoUrl), endereco:{...data}, categorias:linked.map(c=>typeof c==='string'?c:c.nome), categoriaIds:linked.map(c=>c.id).filter(Boolean), categoriaSlugs:linked.map(c=>c.slug).filter(Boolean), nome_profissional:s.nome_profissional||s.nomeProfissional||'', servicos:s.servicos||[], fotosTrabalho:s.fotosTrabalho||[] };
  };
  async function stores() {
    const [catalog,state]=await Promise.all([getCatalog(),Promise.resolve(read())]);
    const initial=(catalog.lojas||[]).map(s=>({...s,logo_url:s.logoUrl,foto_url:s.fotoUrl,servicos:s.servicos||[],categoriaId:s.categorias?.[0]?.id,categorias:s.categorias||[]}));
    const byId=new Map([...state.stores,...initial].map(s=>[s.id,s]));
    return [...byId.values()].filter(s=>s.status!=='arquivada').map(s=>toStore(s,catalog.categorias||[])).sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR'));
  }
  const selectedStore = async () => { const state=read(), sid=getCurrentStoreId(state); return (await stores()).find(s=>s.id===sid)||null; };
  const listServices = async () => { const s=await selectedStore(); if(!s)return []; const state=read(); const isLocalStore=state.stores.some(x=>x.id===s.id); const extra=isLocalStore?state.services.filter(x=>x.loja_id===s.id):[]; return [...(s.servicos||[]),...extra].map(x=>({id:x.id||id(),nome:x.nome,descricao:x.descricao||'',preco:Number(x.preco)||0,duracaoMinutos:Number(x.duracaoMinutos||x.duracao_minutos)||30,ativo:x.ativo!==false})); };
  const listAppointments = async (status='') => { const s=await selectedStore(), user=activeUser(); let items=read().appointments; if(s)items=items.filter(x=>x.lojaId===s.id); else if(user)items=items.filter(x=>x.clienteId===user.id); if(status)items=items.filter(x=>x.status===status); return items; };
  const methods = {
    isStaticDemo:true,
    listPublicStores:stores,
    listCategories:async()=>((await getCatalog()).categorias||[]).filter(x=>x.ativo!==false),
    getCurrentUser:async()=>publicUser(activeUser()),
    getStore:selectedStore,
    listStores:async()=>{const user=activeUser();return (await stores()).filter(s=>s.profissional_id===user?.id);},
    setStoreId:async storeId=>{localStorage.setItem(SELECTED,storeId);return true;},
    setStoreStatus:async(storeId,status)=>{const state=read(),s=state.stores.find(x=>x.id===storeId);if(s){s.status=status;write(state);}return true;},
    createStore:async data=>{const user=activeUser();if(!user)throw new Error('Entre ou crie uma conta antes de cadastrar a loja.');const image=await imageData(data.foto);const store={id:id(),profissional_id:user.id,nome:data.nome,descricao:data.descricao||'',logo_url:image,foto_url:image,telefone:data.telefone||'',whatsapp:data.whatsapp||'',status:'publicada',categoriaId:data.categoriaId,endereco:data.endereco||{},categorias:[],created_at:new Date().toISOString()};const state=read();state.stores.push(store);for(const item of data.servicos||[])state.services.push({id:id(),loja_id:store.id,...item,ativo:true});write(state);localStorage.setItem(SELECTED,store.id);return store;},
    listServices,
    createService:async data=>{const s=await selectedStore();if(!s)throw new Error('Cadastre/seleciona uma loja primeiro.');const state=read(),item={id:id(),loja_id:s.id,nome:data.nome,descricao:data.descricao||'',preco:Number(data.preco)||0,duracao_minutos:Number(data.duracao_minutos||data.duracaoMinutos)||30,ativo:true};state.services.push(item);write(state);return {...item,duracaoMinutos:item.duracao_minutos};},
    updateService:async(serviceId,data)=>{const state=read(),item=state.services.find(x=>x.id===serviceId);if(item)Object.assign(item,data);write(state);return item;},
    deleteService:async serviceId=>{const state=read();state.services=state.services.filter(x=>x.id!==serviceId);write(state);return true;},
    getAvailability:async()=>{const s=await selectedStore();const own=read().availability.filter(x=>x.lojaId===s?.id);if(own.length)return own.map(x=>({diaSemana:x.diaSemana,ativo:x.ativo,inicio:x.inicio,fim:x.fim}));return (s?.horariosSemanais||[]).map(x=>({diaSemana:Number(x.diaSemana),ativo:true,inicio:x.inicio,fim:x.fim}));},
    saveAvailability:async rows=>{const s=await selectedStore();if(!s)throw new Error('Nenhuma loja selecionada.');const state=read();state.availability=state.availability.filter(x=>x.lojaId!==s.id).concat((rows||[]).map(x=>({...x,lojaId:s.id})));write(state);return rows;},
    getAvailabilityForDate:async date=>{const day=new Date(`${date}T12:00:00`).getDay();return (await methods.getAvailability()).filter(x=>Number(x.diaSemana)===day&&x.ativo);},
    getExceptions:async()=>{const s=await selectedStore();return read().exceptions.filter(x=>x.lojaId===s?.id);},
    listBusySlots:async date=>(await listAppointments()).filter(x=>x.data===date&&x.status!=='cancelado'),
    createBooking:async data=>{const user=activeUser();if(!user)throw new Error('Faça login para solicitar um horário.');const all=await stores(),service=(await listServices()).find(x=>x.id===data.servicoId);if(!service)throw new Error('Serviço não encontrado.');const s=await selectedStore();const item={id:id(),lojaId:s?.id,clienteId:user.id,nomeCliente:user.nome_completo,telefoneCliente:user.telefone||'',servico:service.nome,servicoId:service.id,valor:service.preco,duracaoMinutos:service.duracaoMinutos,data:data.data,hora:data.hora,status:'pendente',observacao:data.observacao||'',created_at:new Date().toISOString()};const state=read();state.appointments.push(item);write(state);return item;},
    createManualAppointment:async data=>{const s=await selectedStore();const state=read(),item={id:id(),lojaId:s?.id,...data,status:data.status||'confirmado',created_at:new Date().toISOString()};state.appointments.push(item);write(state);return item;},
    listAppointments,
    updateStatus:async(appointmentId,status)=>{const state=read(),item=state.appointments.find(x=>x.id===appointmentId);if(item)item.status=status;write(state);return item;},
    getProfessionalProfile:async()=>{const user=activeUser(),store=await selectedStore();return {user,store};},
    saveProfessionalProfile:async data=>{const user=activeUser(),s=await selectedStore();if(!s)throw new Error('Nenhuma loja vinculada a esta conta.');const image=await imageData(data.foto);const state=read(),item=state.stores.find(x=>x.id===s.id);Object.assign(item,{nome:data.nomeLoja||item.nome,nome_profissional:data.nomeCompleto||user?.nome_completo,descricao:data.descricao||'',telefone:data.telefone||'',instagram:data.instagram||'',endereco:data.endereco||item.endereco,foto_url:image||data.fotoUrl||item.foto_url,logo_url:image||data.fotoUrl||item.logo_url,categoriaId:data.categoriaId||item.categoriaId});write(state);return item;},
    getSocialLinks:async()=>{const s=await selectedStore();return read().socials.filter(x=>x.lojaId===s?.id);},
    createSocialLink:async data=>{const s=await selectedStore(),state=read(),item={id:id(),lojaId:s?.id,...data};state.socials.push(item);write(state);return item;},
    deleteSocialLink:async socialId=>{const state=read();state.socials=state.socials.filter(x=>x.id!==socialId);write(state);return true;},
    listWorkPhotos:async()=>{const s=await selectedStore();return read().photos.filter(x=>x.lojaId===s?.id);},
    addWorkPhoto:async(data,caption='')=>{const s=await selectedStore(),state=read(),file=data instanceof File?data:(data?.foto||data?.file),item={id:id(),lojaId:s?.id,url:await imageData(file),legenda:typeof data==='object'?(data?.legenda||caption):caption};state.photos.push(item);write(state);return item;},
    deleteWorkPhoto:async photoId=>{const state=read();state.photos=state.photos.filter(x=>x.id!==photoId);write(state);return true;},
    listStoreReviews:async storeId=>read().reviews.filter(x=>x.lojaId===storeId),
    createStoreReview:async(storeId,data)=>{const user=activeUser();if(!user)throw new Error('Entre na conta para avaliar.');const state=read(),item={id:id(),lojaId:storeId,clienteId:user.id,nomeCliente:user.nome_completo,...data,created_at:new Date().toISOString()};state.reviews.push(item);write(state);return item;},
    getDashboardMetrics:async()=>{const s=await selectedStore(),items=await listAppointments(),now=new Date(),month=items.filter(x=>String(x.data||'').startsWith(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`));return {total_lojas:s?1:0,total_servicos_ativos:(await listServices()).filter(x=>x.ativo).length,agendamentos_do_mes:month.length,faturamento_mensal:month.filter(x=>x.status==='concluido').reduce((sum,x)=>sum+(Number(x.valor)||0),0),novos_clientes_mes:new Set(month.map(x=>x.clienteId)).size};},
    getOccupancyMetrics:async()=>({percentual_ocupacao:0}),
    getClient:()=>client
  };
  const listeners=[];
  const emit=(event,user)=>listeners.forEach(fn=>fn(event,user?{user:publicUser(user)}:null));
  const client={auth:{
    signUp:async({email,password,options={}})=>{const state=read();if(state.users.some(u=>u.email.toLowerCase()===email.trim().toLowerCase()))return {data:{user:null,session:null},error:new Error('User already registered')};const salt=id(),user={id:id(),email:email.trim(),passwordHash:await hash(password,salt),salt,nome_completo:options.data?.nome_completo||'',tipo_conta:options.data?.tipo_conta||'contratante',telefone:''};state.users.push(user);write(state);localStorage.setItem(SESSION,user.id);emit('SIGNED_IN',user);return {data:{user:publicUser(user),session:{user:publicUser(user)}},error:null};},
    signInWithPassword:async({email,password})=>{const user=read().users.find(u=>u.email.toLowerCase()===email.trim().toLowerCase());if(!user||user.passwordHash!==await hash(password,user.salt))return {data:{user:null,session:null},error:new Error('Invalid login credentials')};localStorage.setItem(SESSION,user.id);emit('SIGNED_IN',user);return {data:{user:publicUser(user),session:{user:publicUser(user)}},error:null};},
    signOut:async()=>{localStorage.removeItem(SESSION);emit('SIGNED_OUT',null);return {error:null};},
    getUser:async()=>({data:{user:publicUser(activeUser())},error:null}),
    updateUser:async({password})=>{const user=activeUser();if(!user)return {error:new Error('Entre novamente para alterar a senha.')};user.salt=id();user.passwordHash=await hash(password,user.salt);const state=read();state.users=state.users.map(x=>x.id===user.id?user:x);write(state);return {data:{user:publicUser(user)},error:null};},
    resetPasswordForEmail:async()=>({error:new Error('A recuperação por e-mail requer um serviço de e-mail; não está disponível na versão estática.')}),
    onAuthStateChange:callback=>{listeners.push(callback);return {data:{subscription:{unsubscribe:()=>{const i=listeners.indexOf(callback);if(i>=0)listeners.splice(i,1);}}}};}
  }};
  window.AgendaUaiApi=methods;
  if(!location.protocol.startsWith('http')) console.warn('AgendaUai: abra por um servidor local (ou GitHub Pages) para carregar o catálogo JSON.');
})();
