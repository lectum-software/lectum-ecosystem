# ADR-0414: Prévia Open Graph no Admin SEO

## Status

Aceita em 2026-08-03.

## Contexto

A tela Admin **SEO / Metadados** já possuía uma prévia de busca baseada nos campos atuais do formulário. Após a inclusão do upload de imagem Open Graph e do slug compartilhável de respostas, operadores precisavam validar visualmente o card de compartilhamento sem depender de ferramentas externas.

## Decisão

- Adicionar um card **Prévia Open Graph** abaixo do formulário, junto às prévias técnicas existentes.
- Usar os valores observados do formulário como fonte da prévia:
  - `og_title` com fallback para `title`;
  - `og_description` com fallback para `description`;
  - `og_image_url`;
  - URL canônica resolvida pelo mesmo helper usado na prévia de busca.
- Renderizar imagem com `next/image`, sem `<img>`, reaproveitando a regra local de hosts permitidos.
- Manter o estado seguro quando não há imagem configurada ou quando o host externo não está habilitado no Admin.
- Preservar o layout mobile-first: cards empilhados em telas menores, duas colunas em desktop e três cards apenas em telas amplas.

## Consequências

- Operadores conseguem revisar título, descrição, domínio, URL e imagem Open Graph enquanto editam os metadados.
- A prévia não altera contratos de API, persistência, upload nem metadados públicos; é uma simulação visual client-side a partir de dados reais do formulário.
- Hosts externos continuam exigindo configuração explícita em `NEXT_PUBLIC_IMAGE_REMOTE_HOSTS` para evitar renderização insegura de imagens remotas no Admin.

## Validação

Registrada no ajuste pós-feedback da TASK-145.

## Complemento 2026-08-04 - grid das prévias em largura total

Após a inclusão da prévia Open Graph, os três cards de apoio ficavam dentro da coluna direita, enquanto o card **Páginas públicas** era esticado até a base desses cards por herança da grid. A decisão complementar é separar a composição em duas regiões:

- primeira grid: **Páginas públicas** e **Página selecionada**, com bases alinhadas;
- segunda grid: **Prévia de busca**, **Prévia Open Graph** e **Publicação**, ocupando a largura completa disponível.

Essa divisão remove o vazio abaixo do seletor, amplia a área útil dos três cards de prévia/publicação em desktop e mantém o comportamento mobile-first sem alterar dados, API ou persistência.
