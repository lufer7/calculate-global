// Fails fast with a clear message instead of a cryptic Metro/SQLite error on old Node versions.
const [major, minor] = process.versions.node.split('.').map(Number);
const ok = (major === 22 && minor >= 13) || major >= 24;
if (!ok) {
  console.error(`\nNode.js ${process.versions.node} bulundu, ancak bu proje Node 22.13+ veya 24+ gerektiriyor.`);
  console.error('https://nodejs.org adresinden "LTS" sürümünü kurun, terminali kapatıp açın ve tekrar deneyin.\n');
  process.exit(1);
}
