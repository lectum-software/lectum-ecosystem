# ADR 0207 - Proxy de arquivos públicos no túnel de desenvolvimento

- **Status:** Accepted
- **Data:** 2026-07-04

## Task relacionada

TASK-18A

## Contexto

O fluxo local com `pnpm dev` pode expor frontend e backend pelo mesmo hostname ngrok usando o proxy de desenvolvimento em `scripts/dev.mjs`. O vídeo de apresentação do perfil profissional é persistido como URL pública em `/public/files/psychologist/video/*`, servida pelo backend a partir do R2 público.

Antes desta decisão, o proxy encaminhava `/api`, `/socket.io`, `/docs` e `/swagger` para o backend, mas deixava `/public/files/*` cair no frontend. Com `BASE` apontando para o hostname público do túnel, a URL do vídeo existia no banco, porém a requisição ao arquivo retornava `404` no proxy e o player ficava preto/sem duração.

## Decisão

O proxy local passa a encaminhar `/public/files/*` e `/files/*` para o backend, mantendo as demais rotas de aplicação no frontend.

## Consequências

- Vídeos, capas e demais mídias públicas servidas por `backend/src/config/multer/filesRoute.ts` funcionam no mesmo hostname do túnel.
- O comportamento fica consistente com as URLs absolutas geradas pelo backend via `BASE`.
- Rotas privadas de arquivo em `/files/*` também passam pelo backend quando usadas no ambiente local.
- É necessário reiniciar o processo `pnpm dev` para o proxy em execução carregar a alteração.

## Validação

- HEAD no túnel antes da correção retornava `404` para `/public/files/psychologist/video/*`.
- HEAD direto no backend local retornava `200` com `Content-Type: video/mp4` para o mesmo arquivo.
- `node --check scripts/dev.mjs`.
- `pnpm check`.
- Após reiniciar `pnpm dev`, HEAD em `http://localhost:3005/public/files/psychologist/video/*` e no hostname ngrok retornou `200`, `Content-Type: video/mp4` e `Accept-Ranges: bytes`.
- Range GET no hostname ngrok retornou `206 PartialContent` com `Content-Range`.
- Chrome/CDP headless validou carregamento de metadados do vídeo via proxy local (`duration=294.5`, `videoWidth=576`, `videoHeight=1024`).

## Pendências

- Sem pendências externas.
