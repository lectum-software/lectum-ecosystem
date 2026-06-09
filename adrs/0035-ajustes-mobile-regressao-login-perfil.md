# ADR-0035: Correções mobile de regressão em autenticação, perfil e descoberta

## Status

Accepted

## Task relacionada

TASK-35

## Contexto

A validação manual mobile apontou regressões em fluxos já entregues: psicólogos retornavam à tela de planos após novo login, foto profissional podia ser sobrescrita no login Google, e telas de perfil, analytics, descoberta e favoritos tinham detalhes visuais fora do padrão mobile-first.

As regras do produto continuam proibindo mocks e métricas simuladas. Também não havia mudança de modelo de dados ou necessidade de pacote novo.

## Decisão

- O destino pós-login passa a usar `/app/community` como home de usuários já onboardados, mas mantém o funil obrigatório de psicólogos incompletos: planos, WhatsApp e setup de perfil quando ainda faltarem assinatura ativa, telefone ou publicação.
- O login Google só grava avatar do Google quando o usuário ainda não tem avatar persistido, preservando foto profissional enviada no perfil.
- Analytics aceita `period=custom` com `start_at` e `end_at` reais no endpoint existente, mantendo as métricas apenas em fontes persistidas.
- A UI mobile foi compactada sem criar design system paralelo: escala global mobile de 15px, cards de analytics mais estreitos, card de psicólogo com vídeo 16:9, remoção do filtro visual de verificados e novo layout de perfil profissional público conforme a imagem anexada.
- A seta do perfil público usa histórico do navegador com fallback para `/app/psychologists`, porque o usuário pode chegar ao perfil por favoritos, busca, menu de perfil ou outros fluxos.

## Consequências

- Usuários recorrentes deixam de ser enviados indevidamente para planos quando já concluíram onboarding.
- A foto profissional não é apagada por uma nova autenticação Google.
- O filtro customizado de analytics amplia o contrato sem migration e sem simular dados.
- O ajuste global de fonte melhora densidade mobile, mas pode exigir refinamentos pontuais em telas futuras que dependam de textos muito longos.
- O filtro `verified` continua existindo no backend por compatibilidade de contrato, mas foi removido da UI da listagem conforme pedido.

## Validação

- `pnpm --dir frontend check`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser/HTTP local em rotas afetadas; rotas privadas sem sessão real preservaram redirecionamento/gate de autenticação.

## Pendências

- Métricas de busca, visualizações de perfil, vídeo views e favoritos continuam pendentes de eventos persistidos antes de exibirem números reais.
- Validação visual autenticada completa depende de uma sessão real reutilizável no browser do ambiente; não foi criado mock de usuário para contornar isso.
