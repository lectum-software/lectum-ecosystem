# ADR 0106: Ilustração e refinamento visual da solicitação de comunidade

## Status

Aceito

## Contexto

A tela `/app/community/suggest` precisava ficar mais consistente com a família visual das telas internas da Lectum, substituindo a composição ilustrativa criada por ícones por um asset SVG fornecido pelo usuário e reduzindo o peso vertical do header.

## Decisão

- O SVG fornecido foi salvo como asset estático em `frontend/public/images/community-request-illustration.svg`.
- A tela passou a renderizar a ilustração com `next/image`, preservando proporção horizontal e evitando cortes/distorções.
- O header foi compactado para o padrão interno com botão de voltar à esquerda, título centralizado e altura controlada.
- O texto principal e o card do formulário foram refinados usando tokens/classes já existentes do design system da Lectum.

## Consequências

- A tela passa a depender de um asset real versionado no repositório, sem gerar ilustrações por CSS/ícones soltos.
- A experiência mobile e desktop permanece responsiva sem criar nova dependência de pacote.
- A ação de envio e a integração com a API de sugestão de comunidade permanecem inalteradas.

## Atualizacao 2026-06-26 - imagem full-width e erro sem faixa vermelha

### Contexto

Na tela `/app/community/suggest`, a ilustracao do topo estava centralizada com largura maxima pequena dentro de um container largo, gerando areas vazias laterais. Ao submeter o formulario vazio, a validacao do campo ja mostrava erro inline, mas a tela tambem exibia um alerta geral em faixa vermelha com o titulo `Nao foi possivel enviar`, criando duplicidade e peso visual excessivo.

### Decisao

- Remover o padding interno do frame da ilustracao e permitir que o `Image` preencha a largura disponivel com `w-full`.
- Remover o `InlineAlert` geral do formulario para erros de validacao local; a responsabilidade principal desses erros permanece no controller de campo da fundacao da `TASK-02`.
- Manter erros reais de API/rede como texto simples com `role="alert"`, sem card vermelho nem titulo adicional.
- Preservar `next/image`, React Hook Form, Zod, submit real e integracao com `POST /api/private/community/suggestions`.

### Consequencias

- O topo fica visualmente mais integrado ao card, sem a imagem parecer um thumbnail solto dentro do container.
- A tela deixa de duplicar mensagens de validacao: o usuario ve o erro onde ele corrige o campo.
- Falhas reais de backend/rede continuam acessiveis, mas com menor peso visual.
- A alteracao e puramente frontend/visual e nao modifica backend, Prisma, endpoints, payloads, dados, permissao ou packages.

### Validacao

- `pnpm --dir frontend exec biome check --write "src/app/app/community/suggest/logic.tsx"`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- `git diff --check`
- HTTP local `200` em `/app/community/suggest`
- Browser/CDP headless confirmou o guard de perfil protegido quando nao ha sessao; a tela autenticada foi validada por screenshot do usuario e inspecao do codigo renderizado da rota protegida.

## Atualizacao 2026-08-15 - confirmacao fora do loop de historico

### Contexto

No fluxo de sugestao de comunidade, uma sugestao bem sucedida levava o usuario para a confirmacao e,
ao finalizar, de volta para `/comunidades`. Como ambas as navegacoes usavam insercao normal no
historico, a pilha ficava com a confirmacao antes da pagina de comunidades; ao tocar no voltar do
navegador, a confirmacao era reaberta e o usuario podia entrar em um ciclo.

### Decisao

- Trocar a navegacao de sucesso do formulario para `router.replace("/app/comunidades/sugerir/sucesso")`,
  substituindo o formulario ja concluido pela tela de confirmacao.
- Marcar os links de fechar/finalizar da confirmacao com `replace` ao voltar para `/comunidades`.
- Manter as rotas, a chamada real de sugestao, o layout e os textos atuais; a mudanca e somente na
  semantica de historico do Next App Router.

### Consequencias

- O botao voltar do navegador nao retorna para uma confirmacao ja finalizada.
- O usuario volta para o contexto anterior de comunidades sem precisar repetir a acao de finalizar.
- Nao ha alteracao de contrato, backend, dados persistidos, packages ou envs.
