# TASK-362 - Cookies e avatares no diretorio

Status: Concluida localmente.

## Escopo

Corrigir contraste do aceite de cookies, remover espera inicial artificial do aviso
e otimizar avatares pequenos em /psicologos. Referencia visual: capturas atuais do
usuario, mobile-first 390px e desktop. Builder indisponivel; sem redesenho.

## Aceite

- [x] Botao com contraste minimo 4.5:1 nos estados normal e hover.
- [x] Aviso sem espera inicial, preservando consentimento e coordenacao de prompts.
- [x] Avatares responsivos otimizados em HTTPS e fallback HTTP local.
- [x] Check/build e verificacao visual mobile/desktop.

## Validacao

- Frontend check e build de producao aprovados; tres testes de regressao novos.
- Guards de source-safety, tasks, ADRs e encoding aprovados.
- Chrome 390px/1440px, DPR 2: avatares reais carregados via next/image.
  Uma amostra WebP entregue em 1046 bytes (64px) e 1714 bytes (96px).
- Cor computada do botao e hover confirmadas; preferencias abrem, Escape fecha
  e foco retorna ao aceite. Sem overflow horizontal nos dois tamanhos.
- Capturas inspecionadas em out/seo-post-preview/directory-390.png e directory-1440.png.
- Harness com GETs reais de producao, adaptacao local de CORS e bloqueio de escritas.
  Nenhum formulario enviado. Preview direto depende da politica CORS da API.
- Nao medidos: nova nota PageSpeed, ganho exato de LCP, aparelho fisico e sessao
  autenticada completa. O aviso continua visivel; consentimento nao foi relaxado.

## Publicacao

Somente local, sem push/deploy. Sem banco, dependencias ou variaveis novas.
Referencia: ADR-0726.
