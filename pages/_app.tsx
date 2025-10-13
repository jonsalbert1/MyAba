// pages/_app.tsx
import type { AppProps } from "next/app";
import Head from "next/head";
import NavBar from "../components/NavBar";
import "../styles/globals.css";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        {/* Proper scaling on phones/tablets */}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>MyABA</title>
      </Head>

      <NavBar />
      <Component {...pageProps} />
    </>
  );
}
