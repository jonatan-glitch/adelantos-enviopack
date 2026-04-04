/**
 * Postinstall patch for @enviopack/epic-ui.
 *
 * epic-ui was built targeting react-router v7 (where Link lives in the core
 * package). Our app uses react-router-dom v6, which re-exports everything from
 * react-router AND adds DOM components like Link/BrowserRouter/NavLink.
 *
 * We patch the pre-built ES bundle to import from 'react-router-dom' so that
 * Link, useNavigate and useMatch resolve correctly at runtime.
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const bundlePath = resolve(__dirname, '../node_modules/@enviopack/epic-ui/dist/index.es.js');

try {
  let content = readFileSync(bundlePath, 'utf8');
  const original = 'from "react-router"';
  const patched  = 'from "react-router-dom"';

  if (content.includes(patched)) {
    console.log('✓ @enviopack/epic-ui already patched');
  } else if (content.includes(original)) {
    content = content.replaceAll(original, patched);
    writeFileSync(bundlePath, content, 'utf8');
    console.log('✓ Patched @enviopack/epic-ui: react-router → react-router-dom');
  } else {
    console.log('⚠ Could not find react-router import in epic-ui bundle — skipping');
  }
} catch (err) {
  console.warn('⚠ patch-epic-ui: could not patch bundle:', err.message);
}
