// [P] S0 presentation values, pending D-10 scale/contrast acceptance.
export const PRESENTATION = Object.freeze({
  padding: 24,
  maxResolution: 2,
  cameraViewWidth: 1600, // [P] visible map width before viewport aspect-ratio margins
  cameraPageStep: 800, // [P] half-screen overlap between adjacent blocks
  cameraManualHoldMs: 4000,
  cameraTransitionMs: 320, // [P] quick, smooth transition between adjacent blocks
  cameraEdgeFraction: 0.15, // [P] the group center must approach the edge before auto-paging
  // [P] Lane markings indicate the two paths without changing movement.
  laneY: [250, 750],
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
    red: 0xd8554d,
    redEdge: 0x9d3f3b,
    highlight: 0x8bb7ff,
    shadow: 0x313c52,
    selection: 0x087f7a,
    preview: 0x986523,
    tension: 0xd64a3b,
  },
});
