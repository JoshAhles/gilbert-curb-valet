// Run the live 3D scene only on devices that can handle it. Everyone else keeps the still picture.
export function shouldRunScene({ reducedMotion, webgl, saveData, cores }) {
  return !reducedMotion && webgl && !saveData && (cores ?? 4) >= 4;
}
