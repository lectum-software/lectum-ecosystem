# ADR-0026: InfoSimples para validacao CFP/CRP

## Status

Accepted

## Contexto

A TASK-10 estava bloqueada porque nao havia fonte/API autorizada para consulta automatica CFP/CRP. Em 2026-06-06 foi informado que o ambiente backend recebeu `DOCUMENT_TOKEN`, token da conta InfoSimples para consulta documental/profissional.

Pesquisa publica identificou a consulta InfoSimples `Conselho Federal de Psicologia / Cadastro`, que consulta o cadastro de psicologos no CFP via web service JSON, aceita parametros como `cpf`, `nome`, `registro` e `uf`, e retorna `resultados` com `data_inscricao`, `nome`, `nome_regional`, `registro` e `situacao`. A documentacao completa de chamadas fica em `https://api.infosimples.com/consultas/docs`, mas exige login; por isso o endpoint/metodo/payload exato deve ser confirmado dentro da conta durante a implementacao.

## Decisao

- Usar InfoSimples `cfp-cadastro` como fonte/API autorizada para a TASK-10.
- Ler o token apenas no backend pela variavel `DOCUMENT_TOKEN`; nunca expor no frontend, logs, respostas HTTP ou commits.
- Implementar provider isolado, por exemplo `InfoSimplesCfpProvider`, atras de interface agnostica ao fornecedor.
- Preferir HTTP nativo do backend; nao instalar `infosimples-sdk` nesta decisao. Qualquer SDK futuro exige nova validacao de `PACKAGES.md` e ADR.
- Consultar com minimo necessario: `registro` + `uf` como base, usando `cpf`/`nome` apenas para desambiguacao quando disponivel e justificavel.
- Confirmar apenas resultado inequivoco: registro/UF compativeis, nome compativel quando informado e `situacao` ativa/regular conforme valores reais retornados pelo primeiro teste autenticado.
- Persistir auditoria minima em `professional_registry_check.raw`; nao expor payload bruto ao publico.
- Resultado ausente, ambiguo, divergente, inativo, rate limit, timeout ou erro do provedor nao aprova profissional automaticamente.

## Consequencias

- TASK-10 foi concluida com consulta real integrada via provider InfoSimples; novas falhas de token/acesso devem ser tratadas como bloqueio operacional, sem mock.
- `psychologist_profile.cfp_verified_at` pode ser preenchido somente depois de confirmacao real da InfoSimples.
- TASK-11 continua bloqueada enquanto nao houver bucket/politica R2 privada para documentos CRP; InfoSimples valida cadastro/registro, mas nao substitui o storage privado de arquivo profissional.
- A ordem operacional apos TASK-10 volta para as trilhas independentes; TASK-11/18/19/20 continuam dependendo de R2 privado ou de nova ADR que altere o escopo documental.

## Fontes

- https://infosimples.com/consultas/cfp-cadastro/
- https://infosimples.com/
- https://github.com/infosimples/infosimples
- https://npm.io/package/infosimples-sdk

## Validacao

- Pesquisa web da documentacao publica InfoSimples.
- Verificacao local apenas de nomes de variaveis presentes no `backend/.env`, sem expor valores.
- Atualizacao documental de TASK-10, TASK-11, README de tasks, DATA-MODEL, PACKAGES, ARCHITECTURE, decisions e ADRs relacionados.

## Execucao TASK-10 em 2026-06-06

- Endpoint autenticado confirmado sem expor o token: `POST https://api.infosimples.com/api/v2/consultas/cfp/cadastro`.
- A autenticacao com `DOCUMENT_TOKEN` retornou `code=606` quando nenhum parametro foi enviado, confirmando que o servico `cfp/cadastro` existe e exige ao menos `cpf`, `nome`, `registro` ou `cnpj`.
- Implementacao realizada sem SDK novo: HTTP nativo no backend, provider isolado e token apenas server-side.
- Foi criada a tabela `professional_registry_checks` para auditoria minima da consulta e confirmacao de resultado.
- Resultados inativos, ausentes, ambiguos ou erro/rate limit do provedor nao aprovam automaticamente.

