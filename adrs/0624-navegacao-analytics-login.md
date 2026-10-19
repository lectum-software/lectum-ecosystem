# ADR-0624 - Navegacao de upgrade e Analytics gratuito

Status: Accepted

## Contexto

Checkout possui multiplas origens. Preview gratuito descartava o video junto com os indicadores; o periodo personalizado focava uma data automaticamente e podia transbordar no iOS. Login tratava ausencia de assinatura vigente como ausencia de escolha anterior, enviando contas existentes novamente para planos.

## Decisao

- Reutilizar navigateBackWithFallback no checkout: retornar pelo historico sem atravessar a fronteira de autenticacao; entrada direta usa Minha Assinatura.
- Resposta preview inclui somente video_url/video_cover_url do perfil autenticado nao excluido. Metricas continuam inacessiveis no backend. Componente separa media de dados estatisticos. Campo opcional tolera API antiga durante rollout.
- Modal compartilhada com foco inicial no titulo, Escape, backdrop e restauracao de foco. Formulario RHF/Zod remonta a cada abertura e so aplica intervalo valido; remove autofocus da data e limita dimensoes intrinsecas.
- loginInclude informa a contagem de assinaturas nao excluidas, independentemente da vigencia. Onboarding usa esse historico apenas para reconhecer escolha de plano ja realizada. Filtros de entitlement e acesso pago permanecem intactos. Contas novas sem historico continuam selecionando plano. Login por senha e troca Google usam o mesmo repositorio.
- Guard de sessao ja autenticada usa o mesmo resolvedor e fallback /psicologos do login, sem injetar retorno explicito para /, evitando destinos concorrentes durante a chegada do cookie.

## Rollout

Contrato aditivo, sem migration/configuracao/pacotes. Publicar backend antes do frontend para disponibilizar metadata de video e historico. Frontend antigo ignora campos novos; novo frontend tolera sua ausencia. Nenhuma cobranca ou envio externo no QA local. Sem push/deploy neste lote.
