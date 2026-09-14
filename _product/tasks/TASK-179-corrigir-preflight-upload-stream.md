# TASK-179 — Restaurar preflight de upload Stream

| Campo | Valor |
|---|---|
| Status | In progress |
Dependências: TASK-163, TASK-173, TASK-178 e ADR-0497.

## Problema e evidência

Em 14/09/2026, backend e frontend de homologação respondem 0.1.377.
O frontend envia `X-Lectum-Video-Upload-Methods: basic,tus`, introduzido no
commit `fb4df718`, mas o CORS do backend não autoriza esse cabeçalho.
OPTIONS real em `/api/private/video-assets/uploads` responde 204 sem o cabeçalho
na allowlist. Portanto, 204 não significa que o navegador autoriza o POST.
O contrato compartilhado afeta apresentação, publicações e respostas.

## Escopo e segurança

- Acrescentar apenas o header de negociação ao CORS existente, sem wildcard,
  alteração de origens, autenticação, propriedade ou acesso aos vídeos.
- Exercitar preflight HTTP real com o middleware usado pela aplicação.
- Reproduzir no browser e validar após deploy, usando a conta da auditoria.
- Revisar alterações recentes de Stream sem reset, migração ou limpeza de mídia.
- Nenhuma mudança visual, package, migration ou env nova. Backend primeiro;
  frontend atual e clientes antigos continuam compatíveis.
- Rollback de código reintroduz o bloqueio; não altera dados persistidos.

## Aceite

- [x] Regressão reproduzida no preflight publicado e vinculada ao commit.
- [x] Preflight permite a negociação e mantém origens/headers não autorizados bloqueados em teste HTTP local.
- [x] Checks e build do backend aprovados, sem mocks de Cloudflare como evidência de upload.
- [ ] Upload real validado no browser após deploy de homologação.
- [ ] ADR, versão sincronizada, commit/push e smoke registrados.

## Evidências

`cors.test.ts`: cinco testes usam Express/CORS e conexão HTTP real em loopback,
sem subir bootstrap, acessar banco, simular Cloudflare ou criar vídeo.
`/ready` saudável valida configuração local e banco, não prova que o provider
aceita uma reserva nem que o browser envia o arquivo.

Validação local: backend check (764 testes aprovados), TypeScript/Prisma/Biome e build aprovados.
Teste de regressão: a política anterior falha em 2 de 5 testes; a corrigida passa nos 5.
Browser homolog 0.1.377, conta de auditoria: MP4 vertical de 3s/743469 bytes
falha imediatamente com “Não foi possível conectar ao serviço.”, antes do deploy.

Check global `pnpm check`: aprovado em 14/09/2026; 6 skips preexistentes no video
relacionados ao FFmpeg local. Nenhum skip no backend. Foram restaurados somente
os comentários ESLint justificados de recarga de sessão (frontend/Admin), removidos
pelos commits recentes; comportamento de autenticação permanece intacto.
