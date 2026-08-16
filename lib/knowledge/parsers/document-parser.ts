export type ParsedDocument = {
  text: string;
  /** Optional page-level segments for PDFs */
  pages?: { pageNumber: number; text: string }[];
  metadata?: Record<string, unknown>;
};

export interface DocumentParser {
  parse(input: Buffer | string, filename?: string): Promise<ParsedDocument>;
}
