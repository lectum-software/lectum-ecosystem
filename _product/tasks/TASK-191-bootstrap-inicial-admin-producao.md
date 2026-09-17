# TASK-191 — Bootstrap seguro do primeiro administrador de produção

| Campo | Valor |
|---|---|
| Status | In Progress |

## Escopo e dependências

Disponibilizar uma operação administrativa explícita, manual e auditável para criar exclusivamente o
primeiro administrador em produção. A operação não pode funcionar em homologação, não pode atualizar
admins existentes, não aceita senha em argumento de shell e não cria endpoint HTTP público.

Depende da TASK-189 concluída. A TASK-190 está bloqueada apenas na comparação sanitizada de recursos;
a conectividade crítica do vídeo produtivo já foi validada e não é alterada por esta task.

## Decisão e impacto de deploy

- A operação é executada dentro do container do backend por operador com acesso administrativo, usando
  senha via stdin e confirmação textual `production`; nenhuma senha é gravada em env permanente,
  arquivo, log ou histórico de shell.
- A execução publicada exige `NODE_ENV=production` e `BASE` canônico da API de produção. Homologação,
  ambientes desconhecidos e URLs similares são recusados.
- A criação ocorre somente quando a tabela de administradores está vazia. Um segundo uso falha fechado;
  recuperação ou administração posterior continuam pelo fluxo autenticado normal.
- Não há migration, endpoint, pacote ou variável nova obrigatória. O rollback é não executar a operação;
  após criação, o fluxo normal de recuperação de senha revoga acesso conforme as regras existentes.

## Critérios de aceite

- [ ] O bootstrap local existente continua bloqueado para banco/ambiente publicado por padrão.
- [ ] A modalidade produtiva exige confirmação explícita, senha por stdin e alvo canônico de produção.
- [ ] Homologação, URL de API divergente, senha por argumento/env e banco com admin existente são recusados.
- [ ] A operação não emite PII, senha, token ou detalhes internos no resultado.
- [ ] Testes de política, check/build do backend, ADR, versionamento, commit e push em `homolog` passam.
- [ ] Após deploy de homolog, a operação é validada apenas em modo de recusa seguro; a criação real em
      produção ocorre somente com nome/e-mail aprovados pelo operador e validação posterior de login.
