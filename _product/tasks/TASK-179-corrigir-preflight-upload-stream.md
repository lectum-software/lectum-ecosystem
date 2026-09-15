# TASK-179 — Restaurar preflight e provisionamento de upload Stream

| Campo | Valor |
|---|---|
| Status | Completed |
Dependências: TASK-163, TASK-173, TASK-178 e ADR-0497.

## Problema e evidência

Em 14/09/2026, backend e frontend de homologação respondem 0.1.377.
O frontend envia `X-Lectum-Video-Upload-Methods: basic,tus`, introduzido no
commit `fb4df718`, mas o CORS do backend não autoriza esse cabeçalho.
OPTIONS real em `/api/private/video-assets/uploads` responde 204 sem o cabeçalho
na allowlist. Portanto, 204 não significa que o navegador autoriza o POST.
O contrato compartilhado afeta apresentação, publicações e respostas.

## Escopo e segurança

- Acrescentar apenas o header de negociação ao CORS existente, sem wildcard,
  alteração de origens, autenticação, propriedade ou acesso aos vídeos.
- Exercitar preflight HTTP real com o middleware usado pela aplicação.
- Reproduzir no browser e validar após deploy, usando a conta da auditoria.
- Revisar alterações recentes de Stream sem reset, migração ou limpeza de mídia.
- Nenhuma mudança visual, package, migration ou env nova. Backend primeiro;
  frontend atual e clientes antigos continuam compatíveis.
- Rollback de código reintroduz o bloqueio; não altera dados persistidos.

## Aceite

- [x] Regressão reproduzida no preflight publicado e vinculada ao commit.
- [x] Preflight permite a negociação e mantém origens/headers não autorizados bloqueados em teste HTTP local.
- [x] Checks e build do backend aprovados, sem mocks de Cloudflare como evidência de upload.
- [x] Contrato de URL admite os dois hosts de ingestão com HTTPS, sem aceitar hosts arbitrários, credenciais, portas alternativas ou fragmentos.
- [x] Falhas de contrato têm motivo controlado, sem URL/token/payload; resposta 2xx ambígua não dispara uma segunda reserva TUS.
- [x] Serialização TUS preserva os domínios configurados sem caracteres JSON; testes puros cobrem apresentação, posts e respostas, sem alterar assinatura, duração ou expiração.
- [x] Novo upload TUS tem origens corretas confirmadas na API real do Stream.
- [x] Upload real validado no browser após deploy de homologação.
- [x] ADR, versão sincronizada, commit/push e smoke registrados.

## Evidências

`cors.test.ts`: cinco testes usam Express/CORS e conexão HTTP real em loopback,
sem subir bootstrap, acessar banco, simular Cloudflare ou criar vídeo.
`/ready` saudável valida configuração local e banco, não prova que o provider
aceita uma reserva nem que o browser envia o arquivo.

Validação local: backend check (764 testes aprovados), TypeScript/Prisma/Biome e build aprovados.
Teste de regressão: a política anterior falha em 2 de 5 testes; a corrigida passa nos 5.
Browser homolog 0.1.377, conta de auditoria: MP4 vertical de 3s/743469 bytes
falha imediatamente com “Não foi possível conectar ao serviço.”, antes do deploy.

Check global `pnpm check`: aprovado em 14/09/2026; 6 skips preexistentes no video
relacionados ao FFmpeg local. Nenhum skip no backend. Foram restaurados somente
os comentários ESLint justificados de recarga de sessão (frontend/Admin), removidos
pelos commits recentes; comportamento de autenticação permanece intacto.

## Segunda falha — provisionamento (14/09)

Commit `9c3283e7` / 0.1.378 publicado: backend/frontend/Admin confirmados; health/ready
200, OPTIONS permite o header novo e mantém origem não autorizada bloqueada.
O upload real ainda falhou com arquivos de 743469 e 237103021 bytes. Logs fornecidos
pelo operador mostram HTTP 200 no POST básico e 201 no TUS, ambos rejeitados como
`*_contract`. Portanto, não é evidência de limite de tamanho ou credencial ausente.

O adapter só permitia `upload.videodelivery.net`. A documentação oficial inclui
também a família `cloudflarestream.com` para upload; a correção admite exatamente
`upload.cloudflarestream.com`, não subdomínios arbitrários/playback. A CSP existente
já permite esse destino e não foi ampliada. O endpoint efetivamente devolvido em
homolog ainda precisa ser confirmado pelo diagnóstico seguro solicitado ao operador
ou pelo upload real após deploy; não declarar causa final apenas pelo teste unitário.

Os sete novos testes exercitam funções reais de URL/erro/fallback, sem simular API
Cloudflare. Protegem também contra lookalikes, localhost, controles, credenciais,
portas não padrão e fragmentos. A URL assinada permanece opaca e não é reconstruída.
Fallback do básico para TUS só após rejeição HTTP explícita 400/404/405/415/422;
timeout, 5xx, 2xx inválido ou erro inesperado encerram a tentativa para evitar reservar
duas vezes o mesmo ativo. Logs passam a distinguir motivos fechados de contrato.
Nenhuma reserva remota anterior é apagada ou migrada por esta correção.

Validação local complementar: backend check com 771 testes aprovados, zero skips/falhas;
Prisma/TypeScript/Biome e build aprovados. O teste de URL falha ao restaurar apenas
a allowlist antiga e os sete testes passam com os dois destinos. Deploy e upload
reais da correção complementar ainda precisam de confirmação.

## Terceira falha — origens TUS (14/09)

