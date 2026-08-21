import path from "node:path";

import { Font } from "@react-pdf/renderer";

/**
 * The same TTFs QuestPDF embedded, copied out of `nutrimurt.Api/Assets/Fonts/`
 * so they survive PR 7 deleting the .NET project.
 *
 * Resolved from `process.cwd()` rather than bundled, so `next.config.ts` has
 * to trace them into the serverless function — see `outputFileTracingIncludes`
 * there. Without that the route works locally and 500s on Vercel.
 */
const fontsDir = path.join(process.cwd(), "lib", "pdf", "fonts");

let registered = false;

export function registerPdfFonts() {
  if (registered) return;

  /**
   * DM Sans ships here as a single variable font, and there is no italic file
   * at all — DM Sans Italic is a separate family the .NET project never
   * embedded.
   *
   * `@react-pdf/renderer` picks a registered file per weight/style and
   * synthesises neither bold nor oblique, so every combination below points at
   * the one file. Size, colour, letter-spacing and layout are exact; what is
   * lost is the heavier stroke on headings and the slant on the two
   * "Sem itens" messages. QuestPDF got real weights from the same file because
   * it passes variable axes through to Skia, and slanted the glyphs itself.
   *
   * This is the known fidelity gap for R2. Closing it means adding static
   * DM Sans weights, and an italic, as separate TTFs. Registering every
   * combination is still required — an unregistered one throws at render time
   * rather than falling back, which is how this surfaced.
   */
  const dmSans = path.join(fontsDir, "DMSans-Variable.ttf");

  Font.register({
    family: "DM Sans",
    fonts: [
      { src: dmSans, fontWeight: 400 },
      { src: dmSans, fontWeight: 500 },
      { src: dmSans, fontWeight: 600 },
      { src: dmSans, fontWeight: 700 },
      { src: dmSans, fontWeight: 400, fontStyle: "italic" },
      { src: dmSans, fontWeight: 500, fontStyle: "italic" },
      { src: dmSans, fontWeight: 600, fontStyle: "italic" },
      { src: dmSans, fontWeight: 700, fontStyle: "italic" },
    ],
  });

  Font.register({
    family: "DM Mono",
    fonts: [
      { src: path.join(fontsDir, "DMMono-Regular.ttf"), fontWeight: 400 },
      { src: path.join(fontsDir, "DMMono-Medium.ttf"), fontWeight: 500 },
      { src: path.join(fontsDir, "DMMono-Medium.ttf"), fontWeight: 700 },
    ],
  });

  // The layout is a fixed grid of short strings; hyphenating them mid-word
  // only ever makes it worse.
  Font.registerHyphenationCallback((word) => [word]);

  registered = true;
}
