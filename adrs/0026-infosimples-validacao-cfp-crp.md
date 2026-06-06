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

- TASK-10 muda de `Blocked` para `Pending` e pode ser executada com consulta real.
- `psychologist_profile.cfp_verified_at` pode ser preenchido somente depois de confirmacao real da InfoSimples.
- TASK-11 continua bloqueada enquanto nao houver bucket/politica R2 privada para documentos CRP; InfoSimples valida cadastro/registro, mas nao substitui o storage privado de arquivo profissional.
- A ordem operacional das tasks deve executar TASK-10 antes das trilhas independentes, e voltar para TASK-11/18/19/20 apenas quando o bloqueio de R2 privado for resolvido ou houver nova ADR mudando o escopo documental.

## Fontes

- https://infosimples.com/consultas/cfp-cadastro/
- https://infosimples.com/
- https://github.com/infosimples/infosimples
- https://npm.io/package/infosimples-sdk

## Validacao

- Pesquisa web da documentacao publica InfoSimples.
- Verificacao local apenas de nomes de variaveis presentes no `backend/.env`, sem expor valores.
- Atualizacao documental de TASK-10, TASK-11, README de tasks, DATA-MODEL, PACKAGES, ARCHITECTURE, decisions e ADRs relacionados.
