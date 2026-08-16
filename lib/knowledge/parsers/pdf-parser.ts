import type { DocumentParser, ParsedDocument } from "./document-parser";
import { KNOWLEDGE_LIMITS } from "../types";

/**
 * PDF text extraction via pdf-parse v2 (PDFParse class).
 */
export class PdfParser implements DocumentParser {
  async parse(input: Buffer | string): Promise<ParsedDocument> {
    const buffer = typeof input === "string" ? Buffer.from(input) : input;
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });

    try {
      const result = await parser.getText();
      let text = (result.text ?? "").replace(/\r\n/g, "\n").trim();
      if (!text) {
        throw new Error("PDF contained no extractable text");
      }
      if (text.length > KNOWLEDGE_LIMITS.maxFileChars) {
        text = text.slice(0, KNOWLEDGE_LIMITS.maxFileChars);
      }

      const pages =
        result.pages?.length > 0
          ? result.pages.map((page) => ({
              pageNumber: page.num,
              text: page.text.trim().slice(0, KNOWLEDGE_LIMITS.maxFileChars),
            }))
          : [{ pageNumber: 1, text }];

      return {
        text,
        pages: pages.filter((p) => p.text.length > 0),
        metadata: { numpages: result.total },
      };
    } catch (error) {
      throw new Error(
        `PDF extraction failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      await parser.destroy().catch(() => undefined);
    }
  }
}
