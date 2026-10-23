import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export type Taxonomy = {
  version: number;
  KEYWORDS: Record<string, string>;
  WORD_ALIASES: Record<string, string>;
  AND_WORDS: string[];
  OR_WORDS: string[];
  TYPE_ALIASES: Record<string, string>;
  LEAF_PARENT: Record<string, string>;
  LEAF_EXTENSIONS: Record<string, string[]>;
  EXTRA_CLASSES: Record<string, string[]>;
  CODE_NAMES: string[];
  DATA_DOTFILES: string[];
  PACKAGE_EXTENSIONS: string[];
  AMBIGUOUS_DEFAULT: Record<string, string>;
  SNIFF_TEXT_LEAF: Record<string, string>;
  TEXT_RANK: string[];
  OFFICE_RANK: string[];
  LEAF_SHORT?: Record<string, string>;
  LAYER1_NAMES?: string[];
  LEAF_NAMES?: Record<string, string>;
};

const here = dirname(fileURLToPath(import.meta.url));
export const taxonomy: Taxonomy = JSON.parse(
  readFileSync(join(here, "taxonomy.json"), "utf8"),
);
export const knownTypeValues = new Set(Object.values(taxonomy.TYPE_ALIASES));
