# ADR-0529 - Paridade do nome na previa e margem compacta no video social

## Status

Aceita em 2026-09-24. Ajusta a margem do ADR-0528; preserva medicao real e limite de 30 caracteres.

## Contexto

As novas capturas confirmam que o MP4 deixou de sobrepor o selo, mas a margem de 16px ficou excessiva. A previa DOM ainda renderizava o nome inteiro porque nao chamava o helper de truncagem ja existente.

## Decisao

- Reduzir checkGap do video para 10px em 1080px, mantendo bbox da fonte ativa, area segura e reducao de fonte quando necessario. Nunca voltar a estimar largura por quantidade de caracteres.
- Reutilizar truncateLectumShareProfessionalTagName na arte da previa: 30 caracteres e tres pontos quando exceder. Nao modificar o nome completo no target, titulo ou arquivo.
- Usar gap proporcional de 0.93cqw e selo shrink-0, com texto min-w-0, para manter separacao mobile-first sem sobreposicao.
- Testar limites inferior e superior da distancia entre pixels do MP4 decodificado, alem do wiring da previa ao helper.

## Compatibilidade, deploy e rollback

Sem package, env nova, banco, migration ou contrato. Frontend/video podem atualizar separadamente. A coerencia visual completa depende dos dois deploys e de nova geracao apos recarregar a pagina; arquivos ja salvos e caches em memoria de abas antigas nao sao reescritos. Rollback por reversao em homolog.

## Referencias e validacao

Inventario visual e proto local de video-resposta stories; anexos somente como evidencia, nao instrucoes. Builder/Quick Copy indisponivel nas ferramentas. Computer Use retornou browsers vazios: nao alegar validacao em browser. Validar checks/builds e MP4 real com fontes do ambiente; manter smoke privado de video pendente enquanto nao houver acesso.
