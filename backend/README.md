# Lectum Backend

## Inicialização e manutenção de mídia

O start do container aplica somente as migrations Prisma configuradas e inicia a API e seus
schedulers de produto. Não inventaria nem migra vídeos. `R2_TO_STREAM_STARTUP_MIGRATION`
foi removida: configurações antigas dessa chave não têm efeito.

**Vídeos novos → Cloudflare Stream. Imagens → R2.** Falha no Stream não autoriza fallback para R2.
Vídeos legados continuam legíveis, respeitando a mesma visibilidade, até a migração manual.
Arquivos temporários de FFmpeg ficam no volume do serviço de vídeo, não no R2.

### Inventário manual no container do backend de homologação

Use o terminal do container correto no Dokploy, não o host nem o serviço de vídeo.
Não é necessário instalar/reinstalar pnpm dentro da imagem:

```bash
cd /app
node --enable-source-maps dist/operations/video-assets/migrate-r2-to-stream.js --dry-run --purpose=all --limit=50
```

O inventário cobre os vídeos associados a perfis, posts e respostas ativos no banco. Não é uma
varredura de objetos órfãos do bucket. Se `candidates_in_batch=0`, não há candidatos nessas consultas;
isso não significa que o bucket não contenha objetos antigos. Não exclua o bucket nem suas imagens.

Somente se houver candidatos elegíveis e após revisar o dry-run, executar um lote pequeno:

```bash
node --enable-source-maps dist/operations/video-assets/migrate-r2-to-stream.js --apply --confirm=homolog --purpose=all --limit=5
```

- O apply cria/importa ativos Stream e utiliza a capacidade contratada; não execute sem necessidade.
- Lock impede apply concorrente. A associação só é substituída quando o Stream estiver pronto.
- R2, capas e objetos de origem não são apagados. Não precisa de reset nem nova migration de banco.
- Reexecute dry-run após cada lote. `processing` requer aguardar e repetir; `failed` requer analisar
  o motivo controlado. Não use loops ilimitados se o mesmo item continuar falhando.
- Saída do processo: 0 sem falhas/pendências do lote, 1 com falhas, 2 com processamento/itens pulados.
- Compare a versão com `/ping` e valide reprodução pública e privada no app depois do lote.
- Ver zero candidatos não substitui os testes de upload e reprodução da TASK-179.

## Reset total do ambiente de desenvolvimento

Use somente em ambiente de desenvolvimento/sandbox. O comando limpa os recursos reais do ambiente
local e, por fim, recria o banco reaplicando as migrations Prisma:

1. cancela assinaturas sandbox do Mercado Pago vinculadas ao ambiente Lectum;
2. remove arquivos publicados no bucket Cloudflare R2 configurado;
3. executa `prisma migrate reset --force`, apagando os dados locais e reaplicando as migrations.

```bash
pnpm --dir backend reset
```

O alias legado também funciona:

```bash
pnpm --dir backend db:reset
```

O script mostra os alvos e exige digitar `RESET`. Para automações locais/descartáveis:

```bash
pnpm --dir backend reset -- --force
```

Para conferir alvos e contagens sem apagar nada:

```bash
pnpm --dir backend reset -- --dry-run
```

Configurações obrigatórias em `backend/.env`:

- `DATABASE_URL` apontando para banco local/privado de desenvolvimento;
- `CLOUDFLARE_R2_ENDPOINT`, `CLOUDFLARE_R2_ACCESS_KEY_ID`,
  `CLOUDFLARE_R2_ACCESS_KEY_SECRET`, `CLOUDFLARE_R2_PUBLIC_BUCKET_NAME`;
- `MERCADO_PAGO_ENV=sandbox` e `MERCADO_PAGO_ACCESS_TOKEN=APP_USR-...` da aplicação criada dentro
  de uma conta Mercado Pago vendedora de teste.

As validações de segurança continuam ativas mesmo com `--force`: `NODE_ENV=production/prod`, URLs
que pareçam produção, bancos não locais/remotos, bucket R2 com nome de produção e conta Mercado
Pago sem a marca `test_user` são bloqueados por padrão.

## Docker do backend

O Dockerfile do backend deve ser buildado usando `backend/` como contexto, mantendo frontend/admin como apps separadas:

```bash
docker build -t lectum-backend ./backend
```

A imagem usa `PORT=3001` apenas como padrão. Para homologação/produção, configure `PORT` nas envs do runtime da aplicação; se a plataforma depender do metadata `EXPOSE`, passe também `--build-arg PORT=<porta>` no build.

Ao iniciar, o container executa `prisma migrate deploy` antes de subir a API. Esse comportamento é controlado por `RUN_DB_MIGRATIONS` e vem ativo por padrão; defina `RUN_DB_MIGRATIONS=false` apenas se o deploy já executar as migrations em um job/comando separado. Como o projeto usa Prisma 7 com `datasource.url` em `prisma.config.ts`, esse arquivo também é copiado para a imagem final.

O build usa uma `DATABASE_URL` dummy apenas para `prisma generate`; a imagem de produção exige as envs reais em runtime, principalmente:

- `DATABASE_URL`
- `RUN_DB_MIGRATIONS`
- `JWT_SECRET_KEY`
- `ADMIN_JWT_SECRET`
- `PORT`
- `BASE`
- `WEB_URL`
- `GOOGLE_CLIENT_ID_API_USER`
- `GOOGLE_CLIENT_SECRET_API_USER`
- `CALLBACK_URL_API_USER`

Exemplo de smoke local sem acessar banco nas rotas de health:

```bash
docker run --rm -p 3001:3001 \
  -e PORT=3001 \
  -e RUN_DB_MIGRATIONS=false \
  -e DATABASE_URL="postgresql://postgres:postgres@host.docker.internal:5432/lectum" \
  -e JWT_SECRET_KEY="change-me-with-a-strong-32-characters-minimum-secret" \
  -e ADMIN_JWT_SECRET="change-me-with-a-different-strong-admin-secret" \
  -e BASE="http://localhost:3001" \
  -e WEB_URL="http://localhost:3000" \
  -e GOOGLE_CLIENT_ID_API_USER="docker-smoke-client-id" \
  -e GOOGLE_CLIENT_SECRET_API_USER="docker-smoke-client-secret" \
  -e CALLBACK_URL_API_USER="http://localhost:3000/auth/redirect" \
  lectum-backend
```

Por segurança, a documentação da API nunca é exposta em homologação, staging ou produção,
mesmo com `SWAGGER=true`. Gere e inspecione o artefato apenas em ambiente local descartável;
ele usa servidor relativo e não incorpora URLs configuradas no deploy.
