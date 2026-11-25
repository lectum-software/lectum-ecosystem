# ADR-0731 - Limite de linhas apenas antes da medicao

O paragrafo de InlineExpandableText incluia texto e botao dentro do mesmo line-clamp.
Pequenas diferencas de quebra de linha podiam ocultar o controle de expansao.

Manter o clamp somente no HTML inicial e enquanto o texto atual nao foi medido.
Depois, o preview calculado controla o comprimento e o paragrafo deixa de recortar o botao.
Identificar a medicao pelo texto evita reutilizar a liberacao inicial ao trocar o conteudo.

Trade-off: uma diferenca de medicao pode adicionar uma linha, mas nunca deve tornar
o controle inacessivel. Cores, tipografia, rotulos e eventos existentes sao preservados.
Testes de navegador cobrem larguras mobile-first, texto completo e retorno ao resumo.
