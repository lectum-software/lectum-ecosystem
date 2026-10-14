# TASK-258 - Retorno a arvore apos continuacao

| Campo | Valor |
| --- | --- |
| Status | In Progress |

## Escopo

Preservar ramos abertos/fechados, texto expandido, paginas carregadas e posicao
ao abrir uma continuacao e voltar ao post ou a continuacao anterior. Mobile-first
(~390px). Arquitetura e inventario consultados; sem mudanca visual nova, Builder
indisponivel. Usar componentes existentes da TASK-257. ADR-0620.

## Aceite

- [x] Retorno restaura cada ramo e a quantidade visivel, sem abrir ramos fechados.
- [x] Paginas adicionais de respostas raiz sao recarregadas antes do scroll.
- [x] Posicao ancorada no ponto de continuacao, tolerando alteracao de altura.
- [x] Continuacoes sucessivas e posts/usuarios distintos nao se misturam.
- [x] Novo link de foco nao herda a memoria de outra URL.
- [x] Ocultar respostas continua limpando os descendentes na reabertura.
- [x] Memoria limitada a aba/30 minutos, sem textos e limpa no logout.
- [x] Testes, check e build frontend aprovados.
- [ ] QA visual autenticada mobile/desktop.

## Rollout

Somente frontend, sem migration, env ou dependencias novas. Sem mutacao de dados
publicados. Rollback de codigo descarta o uso da memoria temporaria. Commit local
apos validacao; nao publicar sem nova autorizacao.

## Evidencias locais - 0.1.665

- 58 testes focados aprovados: storage, TTL/limites, isolamento, captura de ramos,
  calculo de ancora, SSR dos componentes reais e logout.
- Check completo frontend e build de producao aprovados. Logs em
  .tmp/release-0665-frontend-check.log e .tmp/release-0665-frontend-build.log.
- Guards de versao, tamanho, ciclos, encoding, source-safety, segredos, env,
  tasks e ADRs aprovados.
- Playwright/Chrome com API e dados de desenvolvimento reais: abrir continuacao,
  voltar pelo botao do app (320px, fonte raiz 24px) e pelo historico (393px,
  fonte raiz 32px). Ambos restauraram os mesmos 9 comentarios renderizados,
  quantidades abertas e ancora com diferenca inferior a 12px, sem pageerror.
- A fonte ampliada ativa a continuacao na arvore local, que so tem 3 camadas.
  Sem criacao de comentarios, seed, mock de API ou alteracao de dados publicados.
  Evidencias .tmp/release-0665-browser.log e release-0665-return-320/393.png.
- Navegador integrado indisponivel. QA autenticada em iPhone/Safari/PWA e desktop
  permanece pendente; a verificacao Chrome acima nao substitui essa aprovacao.
- Build de producao mantem bloqueio de API localhost; teste funcional usa next dev
  com API localhost:3001. Nenhuma protecao de origem relaxada.
- Servidor local localhost:3000 em 0.1.665. Sem push ou deploy deste lote.
