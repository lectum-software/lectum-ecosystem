# Respostas salvas - Design QA - 2026-10-09

## Evidencias

- Verdade visual: `C:/Users/tulio/Downloads/WhatsApp Image 2026-10-09 at 20.32.39.jpeg` (590 x 1280).
- Implementacao autenticada: `C:/Users/tulio/AppData/Local/Temp/codex-clipboard-7d33ebf1-1f79-422e-bc69-a55bc421cb9a.png` (1920 x 1080).
- Recorte da implementacao: `.tmp/qa-task-240/implementation-mobile.png` (360 x 777).
- Comparacao conjunta: `.tmp/qa-task-240/comparison-mobile.png` (720 x 777).
- Viewport CSS: 393 x 852 no modo iPhone 16 do Chrome, exibido com `Fit to window`.
- Estado: rota real autenticada de Salvos, com resposta profissional em video e dados reais do backend local.

## Comparacao

- Tipografia: nome, selo, metadados e titulo da pergunta preservam a hierarquia compacta do card de resposta do perfil.
- Ritmo e layout: comunidade e chevron ficam na linha da autoria; a pergunta ocupa uma superficie sobre o video, sem criar um card externo adicional.
- Cores e tokens: selo azul da pergunta, texto, bordas e superficies reutilizam os componentes existentes do perfil profissional.
- Imagem: o video mantem proporcao, controles e enquadramento do item salvo. O destaque da pergunta nao cobre a autoria nem a barra de acoes.
- Conteudo: pergunta original, profissional, comunidade, data, votos, comentarios, salvar e compartilhar permanecem visiveis.
- Relacao profissional: a acao `Favoritar` reutiliza o controle oficial e fica entre o selo verificado e a comunidade, como no perfil.
- Responsividade: nenhum texto ou controle se sobrepoe no viewport de 393 x 852.
- Interacao: navegacao da comunidade, reproducao, WhatsApp quando disponivel e acoes do item foram preservadas.

## Diferencas esperadas

- A referencia mostra outra profissional, outra comunidade e outro video.
- O cabecalho da pagina de perfil e o CTA persistente de WhatsApp pertencem ao contexto do perfil e nao sao duplicados na pagina de Salvos.
- Nao havia comentario de paciente salvo nos dados locais. Esse estado usa o mesmo `SavedReplyAuthorHeader` validado na resposta profissional e possui cobertura de teste de contrato; o usuario aceitou essa verificacao por equivalencia.

## Historico de iteracoes

1. A implementacao reutilizou os componentes oficiais de identidade da comunidade e de pergunta do perfil.
2. A captura autenticada confirmou comunidade com chevron na autoria e pergunta original dentro do video.
3. A comparacao conjunta nao revelou diferenca P0, P1 ou P2.

## Checklist

- [x] Comunidade com chevron na mesma linha do autor.
- [x] Acao `Favoritar` entre o selo e a comunidade para psicologos.
- [x] Pergunta original dentro do video profissional.
- [x] Hierarquia visual compativel com o perfil profissional.
- [x] Controles e navegacao do item salvo preservados.
- [x] Estado mobile autenticado comparado com a referencia.
- [x] Logica compartilhada para comentarios de pacientes coberta por teste.

final result: passed

# Privacy notice visual QA - 2026-11-12

## Reference and scope

Reference: C:/Users/tulio/Downloads/WhatsApp Image 2026-11-12 at 14.44.30.jpeg.
Target is only its floating privacy notice, not the event-site background.
Reviewed reference and rendered mobile/desktop screenshots directly. Existing
Lectum Manrope, primary blue #308ce8, Modal, switches and form foundation reused.

## Rendered evidence

- .tmp/privacy-qa/mobile-notice.png: 390 x 844.
- .tmp/privacy-qa/desktop-notice.png: 1440 x 1000.
- .tmp/privacy-qa/mobile-preferences.png and desktop-preferences.png: same viewports.
- Actual local Next app at http://127.0.0.1:3140. Browser-only empty-feed fixtures
  supplied by frontend/scripts/privacy-browser-smoke.mjs; not production content.
  External network requests blocked; isolated Edge/Playwright context, no personal session.
- Dark #202020 floating surface, white paragraph, highlighted blue policy link,
  Lectum blue main action, centered Preferences, small mobile side margins.
- Compared with reference: hierarchy and compact rounded surface preserved.
  Initial actions are Aceitar cookies and Preferences; refusal remains in Preferences.
  Button label is dark for contrast on official blue, consistent with reference's
  dark primary-action label. Desktop stays compact at bottom-right, not a full-width wall.
- Mobile bottom navigation remains visible and clickable, with 12px separation.
  Safe-area CSS is included; a physical iPhone safe-area/keyboard run is still pending.
- Preferences panel uses the existing light modal language; no crowded or overlapping
  text at inspected sizes. Necessary is visibly on/locked, measurement starts off.

## Checks

Browser smoke checks bounds/no horizontal overflow, navigation separation, default
choices, modal priority, refusal through Preferences, reload persistence, policy-page
reopening, save/revoke and storage-quota failure. Login is excluded. No Meta requests.
The initial legal-page click test exposed hydration timing; its SSR trigger is now
disabled until hydrated. No layout changes or production substitutes were introduced
to make the screenshots pass.

10 focused frontend tests and 36 backend tests passed, including two real PostgreSQL
consent tests. Scoped lint and frontend/backend types passed. Full frontend tests
still fail in two pre-existing Sentry/Glob Windows tests; no related dependency edits.
Node 24.16.0 is below required >=24.22.1; rerun release checks on supported runtime.

## Approval and limitations

Visual approval pending. No deploy, no Meta activation, no credential reads/changes.
Browser tests cover guest UI and test-only API fixtures; authenticated consent persistence
is tested separately against isolated PostgreSQL. Authenticated end-to-end UI, actual
mobile Safari, published policy/legal approval and Meta restrictions remain release gates.
The local dev server has no live backend connection; screenshots use isolated fixtures.
