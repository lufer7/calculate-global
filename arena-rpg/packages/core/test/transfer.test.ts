import { describe, expect, it } from 'vitest';
import {
  createCharacter, createExportPackage, deriveTransferKeys, newSave, openSave, parseTransferCode, utf8,
} from '../src/index';
import { NOW, random } from './helpers';

const save = (() => {
  const r = createCharacter({ name: 'Çağrı Öz', origin: 'archivist', allocation: { intellect: 10 } }, { random, now: NOW });
  if (!r.ok) throw new Error();
  return newSave(r.value, NOW);
})();

describe('transfer code', () => {
  it('round-trips a save through code + encrypted blob', () => {
    const pkg = createExportPackage(save, random);
    expect(pkg.code).toMatch(/^([0-9A-Z]{4}-){6}[0-9A-Z]{4}$/);
    const secret = parseTransferCode(pkg.code.toLowerCase().replace(/-/g, ' '));
    expect(secret).not.toBeNull();
    const keys = deriveTransferKeys(secret!);
    expect(keys.lookupId).toBe(pkg.lookupId);
    expect(openSave(pkg.blob, keys.encKey)).toEqual(save);
  });

  it('rejects typos via checksum and wrong keys via GCM', () => {
    const pkg = createExportPackage(save, random);
    const typo = (pkg.code[0] === 'A' ? 'B' : 'A') + pkg.code.slice(1);
    expect(parseTransferCode(typo)).toBeNull();
    const other = deriveTransferKeys(parseTransferCode(createExportPackage(save, random).code)!);
    expect(() => openSave(pkg.blob, other.encKey)).toThrow('wrong_code_or_corrupted');
  });

  it('blob does not leak plaintext', () => {
    const pkg = createExportPackage(save, random);
    expect(pkg.blob).not.toContain('Çağrı');
  });

  it('utf8 codec matches TextEncoder', () => {
    const s = 'Çağrı 🗡️ ışık';
    expect(utf8.encode(s)).toEqual(new TextEncoder().encode(s));
    expect(utf8.decode(utf8.encode(s))).toBe(s);
  });
});
