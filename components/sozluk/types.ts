export type TermListItem = {
  slug: string;
  terim: string;
  acik?: string;
  kategori: string[];
  seviye: "temel" | "orta" | "ileri";
  tanim: string;
};
