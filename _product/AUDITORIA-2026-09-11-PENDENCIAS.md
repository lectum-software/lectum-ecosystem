# Auditoria — fila de achados e decisões

Não é aprovação para produção. “Fonte” significa mecanismo identificado no código,
não exploração ou incidente observado no ambiente publicado. A lista de correções
já realizadas permanece em [Acompanhamento](AUDITORIA-2026-09-10.md).

## Admin

| ID | Pendência | Evidência / estado |
|---|---|---|
| A342-01 | Upload de avatar pode apagar texto ainda não salvo da comunidade. | Fonte; validar ciclo RHF/refetch e corrigir. |
| A342-02 | Reordenação de regras não possui alternativa por teclado. | Fonte; corrigir mantendo persistência e bloqueios. |
| A342-03 | Editar data incompleta removia os próprios filtros. | Corrigido344; repetido no Admin publicado. |
| A342-04 | Busca perde foco após atualizar a URL. | Corrigido345; foco e continuação da digitação repetidos nas duas listas publicadas. |
| A342-05 | Expansor de campo profissional e setas de publicações sem nome acessível. | Fonte; corrigir e conferir teclado/SSR. |
| A342-06 | Contador de cliques de Posts inclui cliques das Respostas. | Fonte; separar universos. |
| A342-07 | Cores de donut e legenda divergem quando há categorias zeradas. | Fonte; manter cor estável por categoria. |
| A342-08 | Menu mobile permite Tab para conteúdo atrás do modal. | Reproduzido no Admin344: Tab atravessa o menu e alcança a busca atrás do overlay. Correção346 em curso. |
| A342-09 | Métrica agrupada herda detalhes apenas da primeira origem. | Fonte; agregar detalhes coerentemente com o total. |

## Backend

| ID | Pendência | Evidência / estado |
|---|---|---|
| C17-A | Confirmação não aplica toda a compatibilidade/inequivocidade documentada. | Fonte; P2 proposto. Definir desambiguação antes de criar bloqueio mais amplo. Não é KYC/IDOR comprovado. |
| C17-B | Confirmação por outro caminho pode substituir CPF/CRP protegido. | Fonte; P2 proposto. Preservar trava transacional e idempotência sem revogar aprovações existentes. |
| C20 | Normalização estrutural deve evitar acesso a propriedades herdadas. | Fonte; impacto HTTP não comprovado. Nenhum teste/receita de exploração executado. Restrições operacionais anteriores permanecem. |
| C9/C10 | Decisões concorrentes de moderação podem reutilizar contador/snapshot antigo. | Fonte; planejar escrita atômica e coerência da auditoria, sem remover conteúdo real para testar. |
| C12 | Edição parcial pode regravar campos omitidos a partir de snapshot antigo. | Fonte; persistir apenas mudanças pretendidas e validar concorrência. |
| C13 | Campo chamado cpf_masked retornava todos os dígitos. | Corrigido345 com máscara compartilhada; contratos/build aprovados. Endpoint administrativo; nenhum vazamento público demonstrado. |
| C15 | Numerador e denominador de taxa de ação usam conjuntos diferentes de sessões. | Fonte; uniformizar universo, não apenas limitar percentual. |
| C4 | Zero eventos no período pode virar contagem acumulada de comentários/salvamentos. | Fonte; confirmar semântica e usar fallback coerente. |
| C5 | Atividade pode incluir publicações anteriores ao intervalo. | Fonte; separar histórico de tráfego e atividade do período. |
| C6 | Views por conteúdo podem incluir visitas ao perfil. | Fonte; filtrar pelo alvo correto preservando atribuição histórica. |
| C18 | Limite de consultas CFP não reserva a tentativa antes do efeito externo. | Fonte; tratar concorrência sem chamadas pagas de teste. |
| C16 | Despublicação de perfil impede remover a própria relação de follow. | Fonte; separar criar vínculo de remover vínculo próprio. |
| C24 | Data de registro de hoje pode ser recusada pela manhã. | Fonte; comparar datas civis no fuso contratado, não horário artificial. |

## Hipóteses que exigem rastreio antes de mudar regras

