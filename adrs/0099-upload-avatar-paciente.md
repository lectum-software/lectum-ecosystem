# ADR-0099: Upload real de avatar do paciente

## Status

Aceito - 2026-06-15

## Task relacionada

TASK-21

## Contexto

A tela `/app/profile/edit` do paciente exibia uma acao visual de camera, mas nao havia input de arquivo nem endpoint especifico para persistir `user.avatar` de pacientes. A TASK-21 ja definia que avatar do paciente usa storage real em Cloudflare R2 quando disponivel, sem mocks, e que a store/sessao deve ser atualizada quando nome ou avatar mudarem.

## Decisao

- Reutilizar a fundacao existente de upload R2 (`backend/src/config/multer`) no endpoint privado `POST /api/private/patient/profile/avatar`, com `requireRole("paciente")` aplicado pelo mount atual.
- Persistir a URL publica do avatar em `user.avatar`, igual ao fluxo profissional, usando o prefixo de objeto `patient/avatar/*`.
- Expor `patient/avatar/*` em `/public/files/*` para que o `next/image` consiga renderizar a imagem salva sem depender de headers de autenticacao em requests de imagem.
- Adicionar `DELETE /api/private/patient/profile/avatar` para remover o avatar e limpar somente objetos anteriores gerados pelo proprio fluxo `patient/avatar/*`.
- Atualizar o React Query caller e a Redux store do usuario apos upload/remocao, mantendo o perfil do paciente sincronizado sem criar estado paralelo.

## Consequencias

- O upload deixa de ser um controle visual inerte e passa a persistir em storage real.
- Avatares enviados pelo paciente podem ser reutilizados em areas autenticadas que exibem autor identificado.
- A limpeza assíncrona do arquivo anterior nao bloqueia a atualizacao do perfil caso o objeto antigo nao possa ser removido.
- A UI limita avatar a PNG/JPG/WebP ate 5MB, alinhada ao limite ja usado para foto profissional.

## Validacao

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`

## Pendencias

- Sem pendencias funcionais conhecidas para este ajuste.
