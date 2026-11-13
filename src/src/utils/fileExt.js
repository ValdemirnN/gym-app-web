// Extensão de arquivo a partir da URI. No navegador o seletor devolve blob:/data: URIs,
// que não têm extensão — nesse caso lemos o mime do data: ou usamos o padrão.
const MIME_TO_EXT = {
  'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
  'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/webm': 'webm',
};

export function fileExt(uri, fallback = 'jpg') {
  if (!uri) return fallback;
  if (uri.startsWith('data:')) {
    const mime = uri.slice(5, uri.indexOf(';'));
    return MIME_TO_EXT[mime] || fallback;
  }
  if (uri.startsWith('blob:')) return fallback;
  const ext = (uri.split('.').pop() || fallback).split('?')[0];
  return /^[a-z0-9]{2,5}$/i.test(ext) ? ext : fallback;
}
