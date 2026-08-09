// @ts-nocheck
// Compatibilidade: o seed genérico opera sobre DMMF e delegates Prisma determinados em tempo de execução.

import { readFileSync } from "node:fs";
import path from "node:path";

import { getDMMF } from "@prisma/internals";
import { toSafeErrorLog } from "@/utils/safe-error-log";

import { prisma } from "../../external/prisma/client";
import { recreate } from "./reset";
import { assertSafeSeedTarget } from "./safety";

/**
 * Lê o schema e retorna o DMMF
 */
async function loadDMMF(seedPath) {
  const schemaPath = path.join(seedPath);
  const schema = readFileSync(schemaPath, "utf-8");
  return getDMMF({ datamodel: schema });
}

/**
 * Gera um valor “falso” para um campo escalar
 */
function generateFakeValueForField(field) {
  const { type, isId, isUnique, isList, isRequired } = field;

  if (isList) return [];

  switch (type) {
    case "String":
      if (isId) return undefined;
      if (isUnique) return `unique_${Math.random().toString(36).slice(2, 10)}`;
      return `fake_${field.name}`;
    case "Int":
      return 123;
    case "Float":
      return 1.23;
    case "Boolean":
      return false;
    case "DateTime":
      return new Date();
    case "Json":
      return { example: "data" };
    default:
      return isRequired ? `fake_${field.name}` : null;
  }
}

/**
 * Constrói o grafo de dependências entre os modelos
 */
function buildDependencyGraph(models) {
  const graph = {};

  for (const model of models) {
    graph[model.name] = {
      name: model.name,
      dependsOn: new Set(),
      referencedBy: new Set(),
    };
  }

  for (const model of models) {
    for (const field of model.fields) {
      if (field.kind === "object" && !field.isList && field.isRequired) {
        const dependsOnModel = field.type;
        if (graph[dependsOnModel]) {
          graph[model.name].dependsOn.add(dependsOnModel);
          graph[dependsOnModel].referencedBy.add(model.name);
        }
      }
    }
  }
  return graph;
}

/**
 * Ordena os modelos de forma topológica (para criar os registros na ordem correta)
 */
function topologicalSort(graph) {
  const inDegree = {};
  for (const modelName of Object.keys(graph)) {
    inDegree[modelName] = graph[modelName].dependsOn.size;
  }

  const queue = Object.keys(inDegree).filter((m) => inDegree[m] === 0);
  const sorted = [];

  while (queue.length) {
    const current = queue.shift();
    sorted.push(current);
    for (const ref of graph[current].referencedBy) {
      inDegree[ref]--;
      if (inDegree[ref] === 0) {
        queue.push(ref);
      }
    }
  }

  if (sorted.length < Object.keys(graph).length) {
    console.warn("⚠️ Possível ciclo de dependências. A ordenação pode estar incompleta.");
    const remaining = Object.keys(inDegree).filter((m) => inDegree[m] > 0);
    return [...sorted, ...remaining];
  }

  return sorted;
}

/**
 * Função auxiliar para montar o objeto "data" usado na criação de registros.
 * Essa função preenche:
 *   - Os campos escalares (exceto aqueles que são FKs de relacionamentos)
 *   - Os relacionamentos **não-self**
 */
function buildCreationData(modelDataMap, modelName) {
  const { model } = modelDataMap[modelName];
  const data = {};

  // 1. Preenche os campos escalares (exceto os que são FKs de relações)
  for (const field of model.fields) {
    if (field.kind === "scalar" && !field.isReadOnly) {
      // Se o campo for uma chave estrangeira de um relacionamento, pulamos
      const isForeignKey = model.fields.some(
        (f) =>
          f.kind === "object" && f.relationFromFields && f.relationFromFields.includes(field.name),
      );
      if (isForeignKey) continue;

      data[field.name] = generateFakeValueForField(field);
    }
  }

  // 2. Preenche os relacionamentos NÃO-self (por exemplo, o "level" no model user)
  for (const field of model.fields) {
    if (field.kind !== "object") continue;
    if (field.type === modelName) continue; // pula self-relation

    const { relationFromFields, relationToFields, type, isList } = field;
    if (isList) continue;
    if (!relationFromFields || relationFromFields.length === 0) continue;

    let anyFKrequired = false;
    relationFromFields.forEach((fkFieldName) => {
      const fkDef = model.fields.find((f) => f.name === fkFieldName);
      if (fkDef?.isRequired) {
        anyFKrequired = true;
      }
    });

    const relatedModelData = modelDataMap[type];
    if (!relatedModelData) {
      if (anyFKrequired) data[field.name] = undefined;
      continue;
    }
    const relatedRecord = relatedModelData.createdRecords[0];
    if (relatedRecord) {
      data[field.name] = { connect: {} };
      if (relationToFields?.length === 1) {
        const foreignKey = relationToFields[0];
        data[field.name].connect[foreignKey] = relatedRecord[foreignKey];
      } else {
        relationToFields.forEach((rk) => {
          data[field.name].connect[rk] = relatedRecord[rk];
        });
      }
    } else {
      data[field.name] = undefined;
    }
  }

  return data;
}

