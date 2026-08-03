# ADR-0405: Visualização administrativa como usuário em modo somente leitura

## Status

Aceito — 2026-08-02

## Contexto

O produto solicitou uma opção para o Admin visualizar a plataforma como pacientes e psicólogos. A posição escolhida foi a aba **Conta** dos detalhes administrativos, para manter a ação menos exposta que o header.

Tasks anteriores deixavam impersonação fora do escopo por risco operacional. A nova decisão aceita apenas uma variação controlada: visualização auditada, temporária e somente leitura.

## Decisão

Implementar **Visualizar como usuário** com estas restrições:

- endpoints Admin privados separados para paciente e psicólogo;
- motivo obrigatório;
- sessão de usuário final real persistida em `user_token`;
- `device_id` com prefixo `admin_view_as:`;
- JWT com TTL curto de 30 minutos;
- abertura registrada em `admin_activity_log`;
- auditoria sem JWT, senha, hash, código ou segredo;
- bloqueio backend para métodos não seguros quando o bearer token tiver `device_id` `admin_view_as:*`;
- frontend do usuário com banner global de **modo somente leitura** e saída para o Admin;
- frontend sem toast vermelho redundante para o erro esperado `admin_view_as_read_only`, porque o banner global já comunica o bloqueio de escrita;
- analytics/location/PWA desativados durante a visualização administrativa.

## Consequências

- O Admin consegue enxergar o app real com permissões e dados do usuário final, sem mocks.
- Fluxos de escrita permanecem protegidos no backend mesmo que algum botão continue visível na UI do usuário.
- `user_token` pode conter sessões temporárias de visualização, mas elas são excluídas do contador normal de sessões ativas exibido na aba **Conta**.
- A ação entra no feed de atividades administrativas de paciente/psicólogo como evento de conta e acesso.
- Não há migration, schema novo, package novo, hard delete, seed ou endpoint simulado.

## Segurança e privacidade

- O JWT viaja para `/auth/admin-view-as` no hash da URL, evitando envio no request HTTP inicial.
- A sessão é curta e marcada por `device_id` especial.
- `_auth` e `optionalAuth` bloqueiam `POST`, `PUT`, `PATCH` e `DELETE`.
- Não registrar token em `admin_activity_log`, logs ou toasts.
- A visualização de contas suspensas, desativadas ou excluídas é bloqueada.

## Referências visuais

- Capturas do usuário de `/pacientes/[id]` e `/psicologos/[id]`.
- `_product/proto/admin/Pacientes/Pacientes - Detalhes.png`.
- `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Geral.png`.

Builder/Quick Copy não estava disponível como ferramenta callable no ambiente; usamos imagens locais/capturas e registramos a limitação.
