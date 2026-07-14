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
