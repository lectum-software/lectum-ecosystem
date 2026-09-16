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
- [ ] Smoke do deploy homolog e upload real com a versão publicada.
- [ ] ADR, versão, commit e push homolog.
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
