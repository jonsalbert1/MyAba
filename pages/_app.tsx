import type { AppProps } from "next/app";
import "@/styles/globals.css";
import TopNav from "@/components/TopNav";

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <TopNav />
      <Component {...pageProps} />
    </>
  );
}
