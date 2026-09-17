# TASK-190 — Validação isolada do serviço de vídeo de produção na porta 4000

| Campo | Valor |
|---|---|
| Status | Blocked |

## Escopo e dependências

Validar a segunda implantação do app `video/` no servidor dedicado, destinada à produção e exposta
somente à rede privada WireGuard na porta `4000`. A implantação de homologação continua usando a
porta `3003`. Esta task verifica a configuração real e a comunicação autenticada do backend de
produção; não publica vídeos, não cria jobs, não limpa volumes/Redis, não altera dados, não promove
`homolog` para `main` nem faz redeploy amplo por iniciativa própria. A promoção para `main` ocorreu
após smoke de homolog por pedido explícito do usuário e deve ser validada como parte desta execução.

Depende da TASK-189 concluída e das duas implantações já criadas pelo operador no servidor dedicado.

## Decisão e impacto de deploy

- `PORT` é configurável pelo contrato da aplicação `video/`; `3003` é apenas o fallback local.
  Produção deve usar `PORT=4000`, e o backend de produção deve usar a URL privada correspondente,
  sem DNS público, por exemplo o endereço WireGuard confirmado pelo operador com `:4000`.
- Cada ambiente deve ter isolamento efetivo de `REDIS_URL`/senha, `VIDEO_SERVICE_API_KEY`, volume de
  `VIDEO_STORAGE_ROOT` e nomes de volumes/stack. Compartilhar qualquer um desses recursos permite
  colisão de jobs, leitura indevida de outputs ou autorização cruzada.
- A API de vídeo pode escutar no host para o túnel WireGuard, mas `4000` não pode ser acessível pela
  Internet. Redis e worker permanecem sem porta pública; o worker mantém somente o egresso necessário
  a fontes first-party/Cloudflare Stream para jobs autorizados.
- A validação usa exclusivamente `/health`, `/ready`, `/version` e o check autenticado já existente;
  não envia mídia nem revela chaves. Rollback é restaurar a URL/porta privada anterior no backend ou
  interromper o stack de produção, sem excluir dados.

## Critérios de aceite

- [x] O código e o Compose comprovam que a API, os healthchecks e o worker respeitam `PORT=4000`, sem
      referência operacional fixa a `3003` fora de defaults/documentação local.
- [x] No servidor de vídeo, a API de produção responde `health`, `ready` e `version` em
      `127.0.0.1:4000`; API, worker e Redis de produção estão saudáveis.
- [ ] O Redis, volume de mídia e chave interna de produção são diferentes dos recursos de homologação,
      sem exibir seus valores. **Pendente:** o operador interrompeu a verificação sanitizada antes da
      comparação; não assumir segregação de credenciais sem evidência operacional.
- [x] A porta `4000` está acessível apenas pela rota WireGuard necessária e bloqueada no IP público;
      Redis e worker não recebem exposição pública.
- [x] O backend de produção executa o check autenticado contra a URL privada `:4000`, com
      `authentication: valid`, `readiness: ready` e `transport: private_network`.
- [ ] A documentação/ADR registra a separação e as evidências, com checks, bump, commit/push em
      `homolog`. **Pendente até a retomada da validação de credenciais.**

## Validação operacional requerida

1. No servidor dedicado de vídeo, consultar somente estado/health dos containers e `127.0.0.1:4000`.
2. Do servidor principal, testar a rota WireGuard até `192.168.250.2:4000` e confirmar que o IP público
   do servidor de vídeo não aceita `4000`.
3. No container do backend de produção, rodar
   `node --enable-source-maps /app/dist/operations/video-processing/check-video-processing-service.js`.
4. Registrar somente resultados sanitizados; não copiar URLs internas completas, chaves, senhas ou
   inspect de envs.

## Evidências parciais — bloqueio operacional

- A promoção explícita foi concluída pelo PR #3 (`homolog` → `main`) sem excluir a branch
  `homolog`. Após o deploy, o backend produtivo respondeu `/ping` na versão `0.1.414`, `/health` e
  `/ready` saudáveis; frontend e Admin produtivos também responderam `0.1.414`.
- A verificação sanitizada do GlitchTip no container produtivo foi aceita com
  `environment: production` e `transport: accepted`.
- O check backend → vídeo falhou em `readiness/unreachable`; a rota WireGuard
  `192.168.250.2:4000` expirou para `/health`, `/ready` e `/version`.
- No servidor dedicado, `127.0.0.1:4000` recusou conexão e `docker ps` mostrou somente o stack de
  homologação (`3003`, API/worker/Redis saudáveis). Não há stack de vídeo de produção criado neste
  host, portanto não há como completar a validação da porta 4000 nem autorizar upload/transformação
  produtiva até provisioná-lo.

## Evidências coletadas

- A API de produção respondeu localmente em `:4000` com `healthy`, `ready` e versão `0.1.414`.
- A rota WireGuard do servidor principal respondeu aos mesmos três endpoints em `:4000`; a tentativa
  pelo IP público expirou, comprovando bloqueio externo.
- O check autenticado do backend produtivo confirmou `authentication: valid`, `readiness: ready`,
  versão `0.1.414` e `transport: private_network`.
- Um primeiro Compose de produção foi identificado no servidor principal e parado sem excluir app ou
  volumes; a implantação correta foi recriada no servidor dedicado.

## Decisão pendente

A comparação sanitizada de `REDIS_URL` e `VIDEO_SERVICE_API_KEY` entre homologação e produção não foi
concluída porque a sessão SSH do operador foi encerrada por uma instrução de diagnóstico inadequada.
Não há evidência para afirmar que os segredos são diferentes. Retomar esta task com um diagnóstico
sem `exit` em shell interativo antes de qualquer alteração de credenciais ou promoção futura.
