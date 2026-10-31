import { ImageResponse } from 'next/og';

/** Green triangle on white with "MENU" across it, matching the brand mark. Rendered once at build time. */
export function renderAppIcon(size: number) {
  const box = size * 0.74;
  const fontSize = size * 0.15;

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff' }}>
        <div style={{ position: 'relative', width: box, height: box, display: 'flex' }}>
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: box,
              height: box,
              background: 'linear-gradient(135deg, #166534 0%, #16a34a 100%)',
              clipPath: 'polygon(50% 6%, 7% 92%, 93% 92%)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: box * 0.6,
              display: 'flex',
              justifyContent: 'center',
              color: '#ffffff',
              fontSize,
              fontWeight: 900,
              // The default icon font has no bold weight, so thicken the letters with a same-colour stroke.
              WebkitTextStroke: `${size * 0.008}px #ffffff`,
              letterSpacing: fontSize * 0.04,
            }}
          >
            MENU
          </div>
        </div>
      </div>
    ),
    { width: size, height: size }
  );
}