Operador forneceu diagnóstico somente leitura do backend de homologação: webhook
responde 200/success, URL e segredo conferem. Consulta dos cinco vídeos recentes
também responde 200/success; todos exigem assinatura e pertencem ao customer
configurado, mas todos têm origens divergentes contendo caracteres de JSON.
Dois já estão prontos; os demais não apresentam erro de processamento nesse instante.
Isso não prova conclusão dos três restantes nem valida todas as credenciais.

O caminho TUS enviava Base64 de `JSON.stringify(allowedOrigins)`. A evidência remota
é consistente com aspas/colchetes sendo tratados como parte dos domínios. Corrigido
para Base64 dos domínios separados por vírgula. O POST básico e importação por URL
continuam enviando array JSON no corpo, onde esse formato é correto. A leitura da
env continua com URLs separadas por vírgula, normalizadas pelo parser existente.

Cinco testes puros usam o serializador real sem provider: quatro falham com JSON,
cinco passam com a correção. A expectativa antiga do teste de adapter também foi
corrigida; esse teste isolado não é prova de funcionamento do provider.

Impacto: somente novos provisionamentos TUS, sem migration, package ou env nova.
Clientes antigos permanecem compatíveis. Sem mudança em autenticação, acesso
anônimo previsto no produto, assinaturas, limite de bytes, duração ou processamento.
Os vídeos já criados com metadados incorretos NÃO são reparados por esse patch:
exigem correção manual controlada, nunca startup, exclusão, wildcard ou novo upload
em massa. Não retirar as restrições de origem para contornar o incidente.

Naquele momento, as envs de Dokploy/Vercel ainda não haviam sido atualizadas pelo operador. Separar esse
trabalho da serialização: não trocar chaves válidas nem culpar limites de arquivo
por esse diagnóstico. Rollback de código volta a gravar origens incorretas em novos
uploads; metadados remotos já persistidos não mudam em nenhum dos sentidos.

Validação local desse complemento: `pnpm --dir backend check` com 784 testes
aprovados, zero falhas/skips, Prisma/TypeScript/Biome aprovados; build do backend
aprovado. `pnpm check` global aprovado, mantendo seis skips preexistentes de FFmpeg
local no serviço de vídeo. Nenhuma alteração de UI, schema ou dependência.
Até essa etapa, deploy e roundtrip real aguardavam confirmação; os testes locais
isolados não foram usados para marcar o E2E como concluído.

## Fechamento — upload e roundtrip reais em homologação (14/09/2026)

Correção funcional publicada no commit `7ff4b60a`, versão **0.1.381**, com push
em homolog. O operador atualizou backend, video e frontend e confirmou o Admin
com valores já corretos. A conexão backend → video retornou autenticação válida,
readiness `ready`, versão 0.1.381 e transporte privado. Isso não é teste de um job
de transformação: o upload direto ao Stream não usa a fila FFmpeg/BullMQ.

Teste no navegador conectado, aproximadamente 18h18–18h28 (Brasília), na conta
profissional da auditoria. O usuário autorizou explicitamente os dois envios e
a substituição do vídeo anterior. Arquivos técnicos H.264/AAC gerados localmente
com FFmpeg foram enviados ao provider real, sem mocks de API.

| Arquivo | Envio/processamento | Reprodução | Persistência após reload |
|---|---|---|---|
| 745.086 bytes, 3 segundos | Concluído | Até o fim, sem MediaError | Reproduzido novamente até o fim |
| 239.480.318 bytes, 40 segundos | Concluído, acima do limite do transporte básico | Até o fim: 40,042665s, `ended=true`, sem MediaError | Reproduzido por mais 11s e pausado |

O player usou Cloudflare Stream, não uma prévia `blob:` nem o backend como origem
dos bytes. Não houve erro de upload visível nas observações; o console capturado
não registrou erros. Não se trata de captura integral da rede/logs remotos. O
vídeo grande ficou na conta de auditoria; o formulário geral do perfil não foi
salvo e nenhuma informação de identidade foi alterada.

O operador executou o diagnóstico somente leitura no container do backend.
Uma consulta GET encontrou exatamente o novo vídeo grande, pelo tamanho e janela
de criação do teste, e devolveu:

```json
{
  "diagnostic": "read_ok",
  "matchingTestVideos": 1,
  "sizeBytes": 239480318,
  "durationSeconds": 40,
  "ready": true,
  "processingError": false,
  "signed": true,
  "originsMatch": true,
  "originsContainJsonCharacters": false
}
```

Essa leitura fecha o aceite do roundtrip das origens TUS e da assinatura
obrigatória; não foi inferida apenas do playback. Nenhum segredo, UID ou URL
assinada foi incluído no resultado registrado.

Smoke por curl após os uploads: backend `/ping`, `/health` e `/ready` HTTP 200;
frontend/Admin `/version` HTTP 200, todos 0.1.381. Python urllib recebeu 403 no
backend enquanto curl e o aplicativo funcionaram; a diferença de cliente foi
registrada, sem atribuir causa não verificada ou classificá-la como indisponibilidade.

Fechamento documental: apenas task/índice/ADR e incremento sincronizado de versão;
sem mudança funcional, migration, package, env nova, reset ou reparação em massa.
Os checks/builds da correção funcional estão registrados acima; o novo commit
também passa pelos guards e checks de commit/push do repositório.

Limites deste aceite: não cobre aparelhos iPhone/Android reais, todos os fluxos
de posts/respostas, jobs de transformação nem reparação de vídeos antigos. A
correção dos metadados legados continua sendo operação manual escopada, precedida
de inventário, nunca parte do start. Não declarar a auditoria geral concluída
com base neste smoke de upload de apresentação.
