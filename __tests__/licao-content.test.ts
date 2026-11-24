import { describe, expect, it } from "vitest";
import { gapAnswers, lessonContentSchema, makeSlug } from "@/lib/licao/content";
import { extFromMime, isValidLessonFile } from "@/lib/licao/files";

describe("lição", () => {
  it("lê as respostas das lacunas", () => {
    expect(gapAnswers("If I [[were]] you, I [[wouldn't|would not]] go")).toEqual([["were"], ["wouldn't", "would not"]]);
  });
  it("monta o link sem acento", () => {
    expect(makeSlug("Ana & Júlia", "ab12")).toBe("ana-julia-ab12");
  });
  it("aceita só nomes de áudio aleatórios", () => {
    expect(isValidLessonFile("a".repeat(32) + ".mp3")).toBe(true);
    expect(isValidLessonFile("../x.mp3")).toBe(false);
  });
  it("entende o tipo da gravação do navegador", () => {
    expect(extFromMime("audio/webm;codecs=opus")).toBe("webm");
    expect(extFromMime("audio/mp4")).toBe("m4a");
    expect(extFromMime("text/html")).toBeNull();
  });
  it("recusa lição sem ditado", () => {
    expect(lessonContentSchema.safeParse({}).success).toBe(false);
  });
});
