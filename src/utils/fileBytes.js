// Lê os bytes de um arquivo local (nativo: expo-file-system).
import { File } from 'expo-file-system';

export async function readFileBytes(uri) {
  return await new File(uri).bytes();
}
