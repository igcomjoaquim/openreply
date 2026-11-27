/** Tipos de dificuldade de som dos trechos (sem banco de dados: dá pra usar em scripts). */
export type Tipo = "numeros" | "negativa" | "final" | "parecidas";
export const TIPO_INFO: Record<Tipo, { nome: string; dica: string }> = {
  numeros: { nome: "🔢 Números parecidos", dica: "Números como fifteen × fifty soam parecido: no -TEEN a força vai no fim (fif-TEEN); no -TY vai no começo (FIF-ty)." },
  negativa: { nome: "➖ Negativa escondida", dica: "O 'not' quase some na fala: wasn't, can't, didn't viram um 'n' rapidinho. Preste atenção no fim do verbo." },
  final: { nome: "⏮️ Final que some", dica: "O fim das palavras (-ED, -S, o tempo do verbo) é falado bem fraco. Escute o finalzinho." },
  parecidas: { nome: "🔤 Palavras com som parecido", dica: "Duas palavras quase iguais, como Friday × Sunday: preste atenção no começo e nas vogais." },
};



const NUM = /\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|\d+)\b/;
const NEG = /\b(not|never|no|\w+n't)\b/;
function words(s: string): string[] {
  return s.toLowerCase().replace(/[’`´]/g, "'").replace(/[^a-z0-9' ]/g, " ").split(/\s+/).filter(Boolean);
}
/** palavras que mudam entre a frase certa e a errada */
export function diffWords(a: string, b: string): [string[], string[]] {
  const wa = words(a), wb = words(b);
  return [wa.filter((w) => !wb.includes(w)), wb.filter((w) => !wa.includes(w))];
}
export function tipoOf(options: string[], answer: number): Tipo {
  const right = options[answer] ?? "";
  const counts: Record<Tipo, number> = { numeros: 0, negativa: 0, final: 0, parecidas: 0 };
  options.forEach((o, i) => {
    if (i === answer) return;
    const [x, y] = diffWords(right, o);
    const all = [...x, ...y].join(" ");
    if (NUM.test(all)) counts.numeros++;
    else if (NEG.test(all) || /n't/.test(all)) counts.negativa++;
    else if (x.some((w) => y.some((v) => v !== w && (v.startsWith(w) || w.startsWith(v)) && Math.abs(v.length - w.length) <= 3))) counts.final++;
    else counts.parecidas++;
  });
  return (Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] as Tipo) || "parecidas";
}

