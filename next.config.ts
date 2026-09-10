import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // React Compiler: memoiza componentes/hooks automaticamente, evitando
  // re-renders desnecessários sem precisar espalhar useMemo/useCallback.
  reactCompiler: true,
  experimental: {
    // Usa a versão nativa em Rust (dentro do Turbopack) — mais rápida
    // que a transformação via Babel e dispensa instalar o plugin.
    turbopackRustReactCompiler: true,
  },
};

export default nextConfig;
