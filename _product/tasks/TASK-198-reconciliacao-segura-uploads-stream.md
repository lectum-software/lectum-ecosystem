# TASK-198 — Diagnóstico e reconciliação segura de uploads Stream interrompidos

| Campo | Valor |
|---|---|
| Status | In Progress |

Dependências: TASK-181 e TASK-182. Incidente produtivo relatado em 01/10/2026.

## Evidência e limite do diagnóstico

Uma reserva de resposta de 150.519.220 bytes permaneceu `uploading` após a validade,
sem sincronização/webhook registrados. Isso não comprova ausência total de bytes,
defeito no aparelho nem que essa reserva esteja associada a conteúdo publicado.
O provisionamento antecede os bytes; perda da resposta HTTP, interrupção do cliente ou
falha no cancelamento best-effort pode deixar a tentativa sem acompanhamento. A expiração
depende do polling autenticado do navegador. Eventos de cliente são logs efêmeros, não
histórico persistido. Não inventar causa histórica nem exigir novo upload produtivo.

Outro vídeo ready teve reprodução recusada pelo estado do **autor do post original**,
não necessariamente do dono da vídeo-resposta. São papéis distintos. A regra de negócio
permanece intocada e a cargo do restante do time. Credenciais locais de produção são
template: consultas com esse template não provam presença/ausência da mídia real.

## Escopo

CLI manual no padrão `backend/src/operations/video-assets`, somente leitura por padrão,
para inventariar dono/asset e consultar provider por GET. Saída com referências hash e
estados controlados, sem nomes, IDs pessoais, tokens, URLs ou mensagens externas.
Separar dono do vídeo, autor do post e associação canônica.

Apply restrito a um asset, confirmação do ambiente e compare-and-swap do snapshot.
Somente uploads diretos de Comunidades pendentes ou erro upload_expired são elegíveis.
Pronto/cancelado/excluído, migração e apresentação de perfil permanecem read-only.
Sem publicação, autoassociação, cancelamento, DELETE, upload, download ou limpeza.
Não converter timeout/404/credencial inválida em ausência comprovada ou expiração.
Sem scheduler/startup/backfill automático: inventariar antes de executar em produção.
A operação corrige estado escopado, não impede interrupções nem remove reservas da CF.

## Deploy e rollback

Somente backend; sem schema/migration, env nova, package novo ou UI. Apps independentes,
contratos HTTP inalterados. Deploy não altera registros nem ativa jobs. Primeiro homolog,
smoke health/ready/ping e CLI; produção só por promoção autorizada. Reverter código remove
o comando sem alterar bytes/associações. Apply exige revisão do dry-run e autorização.

## Aceite

- [x] Inventário somente leitura por dono/asset, paginado e sanitizado.
- [x] Conta do dono e do autor original diferenciadas; associação canônica inspecionada.
- [x] Caminho remoto usa apenas GET, sem upload, download, assinatura, publicação ou exclusão.
- [x] Apply exige asset único e ambiente confirmado; snapshot concorrente é recusado.
- [x] Expiração confirmada preserva mídia e admite reconciliação posterior para ready.
- [x] Políticas/parser e PostgreSQL real isolado, checks Prisma/TypeScript/Biome e build.
- [ ] ADR, bump único, commit/push homolog e smoke registrados.
- [x] Inventário produtivo recebido e distinção entre reserva e resposta publicada documentada.
- [ ] Dry-run com GET autenticado real no ambiente publicado, sem modificar o acervo.

## Pendências operacionais

Aguardar dry-run com GET autenticado do Stream correto no ambiente publicado. O inventário
produtivo confirmou envio posterior pronto e associado, sem comprovar identidade dos bytes.
Não é necessário nem autorizado reenviar mídia ou limpar reservas para validar esta task.
Não declarar causa histórica resolvida nem atribuí-la ao aparelho sem evidência.

## Evidência recebida e validação local em 01/10/2026

- A consulta produtiva por dono retornou três vídeos, todos ready, com dono ativo e não
  excluído. Duas vídeo-respostas estão associadas ao mesmo post de outro autor, inativo e
  excluído. A terceira linha não foi associada a resposta pela consulta; sua finalidade
  não foi selecionada, portanto não inferir associação de perfil a partir disso.
