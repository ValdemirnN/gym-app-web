// Web: o seletor devolve uma URL blob:/data:, então basta um fetch.
export async function readFileBytes(uri) {
  const res = await fetch(uri);
  return new Uint8Array(await res.arrayBuffer());
}
