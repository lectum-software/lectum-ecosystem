# ADR-0421: Guardrails finais da auditoria integral

## Status

Accepted

## Data

2026-08-08

## Contexto

Depois das decisões de segurança, modularização e Swagger registradas nos ADRs 0418 a 0420, a
releitura integral ainda encontrou riscos que poderiam reaparecer sem proteção automática:
enumeração pública de usuários, detalhes de fornecedores em erros e logs, confiança implícita em
proxy, algoritmo JWT não fixado, textos internos na interface, cores fora dos tokens, arquivos
novamente grandes e caracteres inválidos originados por uma migration histórica.

O repositório já publica automaticamente `homolog` e `main`. A solução precisa preservar dados,
contratos e deploy independente dos três aplicativos, sem reescrever migration aplicada e sem
quebrar os packages locais portados de Swagger, Validator e Seed.

## Decisão

1. A listagem pública legada de usuários é removida. Criação pública continua disponível, mas
   qualquer leitura de pessoas exige um caso de uso explicitamente autorizado.
2. JWT de usuário, admin, Google, “visualizar como” e socket aceita somente `HS256`. Confiança em
   proxy vem de configuração explícita, e autenticação opcional valida `x-device` antes de usar a
   sessão.
3. Erros públicos são normalizados por status. Stack, SQL, UUIDs, IDs de template, mensagens do
   Mercado Pago, `PolicyAgent`, payloads e nomes de mecanismos não podem chegar a toast ou tela.
4. Logs registram somente campos operacionais mínimos. Identificadores de pessoa, plano, webhook,
   origem bloqueada e conteúdo de provider não são impressos integralmente.
5. Respostas, tooltips e CSV usam vocabulário de produto. Nomes de tabela, coluna, fonte interna,
   payload e implementação deixam de compor textos visíveis.
6. UI usa tokens semânticos. Paletas Tailwind nomeadas, cores arbitrárias, `<img>`, HTML injetado,
   SQL Prisma inseguro, `eval`, mocks ativos e mensagens internas são bloqueados por check.
7. Arquivos complexos são divididos atrás das fachadas existentes. O baseline de tamanho fica
   vazio e ciclos de imports continuam proibidos.
8. Os dez `@ts-nocheck` necessários aos packages portados ficam em allowlist fechada. Novas
   exceções não podem ser adicionadas incidentalmente a código de produto.
9. Swagger gerado de TypeScript e do CommonJS compilado deve permanecer semanticamente igual. A
   validação atual fixa 64 paths e 73 operações.
10. A migration histórica com texto Latin-1 permanece imutável. A correção ocorre em migration
    aditiva, que atualiza somente especialidades que ainda contêm o caractere inválido.
11. Login, carregamento, feed e redirecionamentos privados são validados em viewport mobile de
    390 px e desktop antes do push de homologação.

## Consequências

- Enumeração acidental de pessoas deixa de existir na API pública.
- Novas mensagens técnicas, mocks de interface, cores diretas, ciclos e arquivos gigantes passam
  a falhar no check antes do deploy.
- Logs ficam menos detalhados para depuração, mas preservam operação, status, código e trace seguro.
- A migration de reparo é idempotente para registros já corrigidos ou personalizados.
- Os packages portados continuam compatíveis, mas sua tipagem permanece uma dívida isolada.
- A validação visual anônima do admin produz o `401` esperado ao consultar uma sessão inexistente.

## Produção e rollout

- **Banco:** migration `20260808140000_repair_specialty_text_encoding`, sem coluna, índice ou
  constraint nova. Não exige backfill separado nem bloqueia dados personalizados.
- `pnpm --dir backend db:migrate` foi executado, mas `migrate dev` não concluiu no schema engine
  contra o banco remoto configurado. Nenhum reset foi feito.
- `pnpm --dir backend db:migrate-prod` aplicou as 89 migrations; a verificação posterior encontrou
  zero especialidades com caractere inválido.
- **Envs:** nenhuma variável nova ou tornada obrigatória.
- **Packages:** nenhuma dependência nova.
- **Compatibilidade:** backend, frontend e admin podem ser publicados separadamente; a remoção da
  rota pública não afeta nenhum consumidor encontrado no repositório.
- Publicar primeiro em `homolog`. Promover para `main` somente após smoke do ambiente publicado.
- Em regressão de código, reverter o commit. A correção textual do banco não deve ser revertida,
  pois restaura nomes e não remove dados.

## Validação

- Leitura de todos os arquivos versionáveis.
- `pnpm check` sem warning.
- 45 testes automatizados do backend.
- Builds separados de backend, frontend e admin.
- `pnpm audit --prod` nos três aplicativos sem vulnerabilidade conhecida.
- Comparação semântica do Swagger em `src` e `dist`.
- Build e smoke da imagem Docker do backend.
- `/health` e `/ready` locais e no container.
- Smoke mobile e desktop de frontend e admin, incluindo rotas protegidas e feed.

## Pendências

- Remover bearer legado somente depois da janela de compatibilidade.
- Migrar CSP para nonce/hash em task própria.
- Adotar rate limit e lock distribuídos antes de escalar horizontalmente.
- Tipar os packages portados em trabalho isolado, com testes de contrato antes de retirar a
  allowlist.
