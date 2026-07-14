# ADR 0267: Origem do tráfego no detalhe administrativo do psicólogo

## Status

Aceito em 2026-07-14.

## Contexto

O site público já possui, nos analytics do psicólogo, uma tabela **Origem do tráfego** com colunas de fonte, visualizações de perfil e WhatsApp. O Admin precisava ver a mesma leitura dentro da aba **Estatísticas** do detalhe do psicólogo, entre **Análises do vídeo de apresentação** e **Uso da plataforma**.

O clique no WhatsApp não depende necessariamente de uma visualização do perfil público: ele pode ocorrer diretamente a partir do vídeo na página de psicólogos, de publicações/comentários na comunidade, de favoritos ou de links diretos. Portanto, usar `WhatsApp / visualizações de perfil` como taxa de conversão por origem é conceitualmente frágil e pode ultrapassar 100%.

## Decisão

- O endpoint Admin de estatísticas do psicólogo passa a retornar `traffic_sources`, calculado a partir de `page_view_event` real do perfil público.
- O agrupamento usa `page_kind="psychologist_profile"`, `target_type="psychologist"` e `target_id=<user.id do psicólogo>`, consolidando por `traffic_source`.
- A UI Admin mantém a tabela com colunas `Fonte`, `Visualizações de perfil` e `WhatsApp`.
- A UI pública do psicólogo também oculta a coluna/indicador visual de `Conversão` na origem do tráfego.
- `WhatsApp` por origem permanece indisponível quando não há atribuição first-party persistida. O contrato retorna `null` e a UI exibe `—` com copy explicativa.
- A taxa de conversão só deve voltar à UI se houver um denominador first-party adequado, como exposição/oportunidade real de CTA por origem, em vez de inferir a partir de visualizações do perfil.

## Consequências

- O Admin passa a visualizar origem de visitas reais do perfil público sem depender de mocks ou dados retroativos.
- A tabela fica alinhada ao formato do site público, mas evita zero falso e evita uma taxa de conversão com denominador incorreto.
- Uma atribuição futura de WhatsApp por origem deve persistir origem/sessão no evento de contato antes de preencher `whatsapp_clicks` por fonte.
- Um cálculo futuro de conversão deve persistir também a oportunidade/exposição do CTA por origem antes de preencher ou exibir `conversion_rate`.
- Não há alteração de schema Prisma, migrations ou packages nesta decisão.

## Complemento 2026-07-14 - Dashboard agregado de psicólogos

O dashboard Admin de psicólogos também passa a exibir **Origem do tráfego** logo após o gráfico de **Visão geral**, agregando todas as visitas reais a perfis públicos de psicólogos no período selecionado.

Para manter a mesma taxonomia do analytics público do psicólogo, `page_view_event.traffic_source` é consolidado nas cinco fontes de produto: `Explorar`, `Busca e filtros`, `Comunidades`, `Link direto` e `Favoritos`. Fontes técnicas sem dimensão específica persistida são mapeadas de forma conservadora: `lectum_community` entra em `Comunidades`, navegação interna de perfis/lista entra em `Explorar`, e acessos externos/diretos entram em `Link direto`. `Busca e filtros` e `Favoritos` permanecem com zero quando não há evento first-party específico para essas dimensões, sem inferência artificial.

Como `contact_request` ainda não persiste sessão/origem do clique no WhatsApp, a coluna **WhatsApp** por fonte continua indisponível (`—`) na tabela agregada. Essa coluna só deve receber números por fonte quando a origem do CTA for persistida no evento real de contato.

## Complemento 2026-07-14 - Ordem de leitura no dashboard agregado

A tabela agregada **Origem do tráfego** deve aparecer imediatamente após o gráfico de **Visão geral** no dashboard Admin de psicólogos. Em seguida vem o **Comparativo oferta e demanda**, deixando os demais blocos de conversão, modo de cadastro e uso da plataforma para a sequência posterior.

A decisão é de hierarquia visual: primeiro leitura executiva temporal, depois canais de aquisição, depois desequilíbrios de oferta/demanda e, por fim, demais diagnósticos. Não altera dados, contratos ou regras de atribuição.