/**
 * Cria um registro padrão para um modelo (exceto tratando self-relation)
 */
async function tryCreateOneRecord(modelDataMap, modelName) {
  const data = buildCreationData(modelDataMap, modelName);
  // Aqui os campos self-relation serão ignorados (eles serão tratados à parte)
  try {
    const created = await prisma[modelName].create({ data });
    modelDataMap[modelName].createdRecords.push(created);
    console.log(`  ✅ Registro criado em ${modelName}.`);
    return true;
  } catch (err) {
    console.warn(
      `  🛠️ Falha ao criar ${modelName}. Aguardar próxima passada...`,
      toSafeErrorLog(err, "SeedCreateError"),
    );
    return false;
  }
}

/**
 * Retorna true se o modelo possuir self-relation (um campo cujo tipo é ele mesmo)
 */
function isSelfRelationModel(model) {
  return model.fields.some((f) => f.kind === "object" && f.type === model.name && !f.isList);
}

/**
 * Atualiza a self-relation para **todos** os registros do modelo.
 * Para cada registro, o campo de self-relation é atualizado para conectar com o primeiro registro criado.
 */
async function updateSelfRelationForAllRecords(modelDataMap, modelName) {
  const { model, createdRecords } = modelDataMap[modelName];
  if (createdRecords.length === 0) return;
  const firstRecord = createdRecords[0];

  const selfRelationField = model.fields.find(
    (f) => f.kind === "object" && f.type === modelName && !f.isList,
  );
  if (!selfRelationField) return;

  for (const record of createdRecords) {
    try {
      const updateData = {};
      if (selfRelationField.relationToFields?.length === 1) {
        const foreignKey = selfRelationField.relationToFields[0];
        updateData[selfRelationField.name] = {
          connect: { [foreignKey]: firstRecord[foreignKey] },
        };
      } else {
        updateData[selfRelationField.name] = {
          connect: selfRelationField.relationToFields.reduce((acc, rk) => {
            acc[rk] = firstRecord[rk];
            return acc;
          }, {}),
        };
      }
      await prisma[modelName].update({
        where: { id: record.id },
        data: updateData,
      });
      console.log(`  ✅ Self-relation atualizada para ${modelName}.`);
    } catch (err) {
      console.error(
        `  🛠️ Falha ao atualizar self-relation para ${modelName}.`,
        toSafeErrorLog(err, "SeedRelationError"),
      );
    }
  }
}

/**
 * Cria os registros de seed, realizando múltiplas passadas para resolver as dependências
 */
async function multiPassCreate(dmmf, maxPasses = 5) {
  const models = dmmf.datamodel.models;
  const graph = buildDependencyGraph(models);
  const sortedModelNames = topologicalSort(graph);

  const modelDataMap = {};
  for (const m of models) {
    modelDataMap[m.name] = {
      model: m,
      createdRecords: [],
      created: false,
    };
  }

  let pass = 1;
  while (pass <= maxPasses) {
    console.log(`\n=== Iniciando pass #${pass} ===`);
    let createdAlgoNestaPassada = false;

    for (const modelName of sortedModelNames) {
      if (modelDataMap[modelName].created) continue;
      const success = await tryCreateOneRecord(modelDataMap, modelName);
      if (success) {
        modelDataMap[modelName].created = true;
        createdAlgoNestaPassada = true;
      }
    }

    if (!createdAlgoNestaPassada) {
      console.log("⚠️ Sem mais registros para criar...");
      break;
    }
    pass++;
  }

  return modelDataMap;
}

/**
 * Função principal de geração da seed
 */
async function generateSeedData(seedPath) {
  assertSafeSeedTarget();

  try {
    console.log("Lendo schema.prisma...");
    const dmmfData = await loadDMMF(seedPath);

    console.log("Iniciando criação de registros...");
    const modelDataMap = await multiPassCreate(dmmfData, 5);

    // Para modelos com self-relation, atualiza a coluna de self-relation para todos os registros,
    // mesmo que isso gere redundância.
    for (const modelName in modelDataMap) {
      const model = modelDataMap[modelName].model;
      if (isSelfRelationModel(model)) {
        console.log(`\n=== Atualizando self-relation para todos os registros em ${modelName} ===`);
        await updateSelfRelationForAllRecords(modelDataMap, modelName);
      }
    }

    console.log("\n✅ Seed finalizado com sucesso!");
  } catch (error) {
    console.error("Erro durante a geração de seed.", toSafeErrorLog(error, "SeedGenerationError"));
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

export { generateSeedData, recreate };
