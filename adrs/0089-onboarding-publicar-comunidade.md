# ADR 0089 — Onboarding local para publicar na comunidade

## Status

Aceito em 2026-06-14.

## Contexto

As telas de comunidade precisam ensinar, de forma leve e nao permanente, que o usuario pode usar o CTA de publicar para criar uma duvida ou relato dentro da comunidade. A orientacao deve aparecer apenas na primeira visita a qualquer tela de comunidade e nao deve alterar a logica do botao Publicar, os endpoints ou a estrutura persistida no backend.

Tambem ha uma regra de comunicacao: o texto nao pode sugerir consulta, diagnostico, terapia ou atendimento psicologico gratuito individual. A mensagem deve se limitar a conversa gratuita dentro da comunidade e acolhimento de psicologos mediadores.

## Decisao

Persistir o estado de exibicao do onboarding no cliente usando `localStorage`, com a chave `lectum:community:publish-onboarding:v1`.

O onboarding e renderizado nas rotas de comunidade (`/app/community/feed` e `/app/community/[slug]`) como uma camada global de UI acima da navegacao, com:

- overlay escurecido e blur leve;
- destaque visual independente para o CTA Publicar;
- pulso/glow sutil;
- tooltip responsivo com titulo, descricao e acao `Entendi`;
- fechamento por `Entendi`, clique fora ou `Esc`.

O CTA real permanece inalterado. A camada destacada e apenas visual para evitar regressao em href, handlers, rastreamento ou acessibilidade do botao existente.

## Consequencias

- A exibicao fica imediata e independente de alteracoes no backend.
- O onboarding nao acompanha outro dispositivo ou outro navegador do mesmo usuario, pois a persistencia e local ao cliente.
- Caso `localStorage` esteja indisponivel, o onboarding e tratado como visto para evitar exibicoes repetidas ou erros de runtime.
- A abordagem pode ser migrada futuramente para preferencia persistida no perfil do usuario se o produto precisar sincronizar onboardings entre dispositivos.

