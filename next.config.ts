import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep ONNX / transformers native deps out of the Next bundler (server-only RAG).
  serverExternalPackages: [
    "@huggingface/transformers",
    "onnxruntime-node",
    "sharp",
  ],
};

export default nextConfig;
