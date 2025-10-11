// pages/_app.tsx
import type { AppProps } from "next/app";
import "../styles/globals.css";            // <-- required
import NavBar from "../components/NavBar"; // ok to keep

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <NavBar />
      <Component {...pageProps} />
    </>
  );
}