- A reserva pendingupload investigada não aparece nesse inventário. Esta evidência não
  autoriza alterar contas, regras de playback ou dados produtivos.
- Consulta posterior confirmou: a reserva pertence a outro usuário ativo/não excluído,
  está uploading e não possui resposta associada pela referência canônica, nem ready_at.
  Portanto ela não explica os vídeos visíveis do usuário inicialmente informado. É uma
  tentativa sem publicação associada, não evidência de perda de uma resposta publicada.
- A consulta do mesmo dono/contexto trouxe quatro reservas (horários do banco em UTC):
  29/09 15:14, 226.023.106 bytes, ready e associado; 15:25, 150.519.220 bytes, canceled e
  excluído, sem associação; 15:34, mesmo tamanho/formato, uploading sem associação; 16:28,
  mesmo tamanho/formato, ready às 16:31 e associado a uma resposta não excluída. Compatível
  com repetição de tentativa bem-sucedida cerca de 54 minutos depois da reserva parada,
  mas sem hash ou evidência de bytes não afirmar identidade exata entre os arquivos.
- Não foi demonstrada perda de vídeo publicado por essa reserva. Corrigir estado escopado
  é manutenção operacional, não recuperação necessária do vídeo posterior nem correção
  da regra de playback relacionada ao autor original excluído.
- Checkout inicialmente antigo foi atualizado por fast-forward para homolog b218fe49,
  versão 0.1.532, também observada em ping de produção e homolog. O domínio backend Stream
  investigado não difere entre essas revisões. Nenhum push/merge produtivo realizado.
- Implementação local: dez testes puros e dezesseis verificações PostgreSQL 18.6 real
  descartável aprovadas, build backend 0.1.533 aprovado. Sem provider simulado: integrações
  validam CAS e ausência real de configuração remota, não sucesso remoto na Cloudflare.
- Primeiro baseline raiz encontrou teste preexistente de notificações que importa Prisma
  sem DATABASE_URL/JWT_SECRET_KEY. Uma reexecução foi interrompida. Execução final de
  `pnpm check` passou nas quatro apps com configuração exclusiva de importação de testes
  (URL loopback não utilizada e segredo efêmero, sem carregar conexão local/publicada).
  Não confundir esse baseline com a integração PostgreSQL real separada, 16/16. Os onze
  testes condicionais do serviço video skipped não são validação externa do Stream.
- Bump único já executado para 0.1.533, cinco manifests sincronizados e check:version
  aprovado. Não repetir bump ao retomar este mesmo commit. Sem commit/push até agora.
- Publicação e aplicação permanecem pendentes: não tratar uma ferramenta operacional
  local como correção comprovada da causa histórica de upload.
- Revisão independente aprovada: sem runtime/rota/scheduler automático, sem escrita no
  dry-run e sem detalhes pessoais no relatório. Identificadores produtivos foram removidos
  dos testes de parser antes do commit; fixtures de política usam apenas valores genéricos.

## Operação após deploy da ferramenta

No container do backend do ambiente correto, apenas diagnóstico:

```sh
node dist/operations/video-assets/reconcile-video-uploads.js --help
node dist/operations/video-assets/reconcile-video-uploads.js --owner-id=ID_DO_USUARIO --dry-run --limit=20
node dist/operations/video-assets/reconcile-video-uploads.js --asset-id=ID_DO_ASSET --dry-run
```

O inventário inclui tentativas canceladas/excluídas para diagnóstico, mas nunca as reativa.
Use `--offset` com nextOffset do resultado para continuar; concorrência de novas reservas
pode deslocar páginas. Cada item identifica uploadRef, ownerRef e contextRef por hash,
datas, estado/associação e falha remota classificada. Nenhum identificador pessoal é impresso.

Exit 2 indica registro ausente, leitura remota não confirmada ou conflito concorrente;
não é confirmação de perda de arquivo. Exit 1 indica argumentos/configuração/falha inesperada.
Apply exige asset único e confirmação do ambiente e só atualiza metadados sob CAS. Não
executá-lo sem revisar o dry-run. Nenhum comando remove a reserva no painel Cloudflare,
apaga bytes, associa resposta, altera conta ou publica conteúdo.