- Universo histórico de membros, origem de tráfego, coortes e scores (C1/C2/C7/C8/C11).
- Fuso horário de gráficos (C3), precedência de evidência manual (C14), confirmação legada de telefone (C19).
- Validação genérica de CPF e limites zero/falsy (C21/C22): provar consumidor ativo.
- Métricas de mentoria e filtros de eventos próprios no ranking (C23/C25).
- Sucesso parcial de mutations encadeadas, idiomas, fallback de slices e listas administrativas.

### Decisões CFP ainda necessárias

Responsável confirmou em11/09/2026: o selo indica registro ativo aprovado, sem promessa de
comprovar identidade do titular. Não introduzir KYC nesta auditoria. Definir desambiguação
de múltiplos registros, garantia dos filtros do provider
e precedência de reconfirmação frente à decisão humana. Nome editável não comprova identidade.
Não é necessário introduzir KYC para corrigir a sobrescrita de campos já protegidos (C17-B).

## Decisões documentais a reconciliar com o código atual

ADRs não são prova de incidente. Lote B completo (224 arquivos) apontou:

| Tema | Decisão/evidência ainda necessária |
|---|---|
| Aprovação profissional | Precedência de rejeição humana, evidência CFP anterior e cortesia (ADR0251/0436; C17). |
| Visualizar como | Confirmar que leituras reparadoras não alteram negócio sob a promessa read-only (ADR0405/0460). |
| Privacidade | Prazos/acessos/descarte de snapshots de moderação e analytics vinculáveis, com decisão aprovada (ADR0270/0325). |
| Cobrança | Política para preços legados e significado de desativar a régua frente à graça temporal (ADR0406/0459). |
| Métricas | Distinguir zero observado, medição ausente e posição desconhecida; preservar ressalvas de atribuição (ADR0397/0402/0385). |
| Operação | Confirmar limites de réplicas/schedulers, vídeo maior que200MB e QA real; histórico não prova deploy atual (ADR0418/0495). |
| Notificações | Reconciliar preferências/consentimento e significado de sent com os fluxos atuais (ADR0304/0450). |

Atualizar o template de ADR para incluir o quarto app de vídeo; registrar complemento ao
ADR0441 sem apagar sua decisão histórica. Padrão atual: cinco manifests, quatro aplicações.

Outras tensões documentais do lote A (225 arquivos): política de exposição do telefone no
link wa.me; identidade/pseudônimo por canal de notificação; retirada de conteúdo sensível
após exclusão da conta; finalidade/retenção e associação de analytics em dispositivo
compartilhado; DTOs administrativos com campos invisíveis; contrato legado de nascimento.
Fontes principais: ADR0022/0147,0098,0113/0141,0229,0240,0217. Necessário rastrear código
atual antes de classificar como bug. Permissões e valores históricos não comprovam estado atual.

## Dependências de conclusão

- Documentos legais aprovados e links acessíveis no cadastro.
- Completar leitura dos arquivos restantes e fluxos funcionais ainda não executados.
- Testes Safari/iOS/Android reais e integrações autorizadas de pagamento, identidade e vídeo.
- Rotacionar credenciais de auditoria ao final; não copiar senhas ou tokens para estes documentos.

Fontes e rastreio: relatórios laterais e hashes citados em
[Evidências](AUDITORIA-2026-09-10-EVIDENCIAS.md) e
[Leituras](AUDITORIA-2026-09-11-LEITURAS.tsv). Prioridades podem mudar após reprodução.

## Suporte frontend — leitura345 integrada346

FS345-01: READMEfrontend ainda template, sem fluxo pnpm/homolog/promoção; corrigir em escopo
documental. FS345-G01/G02: regex de fonte e doubles de plataforma não certificam Browser,
Next/PWA/gesto/cookies; manter cobertura funcional separada. FS345-H01: SVGs inline grandes
(sem medidaLCP/consumo, não bug de performance confirmado). FS345-Q01: catálogo cidades
sem origem editorial no próprio JSON; não inferir desatualização nem modificar valores
persistidos sem fonte. CincoSVGs aguardam inspeção raster; não ler base64 como pixels.

C24 corrigido346 e validado em11testes/3fusos; sem regravar registros ou executar CFP.
A342-08 corrigido localmente346, aguardando reteste publicado; A345-01 singular idem.
