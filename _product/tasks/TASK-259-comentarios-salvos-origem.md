# TASK-259 - Origem e controles dos comentarios salvos

| Campo | Valor |
| --- | --- |
| Status | In Progress |

## Escopo

Mobile-first (~390px): comentarios salvos de pacientes e psicologos mostram
Ver publicacao original acima da identidade, sem previa textual ou sobreposicao
da pergunta no video. WhatsApp de resposta textual profissional fica imediatamente
apos comentarios. Estado salvo azul no menu da arvore. Arquitetura e inventario
consultados; Builder indisponivel, referencias nas capturas fornecidas pelo usuario
e componentes existentes de Minhas publicacoes. ADR-0621.

## Aceite

- [x] Link de origem compartilhado com Minhas publicacoes, incluindo comentario pai.
- [x] Texto/video profissional e comentario de paciente sem previa da pergunta.
- [x] WhatsApp textual junto a comentarios, CTA de video preservado.
- [x] Opcao salva azul, com semantica acessivel e estados pendentes preservados.
- [x] Posts salvos comuns, compartilhamento social e foco do comentario preservados.
- [x] Testes, check e build frontend aprovados.
- [ ] QA visual autenticada mobile/desktop.

## Rollout

Somente frontend; sem migration, env ou dependencia nova. Nenhuma mutacao de dados
publicados. Rollback por codigo. Commit local apos validacao, sem push/deploy sem
nova autorizacao. QA autenticada nao pode ser substituida por teste de componente.

## Evidencias locais - 0.1.666

- 66 testes focados aprovados, incluindo renderizacao dos componentes reais para
  papeis paciente/psicologo, texto/video, links de origem/foco e WhatsApp opcional.
- Check completo frontend e build aprovados; artefatos incluem a protecao final
  de largura dos controles. Logs .tmp/release-0666-focused.log,
  release-0666-frontend-check.log e release-0666-frontend-build.log.
- Playwright/Chrome: componentes SSR reais com dados existentes da API local,
  CSS real e leitura apenas. Origem acima da identidade e sem overflow de pagina
  em 320/393/1440px. Cor computada da opcao salva identica ao controle de salvar.
  Log .tmp/release-0666-visual.log e capturas release-0666-saved-*.png.
- Ensaio visual isolado, nao a lista autenticada de Salvos. Dados locais desse
  post nao possuem WhatsApp; posicao do WhatsApp coberta por SSR com fixtures de
  teste. Avatar local de um profissional indisponivel; video local renderizado.
- Navegador integrado indisponivel. QA autenticada em iPhone/Safari/PWA e desktop
  continua pendente. Nao houve gravacao, seed ou mutacao de dados publicados.
- Sem dependencia/env/migration nova; sem push/deploy. Retorno de arvore da
  TASK-258 preservado no lote local anterior.
- Na reinicializacao, Next gerou validator.ts de desenvolvimento corrompido.
  Regenerado apenas esse artefato com discoverRoutes/createRouteTypesManifest/
  writeValidatorFile do Next instalado e configuracao do build validado. Typecheck
  final passou (.tmp/release-0666-final-typecheck.log); nenhum hook desabilitado,
  tsconfig ou dependencia alterada.
