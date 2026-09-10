# ADR-0495: Backend como fonte única dos limites de vídeo

## Status

Accepted

## Task relacionada

TASK-177 - Backend como fonte única dos limites de vídeo

## Contexto

Os uploads Stream já enviam ao backend finalidade, MIME e tamanho antes de receber uma URL TUS.
Mesmo assim, o frontend mantinha tetos compilados de 200 MB para vídeos de comunidade e um fallback
de 300 MB para apresentação. Alterar as envs do backend não mudava esses guards e podia recusar no
aparelho um vídeo que o ambiente deveria aceitar.

Os endpoints legados multipart também conhecem o tamanho total na iniciação. Portanto, tanto Stream
quanto R2 multipart conseguem validar antes do transporte dos bytes. Limites locais continuam úteis
para imagens, mas não devem duplicar a política operacional dos vídeos.

## Decisão

- Usar exclusivamente as envs totais do backend para vídeo:
  - `UPLOAD_LIMIT_PSYCHOLOGIST_VIDEO_MULTIPART_MB`;
  - `UPLOAD_LIMIT_COMMUNITY_POST_MEDIA_MULTIPART_MB`;
  - `UPLOAD_LIMIT_POST_REPLY_MEDIA_MULTIPART_MB`.
- Não recusar vídeo no frontend por tamanho, antes ou depois da preparação passthrough.
- Manter formato/MIME permitido no frontend para feedback rápido, repetindo a validação no backend.
- Validar tamanho no plano de controle antes de verificar/provisionar o provider e antes de emitir a
  URL TUS.
- Diferenciar excesso de arquivo (`413`, `exceeded_file_limit`) de metadado inválido (`422`,
  `video_upload_invalid`). A mensagem pública interpolada usa o limite efetivo da env.
- Preservar a mensagem segura da API no frontend. Se um proxy responder `413` sem mensagem pública,
  mostrar texto genérico sem inventar número.
- Não enviar vídeos maiores que o threshold pelo endpoint simples quando uma rota multipart legada
  estiver ausente; falhar com mensagem de rollout em vez de usar um teto hardcoded no browser.
- Reusar a mesma resolução de limite no upload Stream e na inspeção do backfill R2.

## Consequências

- Uma mudança válida de env passa a valer sem recompilar o frontend.
- Arquivo excedente é recusado por uma chamada pequena de metadados; nenhum byte TUS chega ao
  Cloudflare Stream.
- O usuário recebe o limite real da finalidade, sem toast técnico nem valor obsoleto.
- Sem Stream, o multipart legado também recusa na iniciação. Upload simples só é escolhido para
  arquivo pequeno pelo threshold de transporte, que não é um limite máximo de produto.
- Imagens mantêm a proteção client-side existente e continuam fora desta decisão.
- Os hard caps do backend permanecem: env inválida ou fora da faixa usa fallback seguro.

## Produção e rollout

- Sem alteração de banco, migration, dados existentes, ativos Stream ou objetos R2.
- Sem env nova obrigatória. Ausência mantém os fallbacks atuais e não impede boot/deploy.
- Para alterar os totais, configurar as três envs `*_MULTIPART_MB` no backend de homologação e
  depois no backend de produção. As envs `*_SIMPLE_MB`/`*_MULTIPART_CHUNK_MB` não substituem os
  totais.
- Backend novo é compatível com frontend antigo, embora o bundle antigo ainda possa bloquear em
  200/300 MB até ser atualizado. Frontend novo aceita backend antigo e respeita sua resposta segura;
  a mensagem Stream antiga pode ser genérica.
- Ordem recomendada: conferir envs totais → publicar backend e frontend em homologação → testar um
  arquivo acima de 200 MB e abaixo do novo total → validar `/health`, `/ready`, `/ping` e `/version`
  → promover por PR revisado.
- Rollback simples restaura os guards do frontend; não exige reset, backfill ou limpeza.

## Validação

- Testes backend de limite exato, primeiro byte excedente, três finalidades, MIME e mapeamento 413
  passaram dentro dos 283 testes da aplicação.
- Testes frontend de imagem protegida, vídeo sem teto local, mensagem dinâmica da API e fallback
  seguro de proxy passaram dentro dos 117 testes da aplicação.
- Checks e builds de backend/frontend passaram; os cinco manifests foram sincronizados em
  `0.1.309`; o gate raiz também passou e os dois artefatos foram recompilados após o bump.
- Smoke local HTTP/Chrome mobile confirmou a rota `/version` em `0.1.309`. O upload real acima de
  200 MB permanece como smoke de homologação, sem mock.

## Pendências

- Confirmar em homologação que cada uma das três envs totais tem o valor operacional desejado.
- Executar upload real maior que 200 MB em apresentação, post e resposta; não simular com mock.
