# TASK-179 — Restaurar preflight e provisionamento de upload Stream

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
- [x] Contrato de URL admite os dois hosts de ingestão com HTTPS, sem aceitar hosts arbitrários, credenciais, portas alternativas ou fragmentos.
- [x] Falhas de contrato têm motivo controlado, sem URL/token/payload; resposta 2xx ambígua não dispara uma segunda reserva TUS.
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

## Segunda falha — provisionamento (14/09)

Commit `9c3283e7` / 0.1.378 publicado: backend/frontend/Admin confirmados; health/ready
200, OPTIONS permite o header novo e mantém origem não autorizada bloqueada.
O upload real ainda falhou com arquivos de 743469 e 237103021 bytes. Logs fornecidos
pelo operador mostram HTTP 200 no POST básico e 201 no TUS, ambos rejeitados como
`*_contract`. Portanto, não é evidência de limite de tamanho ou credencial ausente.

O adapter só permitia `upload.videodelivery.net`. A documentação oficial inclui
também a família `cloudflarestream.com` para upload; a correção admite exatamente
`upload.cloudflarestream.com`, não subdomínios arbitrários/playback. A CSP existente
já permite esse destino e não foi ampliada. O endpoint efetivamente devolvido em
homolog ainda precisa ser confirmado pelo diagnóstico seguro solicitado ao operador
ou pelo upload real após deploy; não declarar causa final apenas pelo teste unitário.

Os sete novos testes exercitam funções reais de URL/erro/fallback, sem simular API
Cloudflare. Protegem também contra lookalikes, localhost, controles, credenciais,
portas não padrão e fragmentos. A URL assinada permanece opaca e não é reconstruída.
Fallback do básico para TUS só após rejeição HTTP explícita 400/404/405/415/422;
timeout, 5xx, 2xx inválido ou erro inesperado encerram a tentativa para evitar reservar
duas vezes o mesmo ativo. Logs passam a distinguir motivos fechados de contrato.
Nenhuma reserva remota anterior é apagada ou migrada por esta correção.

Validação local complementar: backend check com 771 testes aprovados, zero skips/falhas;
Prisma/TypeScript/Biome e build aprovados. O teste de URL falha ao restaurar apenas
a allowlist antiga e os sete testes passam com os dois destinos. Deploy e upload
reais da correção complementar ainda precisam de confirmação.
