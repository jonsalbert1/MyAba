export default function NotFound() {
  return (
    <main style={{ minHeight: '100vh', padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, color: '#b91c1c' }}>404 – Page not found</h1>
      <p style={{ marginTop: 8 }}>
        Try the <a href="/">home page</a> or <a href="/flashcards">Flashcards</a>.
      </p>
    </main>
  );
}
