# ADR-0547 - Criacao de post sobre a aba atual

Data: 2026-10-01. Status: Aceito. TASK-202.

## Contexto

O + central foi disponibilizado em toda a navegacao mobile na TASK-201.
Feed e comunidade interceptam a acao para abrir seu formulario em modal, mas
outras abas seguiam o Link para a rota que renderiza o feed como fundo.
O usuario solicita preservar a aba atual ao abrir e fechar o editor.

## Decisao

PrivateTemplate intercepta a acao padrao tambem quando autenticado e monta
CreateCommunityPostLogic com asModalSlot e onCloseComplete. O callback apenas
fecha a modal local, sem navegacao nem alteracao da URL. Handlers explicitos
do feed e da comunidade continuam prioritarios. Visitantes preservam o convite
de conversao existente e o destino protegido de criar post.

Perfil/Favoritos/Notificacoes suprimiam todos os convites, inclusive o clique
explicito novo no +. Permitir somente trigger_comentar com intent create_post
nessas rotas; dicas passivas e demais gatilhos continuam suprimidos. O guard de
sessao autenticada permanece anterior a essa excecao.

Usar next/dynamic no client component para carregar a implementacao existente
sob demanda. Nao criar provider global, rota interceptada global ou nova modal.
Validacao, confirmacao de descarte, scroll lock, suspensao de midia e destino
apos publicar continuam sob responsabilidade do editor atual.

## Consequencias

A aba e a posicao de rolagem permanecem montadas sob a modal. Nao ha novo
contrato de API, dependencia, env ou migration. O fallback href continua valido
para autenticacao e acesso direto. Teste de contrato deve impedir regressao
em preventDefault, abertura local e callback de fechamento; smoke visual deve
distinguir teste anonimo de teste autenticado real, sem falsear sessao.

Rollout primeiro em homolog. Rollback por reversao revisada, sem operacao de
dados. Nenhuma promocao para main sem pedido explicito.

