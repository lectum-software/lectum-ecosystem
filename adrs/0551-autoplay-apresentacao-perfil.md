# ADR-0551 - Autoplay compartilhado na apresentacao do perfil

Status: Accepted
Data: 2026-10-01
Task: TASK-207

## Contexto

As publicacoes do perfil ja compartilham a politica de autoplay e volume do
feed/comunidade. O video de apresentacao da aba Sobre ainda exige play manual
e usa controles nativos, sem comunicar escolha explicita de volume ao estado
compartilhado. O usuario solicitou a mesma regra tambem nessa apresentacao.

## Decisao

Registrar PresentationVideo com useCommunityVideoAutoplay quando houver fonte.
Compor o callback de analytics existente antes do callback de registro,
incluindo null para limpar listeners e registro ao desmontar/substituir video.
Nao adicionar autoplay nativo, estado de audio, persistencia ou motor paralelo.

Usar controles persistent/media de VerticalVideoPlayer, como na comunidade,
com onSoundEnabledChange e muted derivados do coordenador compartilhado.
Assim o botao de audio registra consentimento explicito; volumechange,
carregamento e play nao autorizam som. Manter overlay de mudo e expansao inline.
Capa, enquadramento, dimensoes mobile-first e analytics continuam existentes.

## Consequencias

Apresentacao e publicacoes disputam a mesma selecao por visibilidade (58%),
com um video por vez, pausa manual, foco e suspensao por modal. Ambos herdam
a mesma preferencia e fallback mudo que nao se desfaz automaticamente.
O diretorio imersivo e outros consumidores do player nao sao alterados.

Sem dependencia, banco, env ou API nova. Pode aumentar consumo de midia no
perfil. Check/build e teste de contrato cobrem integracao e suite existente
cobre coordenador/fallback. Smoke mobile e desktop antes de promover producao.
Rollback por reversao desta integracao; nenhuma acao manual de configuracao.
