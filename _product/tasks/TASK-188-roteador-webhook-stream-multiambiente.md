# TASK-188 — Roteador único de webhook Stream multiambiente

| Campo | Valor |
|---|---|
| Status | In Progress |

## Escopo

Versionar um Cloudflare Worker mínimo que receba o único webhook de uma conta Cloudflare Stream
compartilhada, valide sua assinatura e encaminhe o evento bruto aos backends de homologação e,
quando habilitado, produção. Não alterar upload, reprodução, vídeo dedicado, R2, banco ou filas.

## Decisão e rollout

- Worker é infraestrutura de provider separada das quatro aplicações. Não adiciona package nem
  transforma `cloudflare/` em uma quinta aplicação de produto.
- A rota aceita somente os destinos canônicos HTTPS; env não vira URL arbitrária/SSRF.
- Homolog é obrigatório; produção é opt-in e fica vazia até o endpoint de produção existir.
- O segredo Stream é configurado pela esteira como Secret do Worker e permanece validado novamente
  pelo backend.
- O source único do Stream só muda depois da publicação do Worker e da revisão do segredo retornado
  pelo provider. Sem troca automática no start ou por deploy de backend.
- Nenhuma env nova é obrigatória nas aplicações existentes. O Worker recebe seu Secret próprio da
  esteira; se o Secret GitHub correspondente estiver ausente, ela falha fechada antes de publicar.
- O source e o Secret do Worker são publicados por GitHub Actions; o painel Cloudflare guarda
  somente URLs de destino e Custom Domain. O Worker limita o endpoint a `POST /cloudflare-stream`.
  Enquanto produção estiver desabilitada, `homolog` é a esteira
  controlada. A promoção do roteador para `main` é obrigatória antes de habilitar o destino
  produtivo.

## Critérios de aceite

- [x] Worker versionado sem dependência, token, chave ou URL livre de encaminhamento.
- [x] Assinatura e corpo bruto validados e encaminhados para destinos permitidos, com falha fechada.
- [x] Testes locais cobrem assinatura, validade temporal, configuração, fan-out e falha de destino.
- [x] Template/documentação de produção corrigidos para o roteador, sem segredo em Git.
- [ ] Esteira CI/CD do Worker configurada com token exclusivo, Worker publicado, Custom Domain HTTPS associado e inscrição única Stream apontada para ele.
- [ ] Upload real em homolog confirmou o callback encaminhado; produção só será habilitada após
  backend e endpoint produtivos validados.
- [ ] Checks, bump, commit/push em homolog e smoke pós-deploy registrados.

## Validação local

- `node --test cloudflare/stream-webhook-router/src/worker.test.mjs`: cinco cenários aprovados,
  sem rede ou provider real.
- `pnpm --dir frontend check`, `pnpm --dir admin check`, `pnpm --dir backend check` e `pnpm check`
  aprovados. O check completo manteve seis testes condicionais de FFmpeg skipped por ausência local
  de `drawtext`; eles não contam como integração externa.
- As duas supressões ESLint são pontuais, cobrem recargas completas já intencionais após rejeição de
  sessão e desbloqueiam a validação sem trocar autenticação, rota ou cache.
- `pnpm version:bump` foi executado uma vez: `0.1.407` → `0.1.408` nos cinco manifests;
  `pnpm check:version` aprovado. O próximo push em `homolog` dispara deploy dos apps existentes,
  mas não publica automaticamente o Worker Cloudflare.

## Risco, rollback e operação manual

O Worker não toca bytes de vídeo: upload e playback continuam browser ↔ Stream. Em caso de falha,
voltar a inscrição Stream para o endpoint direto de homolog previamente validado e manter produção
desabilitada; não apagar vídeos, bucket ou banco. Entrega a mesma assinatura ao backend, então os
handlers continuam sendo a defesa final e precisam preservar idempotência para redeliveries.

O deploy do Worker depende do workflow GitHub Actions e das configurações externas mínimas no
painel Cloudflare; até isso ocorrer esta task permanece em progresso, sem alegar que produção
recebe callbacks.
