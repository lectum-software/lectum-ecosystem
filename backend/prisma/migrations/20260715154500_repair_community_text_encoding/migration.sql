-- Repara textos de comunidades que foram persistidos com caracteres corrompidos
-- em ambientes onde migrations antigas já tinham sido aplicadas. As atualizações
-- são condicionais para não sobrescrever edições administrativas legítimas quando
-- o texto atual não contém sinais de encoding quebrado.

UPDATE "communities"
SET
  "name" = U&'Ansiedade em Equil\00EDbrio',
  "description" = U&'Espa\00E7o para conversas sobre ansiedade, regula\00E7\00E3o emocional, rotina e estrat\00E9gias de cuidado baseadas em acolhimento.',
  "category" = 'Ansiedade',
  "updated_at" = CURRENT_TIMESTAMP
WHERE "slug" = 'ansiedade-em-equilibrio'
  AND (
    COALESCE("name", '') LIKE '%' || U&'\FFFD' || '%'
    OR COALESCE("name", '') LIKE '%??%'
    OR COALESCE("name", '') LIKE '%Ã%'
    OR COALESCE("name", '') LIKE '%Â%'
    OR COALESCE("description", '') LIKE '%' || U&'\FFFD' || '%'
    OR COALESCE("description", '') LIKE '%??%'
    OR COALESCE("description", '') LIKE '%Ã%'
    OR COALESCE("description", '') LIKE '%Â%'
  );

UPDATE "communities"
SET
  "name" = U&'Relacionamentos com Prop\00F3sito',
  "description" = U&'Comunidade para refletir sobre v\00EDnculos, comunica\00E7\00E3o, limites saud\00E1veis e constru\00E7\00E3o de rela\00E7\00F5es mais conscientes.',
  "category" = 'Relacionamentos',
  "updated_at" = CURRENT_TIMESTAMP
WHERE "slug" = 'relacionamentos-com-proposito'
  AND (
    COALESCE("name", '') LIKE '%' || U&'\FFFD' || '%'
    OR COALESCE("name", '') LIKE '%??%'
    OR COALESCE("name", '') LIKE '%Ã%'
    OR COALESCE("name", '') LIKE '%Â%'
    OR COALESCE("description", '') LIKE '%' || U&'\FFFD' || '%'
    OR COALESCE("description", '') LIKE '%??%'
    OR COALESCE("description", '') LIKE '%Ã%'
    OR COALESCE("description", '') LIKE '%Â%'
  );

UPDATE "communities"
SET
  "name" = 'Autocuidado em Pequenos Passos',
  "description" = U&'Lugar para compartilhar pr\00E1ticas realistas de autocuidado, organiza\00E7\00E3o emocional e pequenos h\00E1bitos sustent\00E1veis.',
  "category" = 'Autocuidado',
  "updated_at" = CURRENT_TIMESTAMP
WHERE "slug" = 'autocuidado-em-pratica'
  AND (
    COALESCE("name", '') LIKE '%' || U&'\FFFD' || '%'
    OR COALESCE("name", '') LIKE '%??%'
    OR COALESCE("name", '') LIKE '%Ã%'
    OR COALESCE("name", '') LIKE '%Â%'
    OR COALESCE("description", '') LIKE '%' || U&'\FFFD' || '%'
    OR COALESCE("description", '') LIKE '%??%'
    OR COALESCE("description", '') LIKE '%Ã%'
    OR COALESCE("description", '') LIKE '%Â%'
  );

UPDATE "communities"
SET
  "name" = U&'Depress\00E3o: Redescobrindo a Vida',
  "description" = U&'Espa\00E7o de acolhimento para conversar sobre des\00E2nimo, isolamento, reca\00EDdas, rotina e caminhos poss\00EDveis de cuidado.',
  "category" = U&'Depress\00E3o',
  "updated_at" = CURRENT_TIMESTAMP
WHERE "slug" = 'depressao'
  AND (
    COALESCE("name", '') LIKE '%' || U&'\FFFD' || '%'
    OR COALESCE("name", '') LIKE '%??%'
    OR COALESCE("name", '') LIKE '%Ã%'
    OR COALESCE("name", '') LIKE '%Â%'
    OR COALESCE("description", '') LIKE '%' || U&'\FFFD' || '%'
    OR COALESCE("description", '') LIKE '%??%'
    OR COALESCE("description", '') LIKE '%Ã%'
    OR COALESCE("description", '') LIKE '%Â%'
  );

UPDATE "communities"
SET
  "name" = 'TDAH: Encontrando seu Ritmo',
  "description" = U&'Comunidade para trocar experi\00EAncias sobre foco, organiza\00E7\00E3o, impulsividade, rotina e estrat\00E9gias de cuidado para TDAH.',
  "category" = 'TDAH',
  "updated_at" = CURRENT_TIMESTAMP
WHERE "slug" = 'tdah'
  AND (
    COALESCE("name", '') LIKE '%' || U&'\FFFD' || '%'
    OR COALESCE("name", '') LIKE '%??%'
    OR COALESCE("name", '') LIKE '%Ã%'
    OR COALESCE("name", '') LIKE '%Â%'
    OR COALESCE("description", '') LIKE '%' || U&'\FFFD' || '%'
    OR COALESCE("description", '') LIKE '%??%'
    OR COALESCE("description", '') LIKE '%Ã%'
    OR COALESCE("description", '') LIKE '%Â%'
  );

UPDATE "communities"
SET
  "description" = U&'Comunidade usada para visualiza\00E7\00E3o local do layout administrativo.',
  "updated_at" = CURRENT_TIMESTAMP
WHERE "slug" = 'perguntas-da-comunidade-layout'
  AND (
    COALESCE("description", '') LIKE '%' || U&'\FFFD' || '%'
    OR COALESCE("description", '') LIKE '%??%'
    OR COALESCE("description", '') LIKE '%Ã%'
    OR COALESCE("description", '') LIKE '%Â%'
  );
