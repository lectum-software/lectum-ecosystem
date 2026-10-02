# TASK-207 - Autoplay na apresentacao do perfil

Dependencia: TASK-206 (Completed). Status: Completed.

## Escopo

Aplicar ao video de apresentacao da aba Sobre do perfil publico o mesmo
autoplay e volume explicito do feed, comunidades e publicacoes do perfil.
Preservar capa, enquadramento, rastreamento e layout mobile-first (~390px).
Nao alterar o diretorio imersivo nem a edicao do perfil.

Arquitetura, packages, PROTO-INVENTORY e guias locais de Next consultados.
Referencia: componentes existentes e Perfil Profissional - Sobre do inventario.
Sem novo layout. Builder indisponivel nesta sessao; usar UI existente.

## Criterios de aceite

- [x] Apresentacao registrada no coordenador compartilhado apenas com video.
- [x] Reproducao por visibilidade, um video por vez, pausa manual e por foco/modal.
- [x] Volume usa apenas a preferencia explicita compartilhada e fallback mudo.
- [x] Controles de audio explicitos do player compartilhado e expansao preservados.
- [x] Analytics e limpeza dos listeners mantidos junto ao registro de autoplay.
- [x] Regressao automatizada, check/build frontend e smoke local executado.

## Validacao

Frontend check completo aprovado, incluindo nova regressao de integracao e
fallback mudo compartilhado. Um skip preexistente de symlink Windows.
Build otimizado aprovado em 0.1.542. Guards de versao, ADRs, tasks, encoding,
segredos, source-safety, source-size, ciclos e env aprovados.

Smoke local em localhost:3004: build inicia, mas o perfil apresenta estado
de erro de conexao da API. Sem simular resposta, sessao ou alterar seguranca.
Playback real mobile/desktop sera validado no deploy de homologacao e
registrado em outputs/autoplay-apresentacao-0542.md antes de promover producao.

## Deploy

Somente frontend, sem contrato, migration, env ou dependencia nova. ADR-0551.
Risco: maior consumo de midia na aba Sobre, como nas publicacoes.
Rollback: reverter a integracao do componente em nova revisao.
Publicar primeiro em homologacao; producao exige solicitacao explicita.
Nenhuma acao manual de configuracao.
