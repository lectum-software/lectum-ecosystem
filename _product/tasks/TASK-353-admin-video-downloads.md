# TASK-353 - Lista de downloads de video no admin

## Escopo

Substituir botoes Original/Com arte pela lista Original, Legenda, ID em todos os usos do componente administrativo. ID preserva a arte de identificacao; Legenda usa o mesmo renderizador e as mesmas legendas persistidas usadas pelo psicologo.

Referencia: captura enviada pelo usuario e PROTO-INVENTORY; Builder indisponivel. Sem alteracao de banco ou do servico de video.

## Aceite

- [x] Lista compartilhada com Original, Legenda e ID e bloqueio durante preparo.
- [x] Backend valida modo, resolve conteudo/autoria e carrega legenda pronta antes de criar job.
- [x] Sem fallback silencioso para original quando falta legenda.
- [x] Checks/builds e previa fiel do componente.
- [ ] Aprovacao visual e download completo em ambiente autenticado.

## Publicacao

Nao publicar automaticamente. Publicar backend antes do admin: backend antigo ignora a nova opcao de legenda. Nenhuma alteracao nas credenciais, filas, arquivos ou dados de producao nesta task.

## Evidencias

- Admin: check completo e build aprovados. Versao local 0.1.854, sem push/deploy.
- Chrome renderizando o componente real com CSS e fonte do admin: lista Original/Legenda/ID, Escape, largura mobile sem overflow e requisicao com overlayMode=captions conferidos.
- Previa isolada em .tmp/admin353-open.png, sem dados ficticios de usuarios. Requisicoes externas abortadas: nenhum job remoto foi criado.
- Backend: typecheck/build aprovados e 1547 testes aprovados, 60 ignorados, zero falhas. Variaveis locais descartaveis usadas apenas para validacao.
- Render completo com arquivo remoto ainda depende de ambiente autenticado e backend atualizado; nao comprovado pela previa visual.
