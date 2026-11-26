# TASK-370 - Preferencias de campanhas unificadas

| Campo | Valor |
| --- | --- |
| Status | Concluida localmente |

## Escopo
Unificar Google e Meta em um switch, pre-selecionado para quem ainda nao decidiu. Simplificar introducao, cookies necessarios, campanhas, experiencia e associacao de origem. Referencia: screenshots do usuario; Builder indisponivel nesta sessao. Mobile-first 390px e desktop 1440px.

## Aceite
- [x] Um unico campo de campanhas salva ambas as escolhas quando Google esta habilitado.
- [x] Nenhum consentimento gravado ao abrir; recusas anteriores prevalecem no estado inicial.
- [x] Textos curtos preservam opcionalidade, finalidade, exclusoes e aceite previo.
- [x] Check/build frontend e validacao local do painel.

## Decisao
ADR-0734. Sem alteracao de backend, contrato ou coleta. Nenhuma migracao automatica de autorizacoes antigas. Analise de experiencia e associacao da origem permanecem independentes. Publicacao pendente; nao fazer push automatico.

## Evidencias
Frontend check aprovado; 49 testes de privacidade aprovados; build de producao concluido. Navegador local 390/1440px: campo unico ligado sem gravar consentimento, salvar habilita ambos, revogar desabilita ambos e persiste apos reload, sem overflow e sem chamadas Google no localhost. Capturas em .tmp/unified-preferences-390.png e .tmp/unified-preferences-1440.png. Versao 0.1.874; nenhum push/deploy.
