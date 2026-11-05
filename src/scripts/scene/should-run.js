// Run the live 3D scene only on desktop-size screens that can handle it. Phones show the logo instead;
// everyone else keeps the still picture.
export function shouldRunScene({ reducedMotion, webgl, saveData, cores, phone }) {
  return !phone && !reducedMotion && webgl && !saveData && (cores ?? 4) >= 4;
}
