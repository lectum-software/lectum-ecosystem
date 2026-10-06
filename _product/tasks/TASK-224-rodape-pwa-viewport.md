# TASK-224 - Recuperacao do rodape no PWA

## Objetivo

Mitigar o deslocamento intermitente da navegacao e do comentario para o meio
da tela no PWA iPhone ao inverter a rolagem, sem alterar a navegacao Android.

## Referencias

- Capturas WhatsApp Image 2026-10-06 at 19.39.18.jpeg e 19.39.01.jpeg.
- Usuario confirmou PWA e ocorrencia ao rolar para cima, sem gatilho de teclado conhecido.
- ARCHITECTURE e PROTO-INVENTORY consultados; layout existente preservado.
- ADR-0564.

## Aceite

- [x] Compensar apenas desvio medido em barras fixas mobile no PWA iOS.
- [x] Nao acumular compensacao; limpar quando o layout nativo se recuperar.
- [x] Nao interferir em campos focados, zoom, barra oculta, arrasto ou desktop.
- [x] Comentario usa offsetTop e altura visual sem duplicar movimento nativo.
- [x] Teclado fechado ou campo sem foco zera o deslocamento do comentario.
- [x] Testes de calculo, integracao e cenario Android incluidos.
- [ ] Build remoto e deploy de homologacao verificados.
- [ ] Confirmacao em PWA iPhone fisico antes da promocao para producao.

## Rollout

Frontend apenas, sem API, banco, env ou dependencia nova. Publicar em homolog.
Risco: metricas incorretas do WebKit podem nao refletir o defeito de composicao;
validacao fisica obrigatoria. Nao prometer eliminacao do bug so pela emulacao.
Rollback: reverter task, mantendo dados, drafts e posicao de rolagem intactos.

## Validacao

- Frontend check completo aprovado, incluindo seis testes novos de viewport.
- Preview isolado com PrivateTemplate e ReplyComposer reais, conteudo publico
  real e sem gravacoes de dados. CSS existente mais regra atual de recuperacao.
- Simulacao geometrica de desvio de 260px, eventos repetidos, recuperacao
  nativa, ocultacao da navbar, foco, fechamento de teclado e desmontagem.
- Chrome com perfis iOS PWA/navegador, Android PWA/navegador e desktop.
  Android inclui tres ciclos de redimensionamento e teclado sobreposto.
- Isso testa a mitigacao e regressoes; nao reproduz o compositor do iOS
  nem substitui teclado/PWA em dispositivos fisicos.
- Evidencias em outputs/fixed-bottom-0596*. Build local completo limitado
  pelo disco com menos de 1 GB livre; validar build remoto na Vercel.
- Checks de versao, segredos, encoding, ADRs, tasks, env, source-safety e
  ciclos aprovados. Source-size permanece bloqueado por dois arquivos nao
  alterados nesta task: community-post-card.tsx (724 linhas) e
  community-post-controls.test.mjs (916 linhas).
