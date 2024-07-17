import { fileURLToPath } from 'url';
import { dirname } from 'path';

export const getDirname = (metaUrl) => {
  const __filename = fileURLToPath(metaUrl);
  const __dirname = dirname(__filename);
  return __dirname;
};
