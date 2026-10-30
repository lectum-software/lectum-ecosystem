# TASK-295 - Experiencia de depoimentos

Status: implementacao e validacao local concluidas em 0.1.755. Sem push/deploy.

## Escopo

Pedidos e capturas de 30/10/2026, incluindo SVG reviews fornecido pelo usuario.
PROTO-INVENTORY consultado; Builder indisponivel. Mobile-first 320/390px ate
desktop. Preservar anonimato, elegibilidade, regras de midia e rascunhos.

## Aceite

- [x] Icone reviews compartilhado no diretorio, convite e menus de depoimentos.
- [x] Convite inline a direita das acoes, somente autor do post em resposta direta.
- [x] Identidade profissional completa nas folhas de lista e escrita.
- [x] Lista e composer nao empilham modais; rascunho protegido e retorno acessivel.
- [x] CTA outline transparente discreto no perfil e na folha de depoimentos.
- [x] Depoimentos/respostas como comentarios nas listas publicas e privadas.
- [x] Descricao contextual sem alegar verificacao inexistente de identidade.
- [x] Meus Depoimentos capitalizado para paciente e profissional.
- [x] Totais reais Visiveis/Ocultos/Todos, consistentes apos mutacoes e paginacao.
- [x] Arrastar folhas de comentarios/reviews para baixo fecha, sem conflitar com scroll.
- [x] Contador do video e titulo da folha somam todos os descendentes da discussao,
      sem incluir comentarios de outros videos nem confundir paginacao de filhos diretos.
- [x] Publicacoes de resposta no perfil mostram o comentario pai como contexto
      quando aninhadas; respostas diretas mantem o post original.
- [x] Checks, builds e QA real local aprovados; fixtures temporarios limpos.
- [x] Profissional pode ocultar/reexibir sua resposta no perfil publico, preservando
      discussao original e lista privada; indicador EyeOff antes do menu quando oculta.
- [x] Commit local versionado, sem push/deploy.

## Riscos e rollout

Mudancas de UI e DTOs aditivos. Migration expansiva adiciona hidden_from_profile
com default false. O banco local anterior tem uma migration de faturamento de
outro trabalho; foi preservado sem reset. Validacao isolada em
lectum_task295_visibility_dev_20261030: 110 migrations aplicadas com db:migrate,
schema sincronizado e integracao real de ocultar/reexibir aprovada.
Nao publicar nesta task. Se o DTO mudar, backend antes do frontend em futura
publicacao autorizada, com fallback para API anterior. Rollback por artefato.
Nao revelar identidade privada para compor avatares/nome completo de pacientes.

## Validacao

- Frontend: gate completo final aprovado, incluindo os ajustes de contadores,
  contexto e visibilidade; build local 0.1.755 aprovado com paridade de fontes.
- Backend: check final com 1136 testes aprovados, zero ignorados; build aprovado.
- Visibilidade: 36 testes frontend (11 novos), typecheck restrito, lint e Biome;
  11 testes backend e integracao com PostgreSQL isolado aprovados.
- QA real isolado: Meus Depoimentos de paciente/profissional aprovados em
  320/390/1440px, incluindo totais 21/2/23, paginacao e ocultar/reexibir.
- Contexto de comentario pai e contadores de reels aprovados em 320/390/1440px;
  criacao/exclusao aninhada atualiza o total sem incluir outra arvore de video.
- Infraestrutura de QA usa build separado do navegador e proxy HTTPS local
  com a mesma origem para app/API, preservando autenticacao real por cookie.
  Nenhuma politica de seguranca do produto foi alterada para viabilizar o teste.
- A verificacao de navegador encontrou retorno de foco ausente no fechamento
  da folha e convite ausente no card especifico do feed. Ambos corrigidos e
  conferidos no artefato final: folhas publicas 3/3; convite do autor anonimo
  aprovado em 320/390/1440px. Regressao Chrome de foco 7/7, zero ignorados.
- Build final 0.1.755 aprovado em 30/10/2026 20:15 UTC, sem divergencia nos
  2332 arquivos de fontes/testes e copia de compilacao. Protecoes de disco mantidas.
- Matriz final de permissao do convite 21/21; ocultar/reexibir resposta 3/3
  com recarga, contador publico, discussao preservada e EyeOff antes do menu.
  A janela real de rate limit foi respeitada, sem aumentar/desativar limites.
- QA funcional 40/40: envio real do formulario fez um POST e um registro,
  atualizando totais de 21/2/23 para 22/2/24. O ultimo refinamento visual
  mantem somente o icone inline abaixo de 640px; nome acessivel e tooltip
  permanecem, assim como o texto no desktop e o CTA outline nas folhas.
- Check completo frontend repetido com sucesso nas fontes finais funcionais.
  Essa rodada nao iniciou navegadores; regressao Chrome 7/7 e QA real foram
  executados separadamente. O ajuste CSS subsequente tem regressao focada.
- Conferencia visual final adicional em 320/390/1440px aprovada: sem sobreposicao,
  foco correto, icone no mobile e rotulo no desktop. Alvo mobile medido em 44x45px;
  minimos em pixels preservam acessibilidade independentemente da fonte raiz.
- Fixtures do banco local original removidos pelo inventario aprovado: nenhum
  residuo entre os IDs exatos verificados; dados externos ao escopo preservados.
- Fixtures isolados tambem removidos por inventario aprovado: zero residuos nos
  IDs exatos de 29 tabelas. Historicos limitados aos fixtures, triggers ativos.
  Runtimes e watchdog proprios encerrados; servicos preexistentes preservados.
- Raiz: ADRs, tasks, encoding, secrets, source-size e source-safety aprovados.
- Revisao de codigo sem bloqueadores. Commit local em homolog, sem push/deploy.

## Observacao fora do escopo

O QA registrou dois HTTP 500 em telemetria video-watch. Os logs fornecem apenas
UnknownError; nao foi possivel confirmar a causa nem atribui-la a stress ou a
uma condicao anterior. O codigo de tracking nao foi alterado nesta task e nao
ha regressao TASK-295 demonstrada. Os 40 cenarios funcionais passaram, mas esta
ocorrencia deve ser investigada separadamente antes de afirmar saude completa
da telemetria. Nao foi feita alteracao de analytics para mascarar o resultado.
