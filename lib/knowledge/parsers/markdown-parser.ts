import type { DocumentParser, ParsedDocument } from "./document-parser";
import { KNOWLEDGE_LIMITS } from "../types";

export class MarkdownParser implements DocumentParser {
  async parse(input: Buffer | string): Promise<ParsedDocument> {
    const text =
      typeof input === "string" ? input : input.toString("utf8");
    const normalized = text.replace(/\r\n/g, "\n").trim();
    if (normalized.length > KNOWLEDGE_LIMITS.maxFileChars) {
      return {
        text: normalized.slice(0, KNOWLEDGE_LIMITS.maxFileChars),
        metadata: { truncated: true },
      };
    }
    return { text: normalized };
  }
}
