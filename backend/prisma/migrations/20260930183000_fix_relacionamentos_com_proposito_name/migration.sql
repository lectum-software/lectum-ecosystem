-- Ajusta o nome público da comunidade para refletir exatamente o cadastro administrativo.
-- O slug e as demais propriedades permanecem inalterados.

UPDATE "communities"
SET
    "name" = U&'Relacionamentos com prop\00F3sito',
    "updated_at" = CURRENT_TIMESTAMP
WHERE "slug" = 'relacionamentos-com-proposito'
  AND "name" IN (
      U&'Relacionamentos com Prop\00F3sito',
      U&'Relacionamento com Prop\00F3sito'
  );
