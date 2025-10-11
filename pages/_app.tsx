// pages/_app.tsx
import type { AppProps } from "next/app";
import "../styles/globals.css";
import NavBar from "../components/NavBar";

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <main className="min-h-screen bg-gray-50">
      <NavBar />
      <Component {...pageProps} />
    </main>
  );
}
