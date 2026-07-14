# ADR 0267: Origem do tráfego no detalhe administrativo do psicólogo

## Status

Aceito em 2026-07-14.

## Contexto

O site público já possui, nos analytics do psicólogo, uma tabela **Origem do tráfego** com colunas de fonte, visualizações de perfil, WhatsApp e conversão. O Admin precisava ver a mesma leitura dentro da aba **Estatísticas** do detalhe do psicólogo, entre **Análises do vídeo de apresentação** e **Uso da plataforma**.

## Decisão

- O endpoint Admin de estatísticas do psicólogo passa a retornar `traffic_sources`, calculado a partir de `page_view_event` real do perfil público.
- O agrupamento usa `page_kind="psychologist_profile"`, `target_type="psychologist"` e `target_id=<user.id do psicólogo>`, consolidando por `traffic_source`.
- A UI Admin mantém a tabela com colunas `Fonte`, `Visualizações de perfil`, `WhatsApp` e `Conversão`.
- `WhatsApp` e `Conversão` por origem permanecem indisponíveis quando não há atribuição first-party persistida. O contrato retorna `null` e a UI exibe `—` com copy explicativa.

## Consequências

- O Admin passa a visualizar origem de visitas reais do perfil público sem depender de mocks ou dados retroativos.
- A tabela fica alinhada ao formato do site público, mas evita zero falso para WhatsApp/conversão por canal.
- Uma atribuição futura de WhatsApp por origem deve persistir origem/sessão no evento de contato antes de preencher `whatsapp_clicks` e `conversion_rate` por fonte.
- Não há alteração de schema Prisma, migrations ou packages nesta decisão.
