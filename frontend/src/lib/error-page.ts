export function renderErrorPage(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>ChurnSense - Server Error</title>
  </head>
  <body>
    <main style="min-height:100vh;display:grid;place-items:center;font-family:system-ui,sans-serif">
      <div style="max-width:32rem;padding:2rem;text-align:center">
        <h1>Something went wrong</h1>
        <p>ChurnSense could not complete this request. Please try again.</p>
        <a href="/">Go home</a>
      </div>
    </main>
  </body>
</html>`;
}
