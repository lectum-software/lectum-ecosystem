# TASK-268 - Origens dos analytics e navegacao de notificacoes

Status: Done
Dependencia: TASK-267

## Escopo

- Push de novo favorito abre Notificacoes; aviso interno abre Meus Analytics (decisao aprovada pelo usuario).
- Voltar em Analytics retorna a pagina anterior, com fallback seguro para perfil em entrada direta.
- Capitalizar Mentor nas identificacoes de ranking em publicacoes.
- Auditar captura, persistencia e agregacao de favoritos, acessos ao perfil, video e WhatsApp.
- Origem e a superficie da acao, nao a pagina visitada anteriormente. Dados sem evidencia ficam desconhecidos.
- Corrigir reativacao de favorito sem reatribuir repeticoes idempotentes nem inventar historico.

## Referencias

AGENTS.md, ARCHITECTURE.md, PROTO-INVENTORY.md (Meus Analytics e Notificacoes), ADR-0631.
Manter componentes existentes e verificar em 390px e desktop. Builder indisponivel; usar prototipos locais.

## Aceite

- [x] Rotas de push e notificacao interna testadas, incluindo avisos antigos.
- [x] Voltar e Mentor corrigidos e verificados localmente.
- [x] Matriz de origens auditada, com testes de caminhos, consultas e reativacao.
- [x] Integracao local real e checks/builds aprovados, sem dados permanentes de teste.
- [x] Limitacoes historicas registradas; nenhuma alteracao em producao.

## Auditoria de origem

| Indicador | Evidencia e correcao |
| --- | --- |
| Favoritos | Origem capturada ao clicar e persistida no vinculo. Reativar redefine data/origem; repetir favorito ativo e idempotente. Totais e detalhamentos usam os mesmos registros ativos, nao eventos opcionais de video nem subtracao. |
| Acesso ao perfil | Origem e a navegacao anterior do documento atual ou referrer interno real. Nao reutilizar historico de outra carga da pagina para atribuir acesso direto ao video. Resumo e timeline usam profile_view_event. |
| WhatsApp | A superficie real do clique prevalece sobre contexto herdado ou link sintetico de post. Conteudo exibido dentro do perfil/favoritos nao entra como origem comunidade. Ranking nao e inferido de querystring. |
| Video | Sessao isolada por superficie e contexto; perfil nao reutiliza chave do diretorio. Flush tardio do perfil conserva sua origem. Contadores de favoritos/acessos do video derivam dos eventos canonicos correspondentes. |
| Busca | Preservar filtros permitidos no path; remover metadados arbitrarios. Manter a regra existente: Minha Busca depende de filtros selecionados, sem redefinir busca textual como filtro. |
| Sem origem | Exibir desconhecido quando nao ha evidencia. Nao reescrever historico de producao nem inferir o local a partir do destino da navegacao. |

## Evidencias locais

- Integracao real em PostgreSQL local: favoritos das cinco origens, reativacao/idempotencia, telemetria opcional divergente, acessos, WhatsApp de conteudo no perfil, querystring de ranking e notificacoes antigas.
- Browser com duas contas temporarias reais e assinatura administrativa local: 390px e 1440px, favoritar no perfil, conferir requisicao e banco, abrir notificacao, Analytics e voltar a Notificacoes. Sem overflow horizontal; capturas revisadas.
- Contas e registros de QA removidos no finally; nenhum envio externo, mock de API ou fixture permanente.
- Backend: 953 testes aprovados na reexecucao completa. Primeiro check teve timeout isolado de inicializacao no teste optional-auth-failure; repeticao isolada e suite completa aprovadas.
- Frontend: check completo aprovado, incluindo testes de atribuicao e navegacao.
- Check completo da raiz aprovado em 0.1.705; builds frontend e backend aprovados. Video manteve 13 skips de render real por FFmpeg ausente; Admin manteve um skip de symlink por permissao Windows. Nenhuma mudanca funcional nesses apps.
- Clique real de WhatsApp no perfil confirmado em requisicao e banco nas duas larguras; navegacao externa bloqueada no teste. Desktop usou reduced motion para estabilizar o CTA animado existente.
- Limite transitorio de conexoes locais interrompeu uma repeticao de QA; limpeza dos dois usuarios temporarios concluida por IDs exatos e repeticao posterior aprovada. Nada permanente foi deixado no banco.
- Versao sincronizada 0.1.705. Sem push, merge ou deploy.

## Limites

Favoritos continuam sendo vinculos ativos, nao um historico imutavel de todos os cliques. A janela anti-spam de acessos e as regras de pessoas unicas foram preservadas. Registros antigos ja classificados incorretamente podem nao permitir recuperacao da origem real. Push validado no roteamento; nenhum push foi enviado a dispositivo real nesta task.
