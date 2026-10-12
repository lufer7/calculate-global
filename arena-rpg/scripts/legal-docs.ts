/**
 * Regenerates docs/PRIVACY_NOTICE.md and docs/TERMS.md from the in-app texts,
 * so the public pages the stores link to always match what players accept.
 *   npm run legal:docs
 */
import { writeFileSync } from 'node:fs';
import { LEGAL } from '../apps/mobile/src/legal/texts';

function toMarkdown(title: string, version: string, body: string) {
  const lines = body.split('\n').map((l) => {
    if (l.startsWith('• ')) return `- ${l.slice(2)}`;
    if (l.trim() && !l.startsWith('Bu metin')) return `\n## ${l}\n`;
    return l;
  });
  return `# ${title}\n\n> Şablondur, hukuki tavsiye değildir. [Köşeli parantez] alanlarını doldurup bir avukata kontrol ettirin.\n> Bu dosya \`apps/mobile/src/legal/texts.ts\` dosyasından üretilir (\`npm run legal:docs\`); doğrudan düzenlemeyin.\n\n**Sürüm:** ${version}\n\n${lines.join('\n').replace(/\n{3,}/g, '\n\n')}\n`;
}

writeFileSync('docs/PRIVACY_NOTICE.md', toMarkdown(LEGAL.privacy.title, LEGAL.versions.privacy, LEGAL.privacy.body));
writeFileSync('docs/TERMS.md', toMarkdown(LEGAL.terms.title, LEGAL.versions.terms, LEGAL.terms.body));
console.log('docs/PRIVACY_NOTICE.md ve docs/TERMS.md güncellendi.');
