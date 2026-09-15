# ADR-0218: Perfis demonstrativos de psicólogos com vídeos anexados

## Status

Accepted

## Contexto

O usuário solicitou a criação de perfis completos de psicólogos de exemplo usando cinco vídeos locais anexados como vídeo de apresentação. A base já possui descoberta pública de psicólogos, vídeo de apresentação em `psychologist_profile.video_url`, catálogo de especialidades/serviços/abordagens, avaliações, posts de comunidade e assinatura/cortesia profissional.

Não havia uma task dedicada em `_product/tasks` para esta operação pontual de dados. A execução foi tratada como carga operacional de desenvolvimento, sem alterar schema, contratos ou UI.

## Decisão

- Criar/atualizar cinco perfis demonstrativos no banco de desenvolvimento com IDs e e-mails determinísticos `*.demo@lectum.local`.
- Enviar os cinco vídeos anexados para o storage público real configurado no backend, usando o namespace existente `psychologist/video/` e URLs servidas por `/public/files/psychologist/video/...`.
- Preencher os perfis com campos públicos completos para descoberta: headline, bio, vídeo, CPF/CRP demonstrativos, data de nascimento, data de inscrição CRP demonstrativa, modalidade, público-alvo, cidade/UF, formação, dias disponíveis, WhatsApp demonstrativo, idiomas, especialidades, serviços e abordagens.
- Criar avaliações e um post público de comunidade por perfil para validar a página pública além do card de listagem.
- Usar assinatura `admin_grant` ativa no plano profissional para habilitar a experiência pública verificada sem registrar validação CFP real. Por isso, `cfp_verified_at` permanece `null` e as notas da concessão deixam explícito que os documentos são demonstrativos.
- Não criar endpoint fake nem mock permanente de API. A operação foi feita diretamente em banco/storage de desenvolvimento com os modelos reais existentes.

## Consequências

- Os perfis aparecem em `/psychologists` e em `/psychologists/:id` com vídeo, avaliações, posts e selo operacional via cortesia.
- Os dados de CPF/CRP/telefone são demonstrativos e não devem ser usados como verificação profissional real.
- Antes de levar perfis semelhantes para produção, é necessário confirmar autorização de uso de imagem/vídeo e substituir dados demonstrativos por dados reais validados.
- Como não houve mudança de schema ou código de produto, não há migration nova nem package novo.

## Validação

- `pnpm --dir backend db:migrate` retornou banco em sincronia.
- Upload dos cinco vídeos anexados para `/public/files/psychologist/video/*.mp4` concluído com sucesso.
- `HEAD http://localhost:3001/public/files/psychologist/video/<arquivo>.mp4` retornou `200 video/mp4` para os cinco vídeos.
- `GET http://localhost:3001/api/private/directory/psychologists?limit=20` retornou os 5 perfis `demo-psychologist-*`.
- `GET http://localhost:3001/api/private/directory/psychologists/demo-psychologist-thais-bruni` retornou perfil completo com `verified=true`, `rating_count=3` e `whatsapp_available=true`.
- `GET http://localhost:3001/api/private/directory/psychologists/demo-psychologist-thais-bruni/reviews?limit=10` retornou 3 avaliações.
- `GET http://localhost:3001/api/private/directory/psychologists/demo-psychologist-thais-bruni/posts?limit=10` retornou 1 post.
- `GET http://localhost:3000/psychologists` retornou 200.
- `GET http://localhost:3000/psychologists/demo-psychologist-thais-bruni` retornou 200.
