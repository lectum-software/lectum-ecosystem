# TASK-254 - Menu curto e foco do composer iOS

| Campo | Valor |
| --- | --- |
| Status | In Progress |

## Escopo

Pedido de 13/10/2026: Salvar e Compartilhar no menu de comentarios; corrigir
sobreposicao intermitente do composer pela barra nativa do iOS ao responder.
Capturas 10:08 e video 10:13 mostram tentativas corretas antes da falha na
continuacao. Usuario confirmou o video no PWA instalado; captura adicional
de 10:28 confirma a mesma falha no Safari comum. Cobrir ambos os modos.
Inventario visual consultado; referencia direta do usuario,
mobile-first (~390px), sem redesenho. Builder indisponivel. ADR-0616.

## Aceite

- [x] Menu usa Salvar/Compartilhar, preservando Remover dos salvos.
- [x] Destaque ao responder nao transfere foco do editor para o comentario.
- [x] Entrada por link focado continua focando o comentario para acessibilidade.
- [x] Geometria acompanha scroll do documento e estabilizacao tardia do teclado.
- [x] Checks e build frontend.
- [ ] Repetir o fluxo no iPhone real em Safari e PWA, incluindo continuacao, fechar/reabrir teclado.

## Validacao e limites

Video inspecionado por quadros; a disputa de foco foi identificada no codigo,
mas o video nao fornece medidas do visualViewport nem prova causa unica.
Testes de geometria e contrato de foco adicionados: 8 testes de rodape e 12
testes de foco/menu/aba passaram. Check frontend completo aprovado, incluindo
Biome, ESLint, TypeScript e suites de regressao (.tmp/task-254-frontend-check.log).
Automacao do navegador indisponivel por falha do sandbox helper.
Build frontend 0.1.660 aprovado (.tmp/task-254-frontend-build.log), usando
LECTUM_LOW_DISK_MODE sem apagar dados. Localhost:3000/version confirma 0.1.660;
/auth/login e API local :3001/ready respondem 200. Confirmacao fisica em Safari
e PWA do iPhone pendente. O ajuste compartilhado nao exige display-mode standalone.
Sem mudancas de API, banco, env ou dependencias. Sem push/deploy.
Rollback de codigo frontend; sem operacao em dados ou servicos publicados.
