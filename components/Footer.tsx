export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer
      style={{
        textAlign: "center",
        padding: "24px 0",
        marginTop: "40px",
        fontSize: "1.1rem",
        color: "#000",
      }}
    >
      <hr style={{ marginBottom: "16px" }} />
      <a
        href="https://myaba.app"
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: "#000", textDecoration: "none", fontWeight: "600" }}
      >
        © myaba.app {year}
      </a>
    </footer>
  );
}
