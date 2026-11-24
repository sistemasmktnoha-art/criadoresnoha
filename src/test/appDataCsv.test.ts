import { describe, expect, it } from "vitest";
import { parseAppDataCsv } from "@/lib/appDataCsv";

describe("parseAppDataCsv", () => {
  it("lê o formato exportado e preserva ponto e vírgula e quebra de linha no JSON", () => {
    const csv = 'id;user_id;data_key;data;updated_at\n1;old-user;influencers;"[{""id"":""1"",""notes"":""linha 1; linha 2\\ncontinua""}]";2026-09-21\n';
    const result = parseAppDataCsv(csv);

    expect(result).toEqual([
      { dataKey: "influencers", data: [{ id: "1", notes: "linha 1; linha 2\ncontinua" }] },
    ]);
  });

  it("recusa categorias não utilizadas pela aplicação", () => {
    const csv = 'data_key;data\nunknown;"[]"';
    expect(() => parseAppDataCsv(csv)).toThrow("Categoria desconhecida");
  });

  it("recusa dados que não sejam listas", () => {
    const csv = 'data_key;data\ntasks;"{}"';
    expect(() => parseAppDataCsv(csv)).toThrow("precisam ser uma lista");
  });
});