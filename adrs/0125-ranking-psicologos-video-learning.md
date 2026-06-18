# ADR-0125: Ranqueamento de psicólogos com aprendizado de vídeo

## Status

Aceito em 2026-06-18.

## Contexto

O arquivo local `C:\Users\tulio\Desktop\Lectum\Algoritmo Ranqueamento Psicologos.pdf` definiu que a página de psicólogos deve priorizar profissionais com maior probabilidade de gerar valor para o usuário e conversão para a Lectum, mantendo diversidade de exposição e qualidade.

As regras principais do PDF são:

- apenas psicólogos com vídeo de apresentação ativo participam do feed;
- psicólogos verificados aparecem antes dos não verificados;
- dentro de cada grupo, o score combina retenção de vídeo, taxa de clique no WhatsApp, favoritos, quantidade de avaliações, nota ponderada, completude do perfil e recência/atividade;
- aplicar randomização controlada e evitar que a ordem fique sempre idêntica.

Também houve decisão de produto durante a implementação: a troca de vídeo não deve penalizar imediatamente o psicólogo, porque a Lectum deve incentivar testes de diferentes apresentações para melhorar conversão.

## Decisão

A listagem `GET /api/private/directory/psychologists` passa a ordenar candidatos por um score calculado no backend, sem alterar o contrato público da resposta.

### Elegibilidade

Permanece obrigatório:

- `published=true`;
- usuário ativo;
- vídeo de apresentação ativo;
- campos mínimos já exigidos para publicação/listagem.

Sem vídeo ativo, o profissional não participa do feed.

### Camada de verificação

A camada `verificado` segue a semântica já adotada no produto para selo público: assinatura profissional/cortesia ativa via `activeProfessionalEntitlementWhere()`.

A ordenação primeiro separa:

1. psicólogos com entitlement profissional ativo;
2. psicólogos sem entitlement profissional ativo.

Nenhum psicólogo não verificado deve ultrapassar um verificado no feed.

### Score dentro de cada camada

O score base usa os pesos do PDF:

```text
vídeo 25%
WhatsApp 25%
favoritos 15%
quantidade de avaliações 12%
nota ponderada 12%
completude do perfil 7%
recência/atividade 4%
```

#### Vídeo

A retenção do vídeo usa a decisão aprovada no chat:

- 85% do componente de vídeo = tempo médio assistido / duração do vídeo;
- 15% do componente de vídeo = taxa de conclusão;
- replays, abandono e volume bruto de visualizações permanecem no Analytics e não entram no ranking nesta versão.

Para troca de vídeo, o score usa uma janela de aprendizado:

- o vídeo atual ganha confiança progressiva até 30 visualizações qualificadas;
- antes disso, o sistema mistura o desempenho do vídeo atual com o desempenho histórico dos vídeos anteriores;
- quando não há histórico, usa baseline neutro de vídeo novo;
- o histórico antigo não contamina os Analytics do vídeo atual, mas protege o ranking durante a fase inicial de aprendizado.

A visualização qualificada é uma sessão com pelo menos 3 segundos assistidos ou posição máxima >= 3 segundos.

#### WhatsApp

Como ainda não existe uma fonte persistida de impressão de perfil (`profile_view_event`/impressão de feed), a taxa de WhatsApp usa a alternativa prevista no PDF: cliques WhatsApp / visualizações qualificadas do vídeo.

Para evitar explosões por baixo volume, a taxa recebe smoothing bayesiano simples. Quando uma fonte real de impressões for criada, o denominador deve migrar para impressões reais do psicólogo no feed.

#### Favoritos e quantidade de avaliações

São normalizados por curva de saturação para evitar que volumes brutos dominem o score.

#### Nota ponderada

A nota usa média bayesiana com prior neutro, evitando que 5,0 com uma única avaliação supere automaticamente perfis com alto volume e média muito alta.

#### Completude

A completude considera sinais reais do perfil: avatar, capa, bio, texto de apresentação, vídeo, WhatsApp, idiomas, modalidade, dados profissionais, endereço, público atendido, formação, especialidades, serviços, abordagens e disponibilidade.

Bio e texto de apresentação seguem opcionais para publicação, mas continuam valorizando a completude.

#### Recência/atividade

O bônus de recência usa a data mais recente entre atualização do perfil e eventos reais agregados disponíveis: vídeo, WhatsApp, favoritos e avaliações.

### Diversificação

Foi aplicada randomização controlada determinística por usuário/dia/psicólogo, dentro da faixa de 5% a 10% citada no PDF.

A randomização é aplicada apenas dentro da camada de verificação, sem permitir que não verificados ultrapassem verificados.

Penalizações por repetição de exposição, ignorados rapidamente e vistos várias vezes pelo mesmo usuário ainda dependem de fonte persistida de impressão/skip do feed. Não foram simuladas.

### Separação de versões de vídeo

O frontend passou a gerar `session_key` de analytics incluindo a versão do vídeo, derivada da URL atual. Assim, quando o psicólogo troca o vídeo, novas sessões são gravadas separadamente.

A página `/app/psychologists` também registra sessões reais de reprodução do vídeo ativo do card/feed, reutilizando o endpoint existente de analytics de vídeo para alimentar a retenção usada no ranking.

O Analytics do psicólogo passou a calcular a seção de vídeo usando apenas sessões do `video_url` atual, evitando misturar a performance do vídeo antigo com a nova apresentação.

## Consequências

- O ranking deixa de depender apenas de nota média, quantidade de avaliações e data de criação.
- Profissionais com assinatura/cortesia ativa permanecem sempre acima dos demais.
- Trocar o vídeo não derruba imediatamente o profissional: o novo vídeo entra em aprendizado e herda proteção temporária do histórico anterior.
- Um vídeo novo que performa melhor passa a melhorar o componente de vídeo conforme acumula visualizações qualificadas.
- Um vídeo novo que performa pior reduz o componente de vídeo gradualmente, sem queda brusca inicial.
- O cálculo usa somente dados persistidos reais; não foram criados mocks, seeds ou eventos simulados.
- A listagem calcula o ranking em memória após buscar candidatos filtrados. Isso é aceitável para o volume atual do MVP; se a base crescer, deve ser avaliada materialização/snapshot de score ou SQL dedicado.

## Validação

- `pnpm --dir backend check`
- `pnpm --dir frontend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend build`
- `pnpm check`
- `git diff --check`
