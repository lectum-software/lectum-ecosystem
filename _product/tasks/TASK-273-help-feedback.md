# TASK-273 - Ajuda e feedback

Status: Done

## Escopo
Perfil privado de pacientes e psicologos: Ajuda e feedback, formulario unico,
WhatsApp 5511936220962 e suporte@lectum.com.br. Sem central de ajuda vazia.
Moderacao > Feedbacks: lista paginada, busca, filtros, detalhes, classificacao,
status Novo/Em analise/Concluido, notas internas e contador de novos.

## Aceite
- [x] Envio autenticado com texto e ate tres capturas, sem perder rascunho em erro.
- [x] Anexos privados verificados e sem metadados, acessiveis somente ao Admin.
- [x] Persistencia real, limite por usuario e idempotencia de envio.
- [x] Admin com filtros, status, classificacao, notas e auditoria.
- [x] UI mobile-first 390px e desktop validada com API/banco locais reais.
- [x] Migration local, testes, checks e builds aprovados.

## Referencias e limites
Refinamento visual solicitado em 25/10/2026:
- [x] Enviar retangular em largura total depois das capturas; sem botao no cabecalho.
- [x] Texto de anexos simplificado e remocao da frase sobre versao/viewport.
- [x] Ajuda separada em suporte e documentos legais existentes; descricao do
  feedback e rotulo Suporte via WhatsApp, com o icone existente da Lectum.
- [x] Blocos com raio, bordas, superficie e sombra dos grupos do perfil.
- [x] Preview somente leitura atualizado e telas reais verificadas em 390/1440px.

Evidencias do refinamento: .tmp/task273-refinement-browser-final.log valida
links, icone existente, raio, troca de superficie no tema escuro, textos,
largura/posicao do botao e envio real HTTP 201 em 390/1440px. Fixtures removidas.
Check frontend completo aprovado em .tmp/task273-refinement-check-final.log.
Build final aprovado em .tmp/task273-refinement-build-final.log (low disk mode).
Preview .tmp/task273-layout.html atualizado, sem bypass de autenticacao.
Smoke autenticado do build via next start nao validou a sessao local; o fluxo
real foi revalidado com next dev e API/banco isolados, sem mocks.

Capturas do usuario e componentes existentes sao a referencia visual.
Builder MCP indisponivel; inventario de prototipos consultado.
Sem e-mail, push ou WhatsApp automaticos, nem Sentry Feedback.
Dados tecnicos: somente versao e dimensoes de viewport; sem URL, cookies ou logs.
TASK-271 SendNF permanece local e fora do commit desta task.

## Rollout
Migration aditiva e backend antes de frontend/Admin. Nenhuma nova env obrigatoria.
Rollback preserva relatos e tabelas. Sem push/deploy nesta etapa.

## Evidencias locais
- Migration aplicada em lectum_whatsapp_dev_20261017, 127.0.0.1:55432.
  Preview com contas locais tambem atualizado em lectum_privacy_dev, sem reset.
- Testes de policy: validacao real Sharp, EXIF, tamanho, MIME e fingerprint.
- scripts/feedback.integration.ts: Postgres real, idempotencia concorrente,
  limite diario, filtros, controle de revisao e auditoria.
- scripts/feedback.http.integration.ts: API local real, envio dos dois papeis,
  tres capturas com todos os campos, recusa da quarta, retry idempotente, anexo
  privado, recusa anonima/usuario comum e conflito Admin.
- Playwright Chromium: 390px/paciente e 1440px/psicologo, envio com captura real,
  falha de rede e retry preservando rascunho, abertura privada e triagem no Admin.
  Sem overflow; fixtures removidas. Capturas .tmp/task273-*.png.
- Checks frontend/backend/Admin e guards da raiz aprovados; video com 92 testes
  aprovados e 13 skips preexistentes. Backend: 970 testes aprovados.
  Check raiz interrompido por formatacao Admin, corrigida e revalidada pelo check
  completo do Admin; etapa video executada separadamente.
- Builds backend/frontend/Admin aprovados. Frontend com LECTUM_LOW_DISK_MODE=1;
  Admin revalidado apos remover exclusivamente .next/dev antigo que contaminava
  a verificacao de source maps. Nenhuma protecao desativada.
- Auditoria backend: 42 alertas no grafo existente (3 criticos, 19 altos,
  18 moderados, 2 baixos), sem advisory em sharp. Incluem proxy-addr, multer,
  body-parser, axios, nodemailer, zod e outras dependencias preexistentes.
  Atualizacao de seguranca deve ser tratada antes da publicacao; nenhum bypass.
