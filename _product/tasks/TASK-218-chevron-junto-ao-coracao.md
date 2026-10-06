# TASK-218 - Chevron junto ao coracao

Data: 2026-10-06.

## Escopo

No post original, aproximar chevron e tema do coracao quando o psicologo ja
esta favoritado. A reserva de 66px do Favoritar deve acompanhar o botao de
24px, sem mudar respostas, perfil, API ou estado dos favoritos.
Referencia: captura do usuario. PROTO-INVENTORY e arquitetura consultados;
Builder indisponivel. Reutilizar CSS e componentes atuais. ADR-0558.

## Criterios de aceite

- [x] Reserva compacta somente junto ao link de tema do post original.
- [x] Chevron acompanha o coracao ao favoritar e desfavoritar.
- [x] Transicoes sincronizadas e prefers-reduced-motion respeitado.
- [x] Respostas mantem reserva anterior e nunca recebem chevron.
- [x] Check frontend e testes de layout responsivo aprovados.
- [ ] Build remoto e deploy de homologacao aprovados.
- [ ] Deploy de homologacao verificado e limitacoes de smoke registradas.

## Deploy

Frontend somente; sem API, migration, env ou dependencia nova. Homologacao
primeiro. Nao promover producao sem novo pedido. Evidencias externas em
outputs/original-post-heart-0590-*.

## Validacao antes do push

Frontend check completo passou; guards de versao, ADR, task, encoding e
source-safety passaram. Chromium com componentes reais e CSS local alterado
sobre utilitarios publicados em 0.1.589 passou em 320/390/1440px: estados
iniciais ativo/inativo, nome longo, respostas inalteradas, transicoes nos dois
sentidos sem overflow e reduced-motion sem animacao. Fixtures isoladas,
sem endpoints falsos ou alteracao de dados persistentes.

Build local falhou por ENOSPC. Limpeza apenas de .next/cache foi bloqueada pelo
executor mesmo apos permissao especifica. Build sera validado na Vercel para
o mesmo commit. Navegador conectado segue indisponivel; registrar limitacao
se a protecao Vercel impedir smoke autenticado em homologacao.
