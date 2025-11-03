// pages/safmeds.tsx
import dynamic from "next/dynamic";
import Head from "next/head";

const SafmedsMobile = dynamic(
  () => import("../components/SafmedsMobile"), // <-- this path
  { ssr: false }
);

export default function SafmedsPage() {
  return (
    <>
      <Head><title>SAFMEDS</title></Head>
      <SafmedsMobile />
    </>
  );
}