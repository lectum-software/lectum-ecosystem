# ADR-0631 - Origem da acao e destinos de notificacoes

Status: Accepted
Data: 2026-10-23

## Decisao

Novo favorito: push abre /app/notificacoes e notificacao interna abre /app/profissional/estatisticas. Compatibilizar notificacoes existentes na leitura, sem reescrever banco produtivo.

Analytics atribuem uma acao a sua superficie real. Uma entrada no perfil pelo ranking nao transforma um clique no WhatsApp dentro do perfil em clique no ranking. Parametros de URL nao podem se passar pelo pathname.

Favoritos sao apurados a partir dos registros ativos e sua origin_path, nunca pela subtracao de eventos opcionais de telemetria. Reativacao inicia uma nova data e origem para o vinculo ativo; chamadas repetidas quando ja ativo preservam ambos. Nao reconstruir origens antigas sem evidencia.

O botao de voltar de Analytics reutiliza a navegacao segura existente e retorna ao perfil apenas quando nao ha historico interno utilizavel.

Sessoes de video sao segregadas por perfil/diretorio/contexto de origem. Atribuicao de acesso ao perfil usa navegacao do documento atual, nao trilha persistida de sessoes anteriores. Preservar a semantica existente de Minha Busca por filtros selecionados.

Os detalhamentos de comunidade excluem cliques feitos em conteudo renderizado dentro do perfil/favoritos, de acordo com a mesma classificacao da timeline. Identidade do conteudo e superficie do clique sao dimensoes distintas.

## Consequencias

Sem promessa de telemetria infalivel: bloqueios de rede, consentimento e registros antigos podem impedir identificacao. Nesses casos preservar desconhecido, sem atribuir uma origem ficticia. Validar frontend e backend localmente antes de promover; sem push/deploy nesta task.

## Validacao

TASK-268 concluida localmente: check completo da raiz, builds frontend/backend, integracao PostgreSQL real com limpeza dos registros e browser em 390px/1440px. Push testado pelo destino por canal, sem disparo externo. Limites historicos e skips ambientais registrados na task.
