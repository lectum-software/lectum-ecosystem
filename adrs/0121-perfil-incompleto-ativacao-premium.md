# ADR 0121: Experiência premium para perfil profissional incompleto

Data: 2026-06-18

## Status

Aceito

## Contexto

O perfil público do psicólogo podia aparecer apenas como erro técnico quando ainda não estava disponível para visualização. Isso dificultava entender quais informações impediam a publicação do perfil e deixava a jornada de configuração menos orientativa.

Também havia uma decisão recente de produto: a Bio e o texto de apresentação não devem ser obrigatórios para publicação, o vídeo de apresentação passa a ser obrigatório e o idioma Português, já selecionado por padrão, deve ser suficiente mesmo quando o registro antigo ainda não tem idioma persistido.

## Decisão

- A resposta privada de `free-profile` passa a expor um bloco `activation` com:
  - `active`: indica se o perfil está publicável/visível.
  - `pending_fields`: lista dinâmica de pendências com nomes visíveis ao usuário.
- A tela **Editar perfil** usa esse estado para exibir uma faixa premium de “Perfil não ativo” logo abaixo do header.
- O menu principal de **Perfil** usa o mesmo estado para exibir um alerta discreto na linha “Editar perfil”.
- A página pública `/app/psychologist/[id]`, quando acessada pelo próprio psicólogo autenticado, consulta o perfil privado se a consulta pública falhar e mostra um card premium com a lista de pendências e CTAs para completar o perfil ou voltar ao menu.
- Para usuários que não são donos do perfil, perfis inexistentes ou indisponíveis continuam tratados como indisponíveis/não encontrados, evitando expor informações internas de perfis não publicados.
- A listagem e o detalhe público de psicólogos passam a considerar requisitos mínimos de publicação além de `published` e vídeo, incluindo dados profissionais básicos e relações ativas de especialidade, serviço e abordagem. O detalhe público também valida público atendido em memória para cobrir registros antigos.
- Idiomas vazios são normalizados como `Português` nas respostas de perfil privado e público, pois esse é o padrão visível do formulário.

## Consequências

- A experiência deixa de parecer erro técnico para o dono do perfil e passa a orientar a ativação.
- A lista de pendências usa nomes de UI, evitando nomes internos como `headline` ou `profile_status`.
- Bio (`headline`) e Apresentação de texto (`bio`) permanecem opcionais para publicação.
- Perfis antigos que já estavam marcados como publicados, mas não têm requisitos mínimos, deixam de aparecer no detalhe público até serem completados.
- A validação de publicação e os estados de UI passam a compartilhar a mesma intenção de domínio, ainda que o backend público preserve a privacidade para visitantes que não são donos do perfil.

## Ajuste em 2026-06-18

A lista pública de pendências deixa de incluir a chave de publicação/visibilidade. Ela deve mostrar apenas campos do perfil que o psicólogo precisa preencher ou editar, evitando confundir um controle de publicação com dado obrigatório.
