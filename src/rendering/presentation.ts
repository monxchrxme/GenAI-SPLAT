// [P] S0 presentation values, pending D-10 scale/contrast acceptance.
export const PRESENTATION = Object.freeze({
  padding: 24,
  tiltY: 0.72, // [P] orthographic inclined view for visual review
  maxResolution: 2,
  markerRadius: 11,
  shadowOffset: 3,
  shadowScaleY: 0.65,
  highlightRadius: 3,
  highlightOffset: -3,
  // [P] S1 action 1: static selection overlay, separate from B-static markers.
  selectionPadding: 5,
  selectionStrokeWidth: 1.5,
  previewStrokeWidth: 2.5,
  slotRadius: 3,
  slotStrokeWidth: 1.25,
  tensionStrokeWidth: 3.5,
  colors: {
    background: 0xece9e0,
    arena: 0xf3f0e7,
    grid: 0xe3dfd4,
    border: 0xc9c4b7,
    paintBlue: 0x3977d4,
    paintRed: 0xd66459,
    blue: 0x2866dc,
    blueEdge: 0x1e4eb1,
    highlight: 0x8bb7ff,
    shadow: 0x313c52,
    selection: 0x087f7a,
    preview: 0x986523,
    tension: 0xd64a3b,
  },
});
