/**
 * Open Graph images, rendered at build time with next/og. One template:
 * the entity type (shape and colour), its name, and the site name.
 */
import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { NodeType } from './types';
import { TYPE_META } from './types-meta';
import { MARK_PATHS } from '@/components/TypeMark';
import { SITE_NAME } from './site';

export const OG_SIZE = { width: 1200, height: 630 };

/** Brand colours as hex, mirrored from globals.css (next/og cannot read CSS variables). */
const TYPE_HEX: Record<NodeType, { mark: string; text: string }> = {
  People: { mark: '#5F5BA3', text: '#5F5BA3' },
  Partners: { mark: '#DC2680', text: '#B01E68' },
  Projects: { mark: '#EB631A', text: '#A8470F' },
  Methods: { mark: '#148D66', text: '#107052' },
};

const fontDir = join(process.cwd(), 'node_modules', '@fontsource', 'archivo', 'files');
const fonts = Promise.all([
  readFile(join(fontDir, 'archivo-latin-600-normal.woff')),
  readFile(join(fontDir, 'archivo-latin-700-normal.woff')),
]);

export async function renderOgImage({ title, type }: { title: string; type?: NodeType }) {
  const [semi, bold] = await fonts;
  const size = title.length > 60 ? 64 : title.length > 32 ? 80 : 104;
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 80px',
          background: '#ffffff',
          color: '#22212a',
          fontFamily: 'Archivo',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 32, fontWeight: 600 }}>
          {type ? (
            <>
              <svg width="28" height="28" viewBox="0 0 10 10">
                <path d={MARK_PATHS[type]} fill={TYPE_HEX[type].mark} />
              </svg>
              <span style={{ color: TYPE_HEX[type].text, marginLeft: 16 }}>{TYPE_META[type].singular}</span>
            </>
          ) : (
            <div style={{ display: 'flex', gap: 14 }}>
              {(['People', 'Partners', 'Projects', 'Methods'] as const).map((t) => (
                <svg key={t} width="28" height="28" viewBox="0 0 10 10">
                  <path d={MARK_PATHS[t]} fill={TYPE_HEX[t].mark} />
                </svg>
              ))}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', fontSize: size, fontWeight: 700, lineHeight: 1.02, letterSpacing: '-0.02em', maxWidth: 1000 }}>
          {title}
        </div>
        <div style={{ display: 'flex', fontSize: 28, fontWeight: 600, color: '#5b5966', borderTop: '2px solid #e4e3e8', paddingTop: 28 }}>
          {SITE_NAME}
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        { name: 'Archivo', data: semi, weight: 600, style: 'normal' },
        { name: 'Archivo', data: bold, weight: 700, style: 'normal' },
      ],
    },
  );
}
