import assert from "node:assert/strict";
import { after, test } from "node:test";
import { sanitizePublicResponseData } from "./public-response";

const previousSecret = process.env.JWT_SECRET_KEY;
process.env.JWT_SECRET_KEY = "audit-anonymous-author-key-not-a-runtime-secret";
after(() => {
  if (previousSecret === undefined) delete process.env.JWT_SECRET_KEY;
  else process.env.JWT_SECRET_KEY = previousSecret;
});

const author = {
  id: "audit-patient-id",
  name: "Identidade de teste",
  avatar: "/identity-avatar.png",
  role: "paciente",
};

test("post anônimo não entrega identidade nem identificador interno ao visitante", () => {
  const input = { id: "post-id", anonymous: true, author };
  const result = sanitizePublicResponseData(input);
  assert.notEqual(result.author.id, author.id);
  assert.match(result.author.id, /^anonymous:[a-f0-9]{32}$/);
  assert.match(result.author.name, /^Membro Anônimo #\d{4}$/);
  assert.equal(result.author.avatar, null);
  assert.equal(result.id, input.id);
  assert.equal(input.author, author);
  assert.equal(author.name, "Identidade de teste");
});

test("mesmo autor mantém pseudônimo nas listas e respostas sem revelar sua identidade", () => {
  const result = sanitizePublicResponseData({
    post: { anonymous: true, author },
    replies: [{ author: { ...author, anonymous: true } }],
    identified: { author },
  });
  assert.equal(result.post.author.id, result.replies[0]?.author.id);
  assert.equal(result.post.author.name, result.replies[0]?.author.name);
  assert.notEqual(result.post.author.id, result.identified.author.id);
  assert.deepEqual(result.identified.author, author);
});

test("sem chave disponível a resposta fica genérica, nunca expõe ID ou usa hash público", () => {
  const key = process.env.JWT_SECRET_KEY;
  delete process.env.JWT_SECRET_KEY;
  try {
    const result = sanitizePublicResponseData({ anonymous: true, author });
    assert.equal(result.author.id, "anonymous:unavailable");
    assert.equal(result.author.name, "Membro Anônimo");
    assert.equal(result.author.avatar, null);
  } finally {
    process.env.JWT_SECRET_KEY = key;
  }
});

test("somente o dono conserva seu ID para editar; outro usuário recebe pseudônimo", () => {
  const input = { anonymous: true, author };
  const owner = sanitizePublicResponseData(input, { viewerId: author.id });
  const other = sanitizePublicResponseData(input, { viewerId: "another-patient" });
  assert.equal(owner.author.id, author.id);
  assert.notEqual(other.author.id, author.id);
  assert.equal(owner.author.name, other.author.name);
  assert.equal(owner.author.avatar, null);
});

test("preserva o contexto administrativo explicitamente autorizado pelo guard", () => {
  const input = { anonymous: true, author };
  assert.deepEqual(sanitizePublicResponseData(input, { revealAnonymousAuthors: true }), input);
});

test("não mascara profissional nem publicação identificada", () => {
  const input = {
    professional: { anonymous: true, author: { ...author, role: "psicologo" } },
    identified: { anonymous: false, author },
  };
  assert.deepEqual(sanitizePublicResponseData(input), input);
});

test("o pseudônimo é estável, mas depende da chave privada e separa autores", () => {
  const input = { anonymous: true, author };
  const first = sanitizePublicResponseData(input);
  assert.equal(first.author.id, sanitizePublicResponseData(input).author.id);
  assert.notEqual(
    first.author.id,
    sanitizePublicResponseData({ ...input, author: { ...author, id: "another-patient" } }).author
      .id,
  );
  const key = process.env.JWT_SECRET_KEY;
  process.env.JWT_SECRET_KEY = "another-audit-key-not-a-runtime-secret";
  try {
    assert.notEqual(first.author.id, sanitizePublicResponseData(input).author.id);
  } finally {
    process.env.JWT_SECRET_KEY = key;
  }
});
