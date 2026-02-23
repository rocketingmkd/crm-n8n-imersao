/**
 * SVG filter for liquid glass distortion effect (iOS 26 style).
 * Include once at the app root level.
 */
export function GlassDistortionFilter() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs>
        <filter id="glass-distortion" x="0%" y="0%" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.025 0.025"
            numOctaves={2}
            seed={92}
            result="noise"
          />
          <feGaussianBlur
            in="noise"
            stdDeviation={2}
            result="blurred"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="blurred"
            scale={65}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  );
}