## Correcao de vazio TASK-10 em 2026-06-06

- Em consulta autenticada com CPF sem registro no CFP, a InfoSimples retornou HTTP 200 com `code=612`, `data=[]` e erro textual de nenhum dado encontrado.
- O backend passa a tratar `code=612` como resultado vazio auditavel, persistindo `professional_registry_check.found=false` e respondendo sucesso funcional `cfp_search_empty` para a UI exibir o estado "Nao encontrado".
- `code=612` nao aprova profissional e nao e tratado como indisponibilidade do provedor; erros de configuracao, validacao, rate limit e demais codigos continuam falhando de forma honesta.

## Correcao operacional em 2026-07-04

- Em verificacao segura sem expor `DOCUMENT_TOKEN`, a InfoSimples retornou `code=603`, indicando token sem autorizacao de acesso ao servico `cfp/cadastro` ou limite de uso configurado.
- O backend passa a classificar `code=603` como erro de configuracao/acesso do provedor, nao como rate limit temporario, porque a acao correta e ajustar autorizacao/limite/saldo no painel/contrato InfoSimples.
- A tela continua sem fallback mockado: quando a conta/token nao tiver acesso ao produto CFP, a consulta deve falhar de forma honesta e nao preencher `cfp_verified_at`.

## Correcao de timeout e indisponibilidade da origem em 2026-07-04

- Em verificacao real sem expor `DOCUMENT_TOKEN`, a consulta `cfp/cadastro` por CPF ultrapassou o timeout local anterior de 20s e foi abortada pelo backend antes da InfoSimples concluir a tentativa.
- Com janela maior, a InfoSimples respondeu apos aproximadamente 51s com `code=609` e mensagem de tentativas excedidas na origem, indicando indisponibilidade/intermitencia da fonte CFP e nao problema de saldo do cliente.
- O backend passa a usar timeout operacional maior e configuravel por `DOCUMENT_REQUEST_TIMEOUT_MS` (padrao 90s, com limites internos), para nao abortar consultas CFP validas que demorem mais que 20s.
- `code=609` passa a ser tratado como indisponibilidade temporaria do provedor/origem, nao como rate limit/saldo. A resposta continua retentavel e nao aprova automaticamente o profissional.
- Logs operacionais do provider registram apenas motivo, status e tempos, sem `DOCUMENT_TOKEN`, CPF, payload bruto ou dados profissionais.

## Observabilidade sanitizada em 2026-07-04

- Para diagnosticar falhas externas sem expor dados sensiveis, o fluxo CFP passa a emitir eventos estruturados com `traceId`, classificacao, tempos, status HTTP, codigo/mensagem do provedor, contagem de resultados e formato resumido do payload.
- Os logs nao incluem `DOCUMENT_TOKEN`, CPF completo, payload bruto, nome retornado ou dados profissionais; registram somente presenca/tamanho dos campos de busca.
- Os logs podem ser desativados por `CFP_PROVIDER_LOGS=false` quando a operacao estiver estabilizada.

## Orientacao ao psicologo em instabilidade CFP em 2026-07-04

- Quando a consulta automatica falhar por indisponibilidade da origem CFP/InfoSimples, a UI deve explicar que o cadastro do Conselho Federal de Psicologia esta instavel no momento.
- O psicologo deve receber um caminho claro para falar com o suporte da Lectum e solicitar aprovacao manual, sem aprovacao automatica, mock ou preenchimento de `cfp_verified_at`.
- A mensagem de erro backend de `cfp_provider_unavailable` passa a refletir essa orientacao operacional.
- A pagina CFP tambem exibe no rodape o CTA "Problemas? Fale com o suporte" apontando para o WhatsApp operacional `wa.me/5537998739534`.
