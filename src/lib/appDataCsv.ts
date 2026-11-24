export const APP_DATA_KEYS = [
  "influencers",
  "campaigns",
  "coupons",
  "recurrences",
  "ideaDeposits",
  "shipments",
  "tasks",
  "messageTemplates",
  "storeUnits",
] as const;

export type AppDataKey = (typeof APP_DATA_KEYS)[number];

export interface AppDataImportRow {
  dataKey: AppDataKey;
  data: unknown[];
}

const APP_DATA_KEY_SET = new Set<string>(APP_DATA_KEYS);

function parseSemicolonCsv(source: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];

    if (quoted) {
      if (character === '"' && source[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"' && field.length === 0) {
      quoted = true;
    } else if (character === ";") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.replace(/\r$/, ""));
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  if (quoted) throw new Error("O arquivo CSV possui um campo sem fechamento.");
  row.push(field.replace(/\r$/, ""));
  if (row.some((value) => value.length > 0)) rows.push(row);
  return rows;
}

export function parseAppDataCsv(source: string): AppDataImportRow[] {
  const rows = parseSemicolonCsv(source.replace(/^\uFEFF/, ""));
  if (rows.length < 2) throw new Error("O arquivo CSV está vazio ou não possui registros.");

  const header = rows[0];
  const keyIndex = header.indexOf("data_key");
  const dataIndex = header.indexOf("data");
  if (keyIndex < 0 || dataIndex < 0) {
    throw new Error("O arquivo precisa conter as colunas data_key e data.");
  }

  const parsed: AppDataImportRow[] = [];
  const seen = new Set<string>();

  rows.slice(1).forEach((columns, rowIndex) => {
    const dataKey = columns[keyIndex]?.trim();
    if (!APP_DATA_KEY_SET.has(dataKey)) {
      throw new Error(`Categoria desconhecida na linha ${rowIndex + 2}: ${dataKey || "vazia"}.`);
    }
    if (seen.has(dataKey)) {
      throw new Error(`A categoria ${dataKey} aparece mais de uma vez no arquivo.`);
    }

    let data: unknown;
    try {
      data = JSON.parse(columns[dataIndex] ?? "");
    } catch {
      throw new Error(`Os dados da categoria ${dataKey} não contêm um JSON válido.`);
    }
    if (!Array.isArray(data)) {
      throw new Error(`Os dados da categoria ${dataKey} precisam ser uma lista.`);
    }

    seen.add(dataKey);
    parsed.push({ dataKey: dataKey as AppDataKey, data });
  });

  return parsed;
}