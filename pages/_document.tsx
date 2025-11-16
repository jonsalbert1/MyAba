// pages/_document.tsx
import Document, { Html, Head, Main, NextScript } from "next/document";

class MyDocument extends Document {
  render() {
    return (
      <Html lang="en">
        <Head>
          {/* Favicon + PWA icons */}
          <link rel="icon" href="/favicon.ico" />
          <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-32.png" />
          <link rel="icon" type="image/png" sizes="16x16" href="/icons/icon-16.png" />

          {/* Apple / iOS icon */}
          <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-180.png" />

          {/* PWA manifest */}
          <link rel="manifest" href="/manifest.json" />

          {/* Theme color for address bar, etc. */}
          <meta name="theme-color" content="#3C78C8" />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
