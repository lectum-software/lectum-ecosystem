# ADR-0718 - Clarity com liberacao explicita

Status: proposto, 2026-11-23. TASK-354.

Release autorizado em 2026-11-24: habilitar no build produtivo, mantendo gates
de consentimento, URL/origem, identidade pronta e Navigation API. Flags locais
nao liberam captura de localhost em producao. Kill switch opcional
NEXT_PUBLIC_EXPERIENCE_ENABLED=false requer rebuild. CSP abre apenas os dois
hosts testados para script/collect. Textos de preferencias descrevem replay,
mascaramento, titulos/URLs publicos e revogacao, sem listar cada fornecedor.
As referencias abaixo a dev-only descrevem etapas anteriores; nao remover
as restricoes de captura nem reinterpretar aceites existentes.

Atualizacao 2026-11-24: teste local com leitura anonima do post publico indicado
pelo usuario e API 0.1.854 confirmou reproducao e avancar reels. Captura precisa
tambem de currententrychange: o player preserva o estado interno do Next ao
trocar a URL, podendo nao atualizar o hook search. Retomar no frame seguinte
apenas entre reels publicos da mesma origem/path, revalidando consentimento;
cancelar em nova navegacao e desmontagem. Demais transicoes seguem commit React.
Teste real confirmou captura retomada e mascaramento, com todos os envios
interceptados. Sem escrita remota, sem release, sem ingestao na Microsoft.
As limitacoes de backend real descritas abaixo sao historicas para esse fluxo;
login real, BFCache e outros navegadores continuam sem validacao integrada.

Retomada implementada localmente: pausar em pre-navegacao e revalidar apos commit
React de pathname/search. Reutilizar SDK e manter pause durante transicao.
CSP abre somente script e collect exatos em development com flag de previa.
Chrome no app real confirmou navegacao History API, voltar e revogacao, com
uploads abortados. Nao valida backend real, login, BFCache ou coleta em producao.
Esta decisao substitui a parada definitiva descrita nas notas historicas.

Atualizacao de escopo: usuario determinou incluir perfis, posts e reels publicos.
Politica local ampliada para feed, comunidades, perfis e publicacoes/respostas,
com allowlist contextual de parametros de navegacao. Buscas livres, tokens e
areas privadas permanecem excluidos. Titulos e URLs publicos podem ser capturados;
mascaramento e consentimento continuam obrigatorios. Sem ativacao em producao.
Esta decisao substitui o escopo de duas listagens descrito abaixo.

Decisao atual: por orientacao do usuario, suporte externo nao e pre-requisito
do escopo inicial. Liberar para validacao local somente /psicologos e /comunidades
sem query/hash, com consentimento e referrer vazio ou da mesma origem/listagens.
Restringir origens ao site; localhost apenas por opcao explicita de desenvolvimento.
Detalhes e areas privadas seguem bloqueados. Manter feature desabilitada em build
de producao. Titulos e destinos de links nao sao garantidamente mascarados;
nao alegar anonimato nem alterar SEO. Validacao integrada ainda pendente.
As referencias abaixo a nenhuma rota aprovada descrevem a fase inicial.

Atualizacao: acesso ao tag restabelecido apos desativacao do AdGuard pelo usuario.
Scripts reais 0.8.80-beta passaram no teste isolado com uploads interceptados.
A disponibilidade externa deixou de bloquear; integracao real e metadados seguem pendentes.

Implementacao local posterior: carregar somente a biblioteca fixada 0.8.80-beta,
sem tag autoexecutavel, e chamar start depois de revalidar escopo e consentimento.
Track false e lista de cookies vazia; nenhum cookie-sync. A coleta fica encerrada
apos qualquer pre-navegacao, sem retomada automatica; browsers sem Navigation API
nao coletam. Isso e deliberadamente conservador enquanto nenhuma rota esta aprovada.
SDK real validado com dados ficticios e transportes abortados. Nao e validacao
de ingestao remota, nem autoriza ativacao de todas as telas.

## Contexto

Usuario autorizou integracao local antes de producao. A auditoria mostra que
mascaramento de texto nao cobre todos os metadados. O script hospedado nao esta
acessivel por DNS nesta maquina. Preferencias existentes tratam campanhas Meta.

## Decisao

Adicionar escolha independente para analise de experiencia, por conta/navegador,
sem transferencia automatica do visitante para conta e sem uso de identidade no
coletor. Armazenamento invalido ou indisponivel nao concede permissao.
Mostrar a categoria somente em desenvolvimento mediante flag opcional. Nao
reinterpretar aceites anteriores nem o banner atual como autorizacao de experiencia.

Nenhuma rota esta aprovada inicialmente. Nao alterar URLs/SEO para ocultar dados
do coletor. Nao adicionar SDK ou abrir CSP antes de validar o script real e os
caminhos de revogacao/navegacao. Uma negacao de cookies nao equivale a zero coleta.

## Consequencias

A implementacao e parcial, nao pronta para producao. Consentimento local nao
constitui liberacao do site inteiro. Ainda faltam loader, auditoria por rota,
validacao visual, documento de privacidade e teste com o projeto hospedado.
Nenhuma dependencia nova ou mudanca em backend/admin/video.
