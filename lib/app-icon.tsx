import { ImageResponse } from 'next/og';

/** Green triangle on white, matching the brand mark. Rendered once at build time. */
export function renderAppIcon(size: number) {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff' }}>
        <div
          style={{
            width: size * 0.56,
            height: size * 0.56,
            background: 'linear-gradient(135deg, #166534 0%, #16a34a 100%)',
            clipPath: 'polygon(50% 6%, 7% 92%, 93% 92%)',
          }}
        />
      </div>
    ),
    { width: size, height: size }
  );
}
