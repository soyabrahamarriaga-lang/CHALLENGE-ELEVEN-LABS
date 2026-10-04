import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parse } from '@babel/parser';
import { i18n, t, language, changeLanguage, storedLanguage, LANGUAGE_KEY, dateLocale } from './index';
import es from './es.json';
import en from './en.json';
import { localizeExample } from './examples';
import { exampleSessions } from '../data/sessions';
afterEach(async () => { vi.unstubAllGlobals(); await i18n.changeLanguage('es'); });
describe('English and Spanish interface', () => {
  it('provides matching catalogs and interpolation variables in both languages', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(es).sort());
    for (const [key, value] of Object.entries(en)) {
      expect(value.trim(), key).not.toBe('');
      const variables = (s: string) => [...s.matchAll(/\{\{(.*?)\}\}/g)].map((m) => m[1]).sort();
      expect(variables(value), key).toEqual(variables(es[key as keyof typeof es]));
    }
  });
  it('persists a valid selection, updates document language, and works without storage', async () => {
    const values = new Map<string, string>();
    const storage = { getItem: (key: string) => values.get(key), setItem: (key: string, value: string) => values.set(key, value) };
    const document = { documentElement: { lang: '' }, title: '' };
    vi.stubGlobal('localStorage', storage); vi.stubGlobal('document', document);
    expect(storedLanguage()).toBe('es'); values.set(LANGUAGE_KEY, 'unsupported'); expect(storedLanguage()).toBe('es');
    await changeLanguage('en');
    expect(storedLanguage()).toBe('en'); expect(language()).toBe('en');
    expect(document.documentElement.lang).toBe('en'); expect(document.title).toContain('Experience');
    expect(dateLocale()).toBe('en-US'); expect(t('Mi espacio')).toBe('My space');
    await changeLanguage('es'); expect(t('Mi espacio')).toBe('Mi espacio'); expect(dateLocale()).toBe('es-MX');
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } });
    expect(storedLanguage()).toBe('es'); await changeLanguage('en'); expect(language()).toBe('en');
  });
  it('formats plural counts and preserves spacing and unknown original content', async () => {
    await changeLanguage('en');
    expect(t('{{count}} proceso', { count: 1 })).toBe('1 process');
    expect(t('{{count}} proceso', { count: 2 })).toBe('2 processes');
    expect(t('{{count}} paso', { count: 0 })).toBe('0 steps');
    expect(t(' Guardar: ')).toBe(' Save: ');
    expect(t('Título escrito por el usuario')).toBe('Título escrito por el usuario');
  });
  it('translates fictional examples without mutating records, IDs, filters or original user content', async () => {
    const before = JSON.stringify(exampleSessions);
    await changeLanguage('en');
    const translated = localizeExample(exampleSessions[0]);
    expect(translated.id).toBe(exampleSessions[0].id);
    expect(translated.category).toBe(exampleSessions[0].category);
    expect(translated.title).not.toBe(exampleSessions[0].title);
    expect(JSON.stringify(exampleSessions)).toBe(before);
    const original = { ...exampleSessions[0], id: 'user-record', title: 'Mi proceso' };
    expect(localizeExample(original)).toBe(original);
    await changeLanguage('es'); expect(localizeExample(exampleSessions[0])).toEqual(exampleSessions[0]);
  });
  it('keeps every literal interface message cataloged, including labels and dialogs', () => {
    const root = join(import.meta.dirname, '..');
    const files = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? files(join(dir, entry.name)) : [join(dir, entry.name)]);
    const missing: string[] = [];
    const known = (key: string) => Object.hasOwn(es, key) || Object.hasOwn(es, key + '_other');
    for (const path of files(root).filter((p) => /\.tsx$/.test(p) && !/LiveCall\.tsx$/.test(p))) {
      const ast = parse(readFileSync(path, 'utf8'), { sourceType: 'module', plugins: ['typescript', 'jsx'] });
      const visit = (node: any) => {
        if (!node || typeof node !== 'object') return;
        if (node.type === 'CallExpression' && node.callee?.name === 't' && node.arguments[0]?.type === 'StringLiteral') {
          const key = node.arguments[0].value.replace(/\s+/g, ' ').trim();
          if (!known(key)) missing.push(relative(root, path) + ': ' + key);
        }
        if (node.type === 'JSXText' && /[A-Za-záéíóúñ]/.test(node.value) && !path.endsWith('LanguageSelect.tsx')) missing.push(relative(root, path) + ': unlocalized text ' + node.value.trim());
        if (node.type === 'JSXAttribute' && ['title', 'placeholder', 'aria-label', 'ariaLabel', 'alt'].includes(node.name.name) && node.value?.type === 'StringLiteral' && node.value.value.trim()) missing.push(relative(root, path) + ': unlocalized attribute ' + node.value.value);
        for (const [key, value] of Object.entries(node)) if (key !== 'loc') {
          if (Array.isArray(value)) value.forEach(visit); else if (value && typeof value === 'object') visit(value);
        }
      };
      visit(ast);
    }
    expect(missing).toEqual([]);
  });
});
