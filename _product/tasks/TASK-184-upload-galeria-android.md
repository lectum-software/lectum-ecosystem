# TASK-184 — Leitura estável de vídeo da galeria Android

| Campo | Valor |
|---|---|
| Status | In Progress |

Dependência: TASK-182. Incidente de 15/09/2026, Chrome Android, vídeo selecionado na galeria.

## Evidência e escopo

Arquivo original de 250.743.537 bytes: upload desktop de perfil chegou a ready em 151.818 ms.
No Android, resposta recebeu contrato TUS, mas falhou em 23.422 ms, progresso arredondado 0%,
cinco retentativas e ausência de resposta HTTP acessível. Não prova CORS, falta de internet,
falha do arquivo ou corrupção. Caso similar documentado pelo próprio tus-js-client (#255).

Usar extensão fileReader oficial do SDK existente: materializar só a parte atual de até
5 MiB em ArrayBuffer e Blob de memória, sem transcodificar, sem memória proporcional ao
vídeo inteiro e sem delegar cópia manual ao usuário. Cache de uma parte, offsets validados,
leitura curta recusada, fechamento no abort/falha/sucesso; não repetir leitura inacessível
como se fosse rede. Diagnóstico fechado distingue método HTTP, estado de leitura e motivo
sanitizado. Nenhum nome de arquivo, URL, token, mensagem externa ou PII no log.

## Deploy

Backend e frontend; sem env nova, banco, migration, pacote, alteração de layout ou qualidade.
Vídeos continuam diretamente no Stream, imagens R2. API de vídeo/filas e boot intocados.
Backend aceita eventos antigos; frontend reenvia diagnóstico legado se backend antigo retornar
422 pelo campo opcional. Preferir backend antes do frontend; falta de diagnóstico nunca bloqueia
o upload. Rollback apenas de código, preservando dados. Não liberar assinatura/perfil público.

## Aceite

- [x] Reader limitado por parte, bytes preservados e cache compatível com retomada.
- [x] Abort antes/durante leitura e falha terminal liberam recursos, sem TUS DELETE.
- [x] Logs distinguem leitura de transporte sem mensagens livres; contrato compatível.
- [x] Testes reais do arquivo informado e regressão automatizada sem mocks.
- [x] Checks e builds das quatro apps e browser local.
- [x] Smoke do deploy 0.1.394 e upload real com a versão publicada (desktop).
- [x] ADR, versão 0.1.394, commit 7dbe044e e push homolog.
- [ ] Confirmação no Chrome Android pela galeria; não substituir por desktop/emulação.

## Validação em andamento

- Reader real: 48 partes do arquivo informado, SHA-256 recomposto idêntico ao original,
  maior parte 5.242.880 bytes, última 4.328.177 bytes.
- Browser local: o mesmo reader compilado leu o arquivo original e comparou SHA-256
  de cada parte, sem envio de dados, erro ou modificação de bytes. Não emula Android.
- Regressão real de arquivo alterado em disco: cache preserva bytes materializados;
  próximo acesso falha de forma segura. Abort de leitura pendente validado.
- `pnpm check` passou, incluindo Prisma, TypeScript, Biome, ESLint e regressões;
  os seis testes de integração condicionais do serviço de vídeo permaneceram skipped,
  não contabilizados como validação externa. Builds das quatro apps passaram.
- Checks detectaram warnings preexistentes de navegação completa no callback OAuth
  e interceptor do Admin; adicionadas justificativas ESLint pontuais, sem mudar
  o fluxo/runtime/autenticação; build Admin aprovado.
- Versão preparada 0.1.394, um único bump e cinco manifests sincronizados.
- Evidências locais fora do repositório em `task184-android-gallery` no diretório de
  artefatos desta execução; nenhum vídeo ou dado pessoal adicionado ao Git.

## Limites da validação

O agente não possui Android físico conectado. Publicação de mitigação e sucesso desktop não
encerram o incidente Android. O provider da galeria ainda precisa permitir ler os bytes; caso
recuse, mostrar erro de leitura em PT-BR e registrar somente classificação fechada.

## Seguimento — fonte ilegível confirmada no Android

Logs posteriores da 0.1.394 confirmam `source=failed/sourceFailure=unreadable`, antes
que o primeiro PATCH transporte bytes. A materialização limitada não resolveu esse aparelho;
contrato Stream provisionado com sucesso não significa que o navegador leu o arquivo.

Escopo adicional (somente frontend; sem env/package/banco/qualidade/boot):
- [x] Composer mantém um único input e FileList durante preview/envio/falha; não limpar no change.
- [x] Editor de resposta também mantém a seleção até descarte, sucesso ou nova escolha.
- [x] Falha tipada de leitura oferece botão explícito para seletor genérico; preserva texto e
  bloqueia repetição do mesmo File ilegível até nova seleção válida ou remoção.
- [x] Validação de MIME/limite/permissão mantida; cancelamento/arquivo inválido não liberam envio.
- [x] Mensagem da seleção inválida tem precedência e não é memorizada pela identidade de errors
  do RHF; o editor pode rolar para alcançar a recuperação em alturas pequenas.
- [x] Browser local com componente real, arquivo original e falha real em cópia temporária.
- [x] `pnpm check` das quatro apps, build frontend e versão sincronizada 0.1.395.
- [ ] Commit/push e smoke do seguimento (registrar resultado após publicação).
- [ ] Resultado do mesmo vídeo no Chrome Android afetado após o seguimento.

### Evidência executada do seguimento

Browser local: input conectado e FileList com 250.743.537 bytes após preview. Uma cópia
fora do repositório teve somente mtime alterado após seleção, provocando recusa real de
leitura pelo navegador. O rascunho foi preservado, envio bloqueado, recuperação exibida.
Seleção de TXT pela recuperação foi recusada com mensagem PT-BR visível e sem liberar
envio. Nova seleção do original removeu o bloqueio; leitura integral de 48 partes
(250.743.537 bytes), texto mantido até sucesso e formulário limpo depois.
Nenhum endpoint simulado, publicação ou alteração do original nesse ensaio. O harness
local é temporário, arquivado fora do repositório e removido antes do build.

Visual mobile-first: componente real contido em 390 px, Button e InlineAlert existentes;
referência `_product/proto/Dentro do Post.jpg`. Builder indisponível nesta sessão.
Revisão independente corrigiu scroll do editor e precedência de validação. Browser detectou
cache inadequado do erro RHF, também removido. Não afirmar reprodução física Android.

Preservar input é uma mitigação conservadora, **não prova de que sua remoção revoga o File**.
O seletor genérico altera a rota de aquisição no Chromium consultado; não garante app Arquivos,
fonte local ou permissão válida em toda versão/OEM. Não copiar vídeo inteiro para RAM/OPFS,
não introduzir proxy na API principal, R2 ou compressão como solução para bytes inacessíveis.

Validação do seguimento: `pnpm check` completo passou; build frontend 0.1.395 passou;
5 regressões novas passaram. Os 6 testes condicionais do serviço de vídeo permanecem
skipped, não contam como teste externo. O primeiro check encontrou somente types gerados
pelo dev para a rota temporária já removida; artefatos dev descartados e check completo
reexecutado com sucesso. Um único bump; sem alteração de código runtime de backend/admin/video.
