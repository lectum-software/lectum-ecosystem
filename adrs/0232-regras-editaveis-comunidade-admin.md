# ADR-0232: Regras editaveis e identidade visual de comunidades no Admin

## Status

Accepted

## Contexto

A TASK-52 implementa o detalhe administrativo de uma comunidade com base em `_product/proto/admin/Comunidades/Comunidades - Detalhes.png`. O produto definiu que, nesta V1, o Admin pode editar somente nome, avatar, descricao, cor/identidade visual e regras da comunidade. Configuracoes avancadas, moderacao e acoes em massa continuam fora do escopo.

O Builder/Quick Copy ativo `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a` nao estava disponivel como ferramenta MCP nesta execucao; a imagem local exportada foi usada como referencia visual auditavel.

## Decisao

- Criar o modelo persistido `community_rule`, relacionado a `community`, com `title`, `description`, `position`, `active`, soft delete e indices por comunidade/posicao.
- Executar backfill por migration para criar as cinco regras canonicas existentes para todas as comunidades atuais:
  - respeito e empatia;
  - sem dados pessoais;
  - proibido conteudo nocivo;
  - psicologos nao fazem atendimento;
  - para atendimento, use o WhatsApp.
- Expor endpoints admin privados para:
  - detalhe de comunidade;
  - edicao de nome, descricao e cores;
  - upload real de avatar;
  - criar, editar, ordenar, ativar/desativar e remover regras por soft delete.
- Reutilizar o upload publico existente do backend via multer/R2, adicionando o prefixo `community/avatar/` aos arquivos servidos por `/public/files`.
- Manter a URL/path do avatar controlada pelo backend: o `PUT` administrativo de comunidade nao aceita avatar arbitrario; avatar e atualizado apenas pelo endpoint multipart real.
- Atualizar o detalhe de comunidade do produto para consumir regras persistidas retornadas pelo backend, removendo regras hardcoded como fonte ativa.
- Nao criar auditoria falsa: como ainda nao existe modelo padrao de auditoria administrativa para essas alteracoes, a decisao fica registrada neste ADR para uma evolucao futura.
- Nao apagar avatar antigo automaticamente nesta V1: nao ha utilitario seguro de cleanup de objeto remoto associado ao storage atual; qualquer limpeza deve ser implementada em task propria para evitar apagar arquivos compartilhados ou paths nao gerenciados.

## Consequencias

- As regras exibidas para usuarios passam a ser dados reais por comunidade e editaveis pelo Admin.
- Comunidades existentes recebem regras padrao via migration, sem seed manual e sem mock.
- O Admin entrega edicao operacional de identidade da comunidade sem antecipar status, visibilidade, bloqueios de postagem/comentario ou moderacao.
- Upload de avatar depende das envs/storage reais ja existentes. Sem storage configurado, a task deve bloquear em vez de simular URL.
- Pode haver objetos antigos/orfaos no storage apos trocas de avatar ate existir rotina segura de cleanup.
- Auditoria administrativa granular permanece pendente de modelagem dedicada.

## Validacao

- `pnpm --dir backend db:migrate`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Smoke API com admin real transitorio:
  - login admin;
  - `GET /api/admin/private/communities/:id`;
  - `PUT /api/admin/private/communities/:id`;
  - `POST /api/admin/private/communities/:id/avatar`;
  - CRUD/ordenacao/ativacao de regras;
  - conferencia de regras no detalhe publico/privado da comunidade;
  - limpeza do admin/token transitorio e restauracao dos dados alterados para validacao.
- Browser local com admin real:
  - abertura da rota `/comunidades/ansiedade-em-equilibrio`;
  - validacao mobile (~390px), tablet (768px) e desktop;
  - conferencia de formulario, regras e cards com dados reais.

## Task relacionada

- TASK-52
