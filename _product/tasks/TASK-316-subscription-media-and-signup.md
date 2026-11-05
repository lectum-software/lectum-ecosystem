# TASK-316 - Assinatura, videos e convites de cadastro

## Escopo autorizado

- [x] Restaurar conclusao do cadastro com configuracao do perfil e separar conclusao do upgrade.
- [x] Historico: Assinatura mensal, preservando deduplicacao.
- [x] Autoplay: 50% visivel por 500 ms, um video, pausa manual respeitada.
- [x] Reels: perfil limitado; posts com continuacao e badges discretos.
- [x] Admin: encerramento imediato auditado, sem estorno nem alteracao de registro.
- [x] Convites breves: participar ou atuar como psicologo.
- [x] Checks, builds e verificacao visual local.

## Limites

Somente implementacao local. Sem push, deploy, emissao fiscal ou cobranca.
Builder indisponivel neste cliente; referencias: telas existentes e inventario local
PROTO-INVENTORY.md, imagens de assinatura e detalhe administrativo.
Preservar contratos durante rollout; nenhum novo provider ou pacote.

## Evidencias locais

- Versao local 0.1.779. Builds de backend, frontend e admin aprovados.
  O build do Admin foi repetido apos remover somente o cache `.next/dev` gerado
  pela verificacao visual; a verificacao de source maps terminou sem pendencias.
- Playwright com API real e banco PostgreSQL isolado: conclusoes de assinatura e
  upgrade, selecao de perfil e confirmacao administrativa em 390 e 1440 px.
  Capturas inspecionadas, sem overflow; fixtures temporarias removidas no final.
- Suite de videos: 131 testes aprovados, sem skips, incluindo continuacao de
  discussao para outro post, deduplicacao e contexto restrito do perfil.
- Autoplay: limite de visibilidade, espera de 500 ms, pausa manual e foco.
- `backend/scripts/immediate-subscription-end.integration.ts`: banco local real;
  cancelamento comum preserva periodo; imediato remove entitlement, restaura
  gratuito, audita motivo/ator e preserva CRP. Alvo incorreto e confirmacoes
  invalidas sao rejeitados; atualizacao atrasada nao restaura beneficios.
- Integracao repetivel com `pnpm --dir backend exec tsx scripts/immediate-subscription-end.integration.ts`,
  usando exclusivamente o banco local autorizado pelo proprio script.
- `pnpm check` completo aprovado. A bateria padrao pulou testes opcionais de
  symlinks no Windows, concorrencia de sessoes de visitante e render com FFmpeg
  ausente. Nenhum teste de reproducao/continuacao de videos deste lote foi pulado.
- Nenhuma cobranca, cancelamento remoto, estorno ou emissao fiscal foi executado.
  O cancelamento real no gateway permanece sujeito ao smoke de publicacao autorizado.
