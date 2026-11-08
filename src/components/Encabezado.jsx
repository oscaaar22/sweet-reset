import icono from "../assets/icono-nutrasweets.png";

export function Marca() {
  return (
    <div className="flex items-center gap-2.5">
      <img src={icono} alt="" className="h-9 w-9 rounded-xl bg-white object-contain p-1 shadow-suave" />
      <div className="leading-tight">
        <p className="font-display text-[22px] font-semibold text-noche">Sweet Reset</p>
        <p className="text-[11px] font-semibold text-noche/60">by NutraSweets</p>
      </div>
    </div>
  );
}

export default function Encabezado({ titulo, subtitulo, ir, derecha }) {
  return (
    <header className="mb-5 flex items-start justify-between gap-3">
      <div className="min-w-0">
        {ir && (
          <button type="button" onClick={() => ir("inicio")} className="etiqueta mb-1 hover:text-lavanda-600">
            Sweet Reset
          </button>
        )}
        <h1 className="font-display text-[30px] font-semibold leading-tight text-noche">{titulo}</h1>
        {subtitulo && <p className="mt-1 text-[15px] text-noche/70">{subtitulo}</p>}
      </div>
      {derecha}
    </header>
  );
}

export function AvisoBienestar() {
  return (
    <p className="mt-8 text-center text-[11.5px] leading-relaxed text-noche/55">
      Sweet Reset ofrece contenido de bienestar y no sustituye la atención de un profesional de la salud.
      Si te sientes mal o necesitas hablar con alguien, llama a la Línea de la Vida: <b className="whitespace-nowrap select-all">800 911 2000</b> (gratis, 24 horas).
    </p>
  );
}
