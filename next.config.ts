import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  pageExtensions: ["ts", "tsx"],
  serverExternalPackages: ["@react-pdf/renderer"],
  outputFileTracingIncludes: { "/**": ["./content/**/*"], "/api/report/pdf": ["./node_modules/@expo-google-fonts/inter/**/*.ttf", "./node_modules/@expo-google-fonts/jetbrains-mono/**/*.ttf"] },
  async redirects() {
    // Route'lar sabit (§1b). Eski / alternatif adlar buraya kalıcı yönlendirme olarak eklenir.
    return [
      { source: "/terimler", destination: "/sozluk", permanent: true },
      { source: "/terimler/:slug", destination: "/sozluk/:slug", permanent: true },
      { source: "/hesap-makinesi", destination: "/hesapla", permanent: true },
      { source: "/rapor-yorumla", destination: "/rapor", permanent: true },
      { source: "/spec", destination: "/mecra", permanent: true },
      { source: "/reach", destination: "/reach-tahmin", permanent: true },
    ];
  },
};

export default nextConfig;
