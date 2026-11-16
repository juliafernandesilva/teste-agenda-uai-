document.addEventListener('DOMContentLoaded',()=>{
    const store=window.AgendaUaiStore,api=window.AgendaUaiApi,form=document.getElementById('form-servico');
    if(!store||!form)return;
    const $=id=>document.getElementById(id),msg=$('servico-msg');
    let items=store.read('servicos',[]);
    const fromApi=x=>({id:x.id,nome:x.nome,preco:Number(x.preco),duracao:Number(x.duracaoMinutos),descricao:x.descricao||'',_api:true});
    function save(){store.write('servicos',items);}
    form.addEventListener('submit',async event=>{
        event.preventDefault();
        const nome=$('servico-nome').value.trim(),preco=Number($('servico-preco').value),duracao=Number($('servico-duracao').value),descricao=$('servico-descricao').value.trim();
        if(!nome||preco<0||duracao<5){msg.textContent='Confira os campos obrigatórios.';return;}
        const payload={nome,preco,duracaoMinutos:duracao,descricao};
        let item={id:crypto.randomUUID(),nome,preco,duracao,descricao};
        if(api){
            try{item=fromApi(await api.createService(payload));}
            catch(error){msg.className='form-msg';msg.textContent=`Não foi possível salvar na API: ${error.message}`;return;}
        }
        items=[...items,item];
        save();form.reset();msg.className='form-msg success';msg.textContent='Serviço salvo com sucesso.';
    });
    if(api)api.listServices().then(async data=>{
        const oldItems=items.filter(item=>!item._api);
        for(const old of oldItems){
            const existing=data.find(item=>item.nome.trim().toLocaleLowerCase()===old.nome.trim().toLocaleLowerCase());
            const payload={nome:old.nome,preco:Number(old.preco),duracaoMinutos:Number(old.duracao),descricao:old.descricao||''};
            try{
                if(existing){
                    if(Number(existing.preco)!==payload.preco||Number(existing.duracaoMinutos)!==payload.duracaoMinutos||String(existing.descricao||'')!==payload.descricao)await api.updateService(existing.id,payload);
                }else{await api.createService(payload);}
            }catch(error){msg.textContent=`Não foi possível migrar um serviço local: ${error.message}`;}
        }
        items=(await api.listServices()).map(fromApi);save();
    }).catch(error=>{msg.textContent=`Não foi possível salvar os serviços neste navegador: ${error.message}`;});
});
