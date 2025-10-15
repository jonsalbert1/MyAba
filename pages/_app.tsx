import type { AppProps } from "next/app";
import Head from "next/head";
import NavBar from "@/components/NavBar";
import "@/styles/globals.css";

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>myABA Study Suite</title>
      </Head>
      <NavBar />
      <Component {...pageProps} />
    </>
  );
}
