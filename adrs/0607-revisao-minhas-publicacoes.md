# ADR-0607 — Revisao de Minhas publicacoes apos publicacao

Data: 2026-10-11
Status: aceita e validada localmente

## Decisao

TASK-28, capturas do usuario 22:42/22:43. Reutilizar card, destaque e Ver mais respostas existentes, opt-in para Minhas publicacoes; nao alterar Salvos. Controles antes do destaque e menu no eixo da primeira linha da identidade. Remover chip de respondido verificado, mantendo selos da identidade profissional. Mobile-first 390px e desktop. Builder/Quick Copy indisponivel nas ferramentas; referencias locais do inventario e capturas do usuario.

GET do post ganha campo opcional has_psychologist_video_reply, calculado com a mesma condicao de video ativo do bloqueio. Menu de paciente refaz GET antes de abrir confirmacao: bloqueado vai direto ao aviso; falha de leitura nao dispara DELETE. Backend antigo sem campo conserva confirmacao e 409; DELETE continua autoridade transacional para corridas. Psicologo nao recebe bloqueio no proprio post.

## Rollout

Complemento do usuario 22:56: aplicar preflight tambem a comentarios, inclusive na pagina do post/thread. Consultar GET da arvore completa (nao usar apenas filhos paginados), ignorando o video do proprio comentario e verificando todos os descendentes. Reutilizar ReplyOwnerActionMenu nessa superficie para que bloqueio/409 use a mesma modal, nao alerta solto. Edicao contextual e denuncia preservadas. Chip removido apenas em Minhas publicacoes.

Sem schema/migration, package ou env nova. Contrato aditivo; backend antes do frontend recomendado, ausencia de campo tolerada. Somente commits locais; publicacao exige nova autorizacao. Nenhuma mutacao em producao.

## Validacao

PostgreSQL real no banco descartavel isolado: 20 cenarios/21 testes aprovados, incluindo GET do post, subarvore completa e DELETE transacional (texto/imagem, video profissional, video de paciente, descendente indireto, irmao e registro excluido). Fixtures de integracao removidas pelo teardown, sem alterar dados publicados.

Build backend, build frontend, backend check (896 testes) e suite frontend aprovados; formatacao do teste de integracao corrigida antes da repeticao dos checks gerais. pnpm check final aprovado integralmente (frontend/backend/admin/video e guards), log local oct11-revision-check-final.log. Artefato frontend contem a restricao da camada do menu apenas quando authorHeaderExtra existe, preservando Salvos.

Browser local autenticado como paciente: Posts/Comentarios em 390px, menu alinhado com o nome e chip ausente; preflight de post/comentario sem video validado em Minhas publicacoes e no detalhe. Todas as confirmacoes canceladas, sem DELETE no banco do produto. A conta local tem um post e um comentario sem video-respostas; conferencia visual dos cenarios protegidos e Ver mais respostas aguarda conteudo local apropriado, solicitado ao usuario. Nao usar dados inventados para suprir essa evidencia.

Servidor local voltou em next dev, mantendo API isolada em 3001 e sessao autenticada. next start nao foi usado para validar fluxo autenticado: o build sem NEXT_PUBLIC_API_URL publicado nao adota automaticamente localhost (fallback restrito ao desenvolvimento). Nenhuma configuracao de seguranca foi relaxada. Desktop conferido depois da retomada. Sem commit/bump/push/deploy enquanto a evidencia restante esta pendente.

Aprovacao final: usuario confirmou "Conferidos e aprovados" para bloqueio direto com video-resposta e controles/Ver mais respostas, autorizando producao. Esta evidencia substitui as pendencias visuais acima. Checks e builds locais aprovados; preparar commit e PR revisado, sem alteracao de dados publicados.
## Refinamento 12/10

Usuario removeu o aviso azul redundante de conteudo preservado da modal de comentario/resposta bloqueada. Manter somente descricao principal e acoes, com erro de silenciamento apenas se ocorrer falha real. Regra, preflight e endpoint nao mudam. Referencia e captura do usuario; Builder indisponivel. Revisao local separada do release 0.1.639; check/build/browser pendentes.
Validacao tecnica do refinamento: frontend check completo e build aprovados (.tmp/oct12-modal-check.log e oct12-modal-build.log). Teste de regressao garante ausencia do aviso informativo e preservacao da descricao/erro de silenciamento. Browser local iniciado com API isolada, mas automacao da aba falhou por timeout; conferencia visual da modal revisada permanece pendente. Nenhum push/deploy deste refinamento.

12/10: usuario confirmou conferencia local e autorizou producao; depois simplificou o paragrafo de preservacao. Manter regra de dominio intacta, mudando somente a copy para a frase exata solicitada. Pendencia visual anterior da remocao do bloco foi resolvida pela aprovacao do usuario.

Mesmo refinamento de copy aplicado a modal de post, usando a frase exata solicitada pelo usuario. Sem mudanca de elegibilidade de exclusao.
Validacao final das duas revisoes textuais: 32 testes focais aprovados, Biome e build frontend aprovados (.tmp/oct12-modal-final-build.log). Frases exatas solicitadas, sem nova alteracao de layout ou regra. Check completo sera reexecutado pelo hook obrigatorio de push.
