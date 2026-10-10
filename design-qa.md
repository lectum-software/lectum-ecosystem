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
- [x] Pergunta original dentro do video profissional.
- [x] Hierarquia visual compativel com o perfil profissional.
- [x] Controles e navegacao do item salvo preservados.
- [x] Estado mobile autenticado comparado com a referencia.
- [x] Logica compartilhada para comentarios de pacientes coberta por teste.

final result: passed
