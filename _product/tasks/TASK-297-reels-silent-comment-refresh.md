# TASK-297 - Reels e refinamentos de depoimentos

## Escopo

Remover o aviso de comentario enviado com falha na contagem e o botao
Atualizar contagem abaixo do composer dos reels, conforme captura do usuario.
Referencia: captura enviada em 30/10/2026; PROTO-INVENTORY consultado.
Builder/Quick Copy nao disponivel nesta execucao. Decisao: ADR-0661.

Pedidos adicionais: acoes de editar/excluir resposta na lateral da identidade
profissional; substituir o icone quadrado por balao circular com estrela cheia,
na mesma cor dos demais controles. Reutilizar MessageCircle e Star do Lucide.

Revisar a tipografia contra o feed e a arvore antiga, incluindo menus.
Fale com deve usar semibold. Contadores das abas publicas passam a cinza.
Convite do perfil tem altura visual compacta e area de toque preservada.
Estado vazio usa bloco branco com convite unico, sem duplicar a acao no titulo.

## Aceite

- [x] Nenhum aviso de sucesso/falha da revalidacao de contagem abaixo do campo.
- [x] Manter a chamada de atualizacao em segundo plano apos envio confirmado.
- [x] Falha na revalidacao nao rejeita o envio concluido nem duplica publicacao.
- [x] Erros reais de publicacao/carregamento e rascunho preservados.
- [x] Testes direcionados e navegador local em 320, 390 e 1440 px.
- [x] Acoes da resposta movidas do rodape para a direita da identidade.
- [x] Icone compartilhado usa balao circular e estrela preenchida, sem amarelo.
- [x] Validacao visual do novo icone e das acoes laterais.
- [x] Manrope preservada em nomes, textos, titulo, formulario e menus.
- [x] Fale com e rotulos dos controles usam semibold real no navegador.
- [x] Contadores Publicacoes/Depoimentos em text-muted e bg-surface-muted.
- [x] Convite azul com 32px visuais, alvo de 44px e icone de 15/16px.
- [x] Estado vazio branco com convite, sem duplicar botao ou confundir erro/loading.
- [x] Check completo e build frontend.

## Validacao

Regressao verifica ausencia dos textos e manutencao dos erros reais.
Browser local exercita rejeicao de refresh e renderiza
ContentVideoInlineComposer e ReplyComposer reais com fronteiras de controller
e autenticacao controladas somente no harness de teste. Nao e um teste de
integracao autenticada com API/banco. Nenhuma escrita em producao.
Evidencias: `.tmp/task297-content-videos.log`, `.tmp/task297-composer-browser.log`
e capturas `.tmp/task297-composer-{320,390,1440}.png`.

Auditoria de fonte: body usa Manrope (next/font); nomes e corpo dos depoimentos
ja correspondem a community-post-card/reply-card (text-sm, leading-6 e pesos
da identidade). Meus Depoimentos reutiliza AppPageHeader e o menu de perfil
usa o mesmo item compartilhado dos menus antigos. Nao houve troca de familia.
O reset global font:inherit nos botoes sobrepoe utilitarios no proprio controle;
aplicar tamanho/peso aos spans dos rotulos corrige convite, filtro e submit sem
alterar o reset global ou outras telas. O label do CTA de video agora usa 600.

Browser de componentes com CSS real e Manrope do build local:
`.tmp/task297-profile-browser.log` e screenshots empty/populated em 320/390/1440.
Confirma fonte carregada, pesos, contador #64748b em fundo #f8fafc, botao
32px visuais/44px de alvo e ausencia de overflow. Revisoes e respostas usam
fixtures somente no teste, sem submissao ou consulta a producao.
`.tmp/task297-review-browser.cjs` verifica acoes laterais e icone em cores
herdadas, incluindo botoes e fundo escuro, nos mesmos tres tamanhos.

## Operacao

Frontend apenas; sem contrato, banco, variavel ou pacote novo. Contagem pode
permanecer desatualizada temporariamente se a consulta falhar; mecanismo
existente de revalidacao do viewer permanece intacto. Sem retry de publicacao.
Rollback: retornar frontend anterior. Sem push ou deploy nesta task.

Build inicial interrompido pelo agente para incluir os novos pedidos recebidos
durante a execucao; nao conta como validacao concluida.

Validacao final: frontend check (Biome, ESLint, TypeScript e suites completas)
aprovado em .tmp/task297-frontend-final-check.log; suite de depoimentos 66/66,
sem skips com Playwright habilitado. Build Next webpack e remocao de sourcemaps
aprovados em .tmp/task297-build-final.log. Guardas de raiz aprovadas em
.tmp/task297-root-final-check.log (versao, secrets, encoding, ADRs, tasks, source
safety, env, source size e ciclos). Backend/Admin/Video sem mudanca funcional,
somente versao sincronizada; checks completos desses servicos nao repetidos.
Previa estatica de componentes: .tmp/task297-layout-preview.html.
