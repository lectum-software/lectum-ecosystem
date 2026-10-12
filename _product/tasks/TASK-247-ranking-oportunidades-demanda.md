# TASK-247 - Ranking de oportunidades por demanda nao atendida

## Escopo

Reordenar a aba profissional `Oportunidades` para representar demanda relevante ainda
pouco atendida. Combinar recencia, pacientes distintos e atividade recente, reduzir o
peso de comentarios repetidos pela mesma pessoa e descontar respostas profissionais.

## Aceite

- [x] Posts recentes sem resposta profissional continuam competitivos.
- [x] Participacao de pacientes distintos pesa mais que repeticao da mesma pessoa.
- [x] Conversas ativas com pouca cobertura profissional podem subir no ranking.
- [x] Varias respostas profissionais reduzem progressivamente a oportunidade.
- [x] A ordenacao ocorre antes da paginacao e o frontend preserva a ordem global.
- [x] Pacientes, janela de 90 dias e demais abas mantem as regras atuais.
- [x] Nenhum banco, migration, env, dependencia ou mock e criado.

## Impacto de deploy

Backend e frontend, sem alteracao de dados persistidos. O contrato recebe metricas
aditivas e opcionais no consumidor. Os artefatos podem ser publicados em qualquer
ordem; frontend antigo e backend antigo continuam funcionais durante rollout misto.
Rollback por reversao em `homolog`.

## Validacao

- Teste focal de ranking do backend: 21/21 aprovados.
- Teste focal do contrato de ordenacao do frontend: 5/5 aprovados.
- Check completo do frontend: aprovado, incluindo 600/600 testes da suite principal.
- Build do frontend: aprovado, com 90/90 rotas geradas.
- Build do backend: aprovado.
- Check amplo do backend: 899/901 testes aprovados. Os dois casos restantes foram
  afetados pelo ambiente da execucao ampla (timeout sob carga e ausencia de
  `JWT_SECRET_KEY`) e passaram isoladamente, 4/4, com o ambiente de teste completo.
