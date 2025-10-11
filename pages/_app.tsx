// pages/_app.tsx
import type { AppProps } from "next/app";
import NavBar from "../components/NavBar"; // uses baseUrl or tsconfig paths if set; otherwise use "../components/NavBar"

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <NavBar />
      <Component {...pageProps} />
    </>
  );
}
