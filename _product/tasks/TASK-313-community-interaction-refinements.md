# TASK-313 - Ajustes de contato, notificacoes e publicacao

## Escopo

Oito ajustes solicitados em 04/11/2026. Base isolada na versao 0.1.775 da
branch homolog. SendNF e upgrade foram consolidados da copia anterior,
preservada sem alteracoes. SEO de outro chat permanece excluido. Sem push ou deploy.

## Implementacao

- [x] Contato exige resposta valida da API; recusas nao abrem o WhatsApp antigo.
- [x] Aviso do selo aparece depois de todas as notificacoes, respeitando paginacao.
- [x] Abertura inicia play no gesto do usuario, com tentativa muda se bloqueado.
- [x] Player ocupa a altura disponivel; ajuste cover mobile e contain desktop.
- [x] Menus do autor no feed/comunidade/perfil; ocultar resposta dentro do menu.
- [x] Animacao apos tres segundos de visibilidade do botao, nao do playback.
- [x] Confirmacao explicita de seguir antes de publicar/responder como psicologo.
- [x] Servidor verifica associacao de posts e respostas profissionais; pacientes preservados.
- [x] Rotulos Avaliacoes apenas na interface, preservando contratos e rotas.

## Validacao

- [x] Testes focados de visibilidade e confirmacao: seguir, cancelar e falha.
- [x] Frontend: lint, typecheck e suites do check aprovados, com reexecucao das suites de copy corrigidas.
- [x] Builds de Frontend e Backend aprovados.
- [x] Backend: Biome, runtime dependencies, typecheck e testes de bloqueio de publicacao aprovados.
- [x] Check integral da raiz aprovado em 04/11: Frontend, Backend, Admin e Video.
- [x] QA visual das notificacoes em 390x844 e 1440x900: play no clique, fim fecha, leitura persiste, sem overflow.
- [x] Animacao do CTA no Chrome em 320/390/1440px, sem deslocamento; 11 testes aprovados.
- [ ] Fluxo autenticado completo com upload e banco local.
- [ ] Reproducao em Android real no navegador do Instagram.
- [x] Consolidacao com o lote de SendNF/upgrade antes da publicacao autorizada.
- [x] Migration SendNF aplicada em banco PostgreSQL local exclusivo deste lote.
- [x] Ledger real local: unicidade, snapshots, leases, recuperacao e acesso por titular.
- [x] Integracao PostgreSQL de publicacao: nao membro recusado, membro publica,
  vinculo removido recusa novamente; endereco fiscal salvo e excluido reconhecidos.
- [x] Dezessete testes focais de nota fiscal, upgrade, confirmacao e aviso do selo.

Sem banco remoto, emissao fiscal, alteracao de autodeploy ou credenciais.
Builder indisponivel: componentes existentes sao a referencia visual.
Runtime de release Node 24.22.2 isolado, verificado contra checksum oficial.
Backend consolidado: 1174 testes aprovados, zero falhas e um skip.
SENDNF_CHECK_MODE documentado como diagnostico opcional somente leitura.
Build final do frontend 0.1.776 aprovado. QA da versao compilada em 390 e
1440px: reproducao automatica, fechamento no fim e ausencia de overflow.
Produção consultada em 04/11: Backend/Frontend 0.1.775, health ok e ready ready.
Nenhum POST fiscal, cobranca real ou consulta a dados de clientes nesta validacao.

SendNF: codigo permanece desligado por padrao. Autorizacao fiscal, PDF e email
reais dependem do novo pagamento piloto apos rollout. A nota manual e pagamento
cancelado anteriores nao serao vinculados nem reemitidos. Configurar segredo
somente no Backend e manter auto=false ate validar o piloto autorizado.

Previa de frontend: http://127.0.0.1:3112/app/notificacoes.
Rollout fiscal desativado por padrao; piloto real e QA Android/Instagram
permanecem pendentes e nao sao representados pelos testes locais.
Parametros legados de URL (tab=depoimentos) preservados e cobertos por teste.

## Correcao local apos release 0.1.776

- [x] Restaurar reconhecimento de cortesia administrativa ativa no acesso normal,
  login, retorno de WhatsApp, conclusao de assinatura e tela CFP.
- [x] Preservar consulta obrigatoria em assinatura comum ainda nao verificada.
- [x] Remover limites de oito/quatro tentativas no historico do Admin.
- [x] Exibir ativacao por cortesia mesmo com tentativas automaticas posteriores.
- [x] Testes focados: 19 de frontend e 12 de resumo/historico aprovados.
- [x] Aprovacao permanente de novas cortesias com auditoria na mesma transacao.
- [x] Migration de cortesias legadas aplicada apenas em banco local isolado.
- [x] Integracao PostgreSQL real: vencimento sem beneficios, idempotencia,
  falhas de API sem invalidacao e reprovacao manual preservada.
- [x] Frontend atualizado: 21 testes focais aprovados.
- [x] Builds de Backend, Frontend e Admin desta correcao aprovados.
- [ ] Validacao visual autenticada desta correcao.
- [ ] Publicacao desta correcao em producao.

Sem consulta paga, alteracao de cadastro de cliente remoto ou emissao fiscal.
SEO e demais alteracoes de outros chats permanecem fora do escopo.

Check integral aprovado antes da extensao de permanencia da cortesia. Apos a
extensao: backend com 1176 testes aprovados, um skip; 15 testes focais finais
de verificacao e plano, mais 21 testes focais de frontend aprovados.
Teste integrado executou a migration de forma idempotente e confirmou que o
repositorio retorna a aprovacao manual mesmo apos doze falhas automaticas.
Nenhum commit, push, merge ou deploy desta correcao foi realizado nesta etapa.

## Promocao solicitada

Usuario autorizou producao e reconfirmou autodeploys/previews bloqueados.
Versao preparada: 0.1.777, sem SEO e sem mudancas funcionais no Video.
Revisao da migration local autorizada; novo banco isolado criado sem apagar o
anterior. Historico completo de migrations e teste de concorrencia aprovados.
Navegador indisponivel em duas tentativas: conferencia visual autenticada segue
pendente e nao e substituida por afirmacao de QA concluido.
Produção antes da publicacao: Backend/Frontend 0.1.776, Admin 0.1.740,
health ok e ready ready. Ordem: Backend/migration, Frontend, Admin.
