# ADR-0598: Alinhamento e contexto do comentario

Status: aceito. Data: 2026-10-11. Task: TASK-25.

## Decisao

Ajustar apenas o padding vertical do contenteditable local de 10px para 12px, equilibrando altura minima 44px e linha 20px com botao centralizado. Nao usar flex dentro do editor nem transform no texto, para preservar caret, multiline, placeholder e anexos. Manter React Hook Form/Zod e controlador existente. Corrigir os dois contextos para Respondendo a [NOME], sem mudar origem do nome/anonimato.

## Validacao e deploy

Mobile-first 390px; capturas do usuario/proto existentes, Builder indisponivel. Somente frontend, sem novas envs, pacotes, contratos, banco ou efeitos externos. Rollback por reversao. Teste focal 7/7, check completo e build frontend aprovados em 2026-10-11. Conferencia visual permanece pendente. Automacao do navegador continua indisponivel por falha de inicializacao do ambiente; nao confundir testes de fonte com validacao visual. Sem push/deploy.

## Complemento: editor de comentario na mesma fundacao visual

Escopo da TASK-25 inclui agora a modal de edicao ja autorizada: controle azul dentro da borda do campo e miniatura compacta integrada, reutilizando ReplyMediaAttachmentControl no modo composer. O callback de remocao distingue midia atual de nova selecao; a modal preserva Desfazer fora do campo. Mutations, permissoes, descarte de assets e upload permanecem inalterados. Mesmo impacto frontend-only e rollback, sem novos requisitos externos. Complemento aprovado no check completo e build frontend (.tmp/oct11-comment-edit-check.log e .tmp/oct11-comment-edit-build.log); teste focal de layout 8/8 e tres testes SSR adicionais do componente real. Conferencia visual e interacao autenticada de remover/desfazer/salvar permanecem pendentes: ferramenta CUA nao inicializa (falha de sandbox), inclusive apos reinicio. Nao houve commit, bump, push ou deploy.

## Confirmacao posterior

Usuario confirmou a conferencia local com "Deu certo" apos pedido de verificar campo, modal e remover/desfazer. Essa confirmacao encerra a pendencia visual acima; nenhuma interacao automatizada foi alegada. Sem push/deploy.
