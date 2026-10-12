# ADR-0611 - Previa social e conectores da arvore

## Status

Aceito.

## Contexto

A previa social era montada dentro do card da resposta. Em alguns dispositivos, o
contexto de empilhamento do card deixava o compositor fixo acima da modal. Respostas
profissionais aninhadas tambem podiam montar a previa com o titulo do post porque a
resposta detalhada nao expunha o texto do comentario pai. Na arvore, recuos distintos
entre raiz e niveis internos separavam visualmente alguns trechos dos conectores.

## Decisao

A modal social e montada em `document.body` por portal e ocupa a camada de modais da
aplicacao. O contrato de resposta ganha `parent_content`, calculado pela relacao
existente, e o frontend o envia explicitamente ao alvo social; o servico de render
continua resolvendo o mesmo comentario diretamente no backend.

Os controles de ramo ficam compactos, cinza e bold, com 10px aplicados de forma a
prevalecer sobre a regra tipografica global dos botoes. A linha vertical permanece
ativa enquanto houver controle de ramo e recebe uma curva ate abrir, carregar mais ou
ocultar respostas. As ligacoes intermediarias usam a mesma borda CSS arredondada,
com espessura, raio e eixo alinhados a borda do pai. Para o controle final, reta
e curva sao uma unica borda lateral/inferior com canto arredondado, terminando no
centro da linha de acao de altura fixa. Nao ha SVG separado nem continuacao vertical
abaixo da curva, evitando emendas visiveis por arredondamento de pixels.
O deslocamento horizontal da linha passa a acompanhar a densidade
do nivel atual, com pequena sobreposicao entre segmentos para evitar lacunas de pixel.
O coracao favoritado recebe o mesmo escalonamento do selo verificado no comentario.

## Consequencias

O download volta a ser acessivel sobre o compositor e a arte exibida antes de baixar
corresponde ao MP4. A mudanca de API e aditiva, sem schema, migration, env ou nova
dependencia. Rollback por reversao revisada em `homolog`.

## Complemento: comentario sem texto

Quando existe `parent_reply_id` e o conteudo do comentario pai e vazio (incluindo
espacos), ocultar a caixinha inteira. Nao substituir pelo titulo/conteudo do post
nem por um aviso de resposta a outro video. Respostas diretas ao post continuam
usando a pergunta original. Perfil/salvos, previa e MP4 seguem a mesma decisao;
a identificacao do profissional permanece.

O backend deriva `hideSourceCard` da relacao persistida, nunca de um booleano
fornecido pelo cliente. O contrato do video aceita o campo opcional com default
false; o worker omite filtros e inputs de assets da caixinha, preservando indices
corretos do selo nos modos standard e portable. A chave do cache local inclui
visibilidade, rotulo e identificacao, para evitar reutilizar outra composicao.

Previa e download devem manter o mesmo layout em todos os cenarios. Testes de SSR
da previa e verificacao de pixels do MP4 cobrem a ausencia integral da caixinha;
os testes de regressao preservam a arte quando o campo novo esta ausente.
O complemento exige rollout coordenado: video (API/worker), backend, frontend.
Versoes antigas toleram o contrato, mas nao implementam a ocultacao. Sem mudanca
de banco, env, dependencias ou arquivos previamente baixados.
