import assert from "node:assert/strict";
import test from "node:test";
import { getApiErrorCode } from "../api/errors.ts";
import {
  assertMediaUploadFinalSize,
  assertMediaUploadSourceSize,
  formatMediaUploadSize,
  getMediaUploadFinalSizeError,
  getMediaUploadSourceSizeError,
  isMediaUploadApiSizeLimitError,
  resolveMediaUploadSourceLimitBytes,
  resolveVideoUploadSourceLimitBytes,
} from "./media-upload-limits.ts";

const MEBIBYTE = 1024 * 1024;
const fileWithSize = (size) => ({ size });

test("mantém imagens e vídeos no limite final do endpoint", () => {
  const finalLimit = 200 * MEBIBYTE;

  assert.equal(resolveMediaUploadSourceLimitBytes("image", finalLimit), finalLimit);
  assert.equal(resolveMediaUploadSourceLimitBytes("video", finalLimit), finalLimit);
  assert.equal(getMediaUploadSourceSizeError(fileWithSize(finalLimit), "image", finalLimit), null);

  const imageError = getMediaUploadSourceSizeError(
    fileWithSize(finalLimit + 1),
    "image",
    finalLimit,
  );
  assert.equal(imageError?.stage, "source");
  assert.equal(imageError?.limitBytes, finalLimit);
});

test("recusa vídeo bruto acima do limite final antes do transporte", () => {
  const finalLimit = 200 * MEBIBYTE;

  assert.doesNotThrow(() =>
    assertMediaUploadSourceSize(fileWithSize(finalLimit), "video", finalLimit),
  );

  const sourceError = getMediaUploadSourceSizeError(
    fileWithSize(finalLimit + 1),
    "video",
    finalLimit,
  );
  assert.equal(sourceError?.stage, "source");
  assert.equal(sourceError?.actualBytes, finalLimit + 1);
  assert.equal(sourceError?.limitBytes, finalLimit);
});

test("não cria folga para compressão client-side", () => {
  assert.equal(resolveVideoUploadSourceLimitBytes(300 * MEBIBYTE), 300 * MEBIBYTE);
  assert.equal(resolveVideoUploadSourceLimitBytes(600 * MEBIBYTE), 600 * MEBIBYTE);
});

test("valida o arquivo preparado no limite final antes do transporte", () => {
  const finalLimit = 200 * MEBIBYTE;

  assert.doesNotThrow(() =>
    assertMediaUploadFinalSize(fileWithSize(finalLimit), "video", finalLimit),
  );
  assert.equal(
    getMediaUploadFinalSizeError(fileWithSize(80 * MEBIBYTE), "video", finalLimit),
    null,
  );

  const fallbackError = getMediaUploadFinalSizeError(
    fileWithSize(220 * MEBIBYTE),
    "video",
    finalLimit,
  );
  assert.equal(fallbackError?.stage, "final");
  assert.equal(fallbackError?.limitBytes, finalLimit);
  assert.throws(
    () => assertMediaUploadFinalSize(fileWithSize(finalLimit + 1), "video", finalLimit),
    { name: "MediaUploadSizeError" },
  );
});

test("recusa limites inválidos em vez de desativar o guard silenciosamente", () => {
  assert.throws(() => resolveVideoUploadSourceLimitBytes(0), TypeError);
  assert.throws(() => resolveVideoUploadSourceLimitBytes(Number.NaN), TypeError);
});

test("arredonda tamanho excedente para cima sem aparentar igualdade com o limite", () => {
  assert.equal(formatMediaUploadSize(200 * MEBIBYTE), "200 MB");
  assert.equal(formatMediaUploadSize(200 * MEBIBYTE + 1), "200,1 MB");
});

test("lê apenas códigos semânticos das formas de erro suportadas", () => {
  assert.equal(getApiErrorCode({ data: { code: "exceeded_file_limit" } }), "exceeded_file_limit");
  assert.equal(
    getApiErrorCode({ response: { data: { code: "unexpected_type_file" } } }),
    "unexpected_type_file",
  );
  assert.equal(getApiErrorCode({ data: { code: 400 } }), undefined);
  assert.equal(getApiErrorCode(new Error("limite 200 em outro contexto")), undefined);
});

test("classifica limite da API sem inferir por palavras ou números incidentais", () => {
  assert.equal(
    isMediaUploadApiSizeLimitError({
      code: "exceeded_file_limit",
      message: "arquivo excede o limite de 200MB",
      status: 400,
    }),
    true,
  );
  assert.equal(isMediaUploadApiSizeLimitError({ message: "payload recusado", status: 413 }), true);
  assert.equal(
    isMediaUploadApiSizeLimitError({
      message: "O limite de comentários é 200 por período.",
      status: 400,
    }),
    false,
  );
  assert.equal(
    isMediaUploadApiSizeLimitError({ message: "Falha de tamanho temporária.", status: 400 }),
    false,
  );
});
