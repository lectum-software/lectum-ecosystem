async function readLocalMediaBody(body, maxBytes = 24 * 1024 * 1024) {
  const chunks = [];
  let size = 0;
  // Consume within the request's catch boundary, without a Web-to-Node pipe whose
  // lifetime can outlive the browser connection and leave an orphan rejection.
  for await (const chunk of body) {
    size += chunk.byteLength;
    if (size > maxBytes) throw Error('Local media resource too large');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
module.exports = { readLocalMediaBody };
