# ADR-0733 - Google Analytics com consentimento separado

Data: 2026-11-25
Status: Aceito localmente; ativacao produtiva pendente.

## Contexto

A propriedade GA4 existe, mas o site nao possui integracao Google. O consentimento Meta atual cita apenas Meta. Reutiliza-lo autorizaria um novo destinatario sem escolha explicita.

## Decisao

Adicionar escolha Google independente no painel existente, persistida apenas no navegador por 90 dias. Nenhum carregamento antes de consentimento; nenhum evento retroativo. Capturar escopo antes de cada acao e conferir novamente apos respostas assincronas. Hosts de homologacao e localhost nao coletam. Variaveis opcionais exigem ID valido e ENABLED=true; ausencia desliga.

Enviar apenas eventos permitidos e account_type no cadastro. Suprimir page_view automatico e substituir localizacao, titulo e referrer por valores publicos fixos; somente click IDs validos sao preservados no config inicial. Proibir user_id, matching, conteudo e temas das comunidades. Desligar enhanced measurement no GA4 antes da ativacao: a configuracao remota nao e controlada pelo codigo.

Cadastro OAuth transporta flag de conta recem-criada no token de troca de uso unico. Login existente nao conta. Assinatura usa endpoint autenticado de leitura que verifica operacao do titular, evidencia de primeira assinatura, recibo financeiro pago imutavel e webhook completo. Nenhuma alteracao no fluxo de pagamento, esquema ou entrega Meta. Frontend exige consentimento anterior ao checkout e confirmacao posterior ao inicio; consulta limitada e falhas nao bloqueiam produto.

## Consequencias

Visitas SPA nao geram contagem por rota; privacidade tem prioridade sobre detalhamento de paginas. Dedupe de eventos e em memoria por documento, e comprovante pendente e removido apos enfileirar assinatura; entrega por SDK nao e comprovacao de recebimento pelo Google. Checkout/cadastro concluidos em outro navegador podem nao ser atribuidos. Repeticao apos reload requer validacao de negocio antes de ampliar persistencia. Sem pacotes adicionais.

## Validacao e rollout

Ver TASK-369 para evidencias e gates. Testes de portas de navegador validam politica local, nao substituem teste de fluxos reais. Publicacao exige checks/builds, verificacao local e aprovacao conforme AGENTS.md. Nenhum push/deploy automatico.

Referencias: https://developers.google.com/tag-platform/security/guides/consent e https://developers.google.com/analytics/devguides/collection/ga4/reference/config
