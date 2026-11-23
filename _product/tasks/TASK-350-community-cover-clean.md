# TASK-350 - Capa da comunidade sem brilho sobreposto

## Escopo

Estender a limpeza visual da capa do perfil para a comunidade. Retirar o brilho radial e a camada community-header-highlight, preservando o degrade da paleta, altura de 100px, botoes e posicionamento.

## Aceite

- [x] Retirar camadas luminosas da capa sem mudar geometria.
- [x] Validar testes, build e navegador local.
- [ ] Aprovacao antes de publicar.

Referencia: capturas fornecidas pelo usuario e TASK-348. Builder indisponivel nesta execucao. O efeito retirado pertence ao site; efeitos da barra nativa do Safari nao sao alterados. Sem mudancas de backend.

Validacao: 55 testes passaram sem skips; build frontend passou. Chrome local com dados reais e mutacoes bloqueadas confirmou capa de 100px sem sobreposicao em 390 e 1440px. Capturas `.tmp/previa-comunidade-capa-390.png` e `.tmp/previa-comunidade-capa-1440.png`. Sem push/deploy.
