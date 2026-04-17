import { useState } from "react";
import { testEndpoint } from "../services/api";

function ApiTester(): JSX.Element {
  const [path, setPath] = useState("/health");
  const [responseBody, setResponseBody] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const handleTest = async (): Promise<void> => {
    setLoading(true);
    setError("");

    try {
      const response = await testEndpoint(path);
      setResponseBody(JSON.stringify(response, null, 2));
    } catch (caughtError) {
      setResponseBody("");
      setError(
        caughtError instanceof Error ? caughtError.message : "Request failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="card api-tester">
      <h2>API Tester</h2>
      <p>Try `/health` or `/users` against the backend API.</p>
      <div className="api-tester__controls">
        <input
          value={path}
          onChange={(event) => setPath(event.target.value)}
          placeholder="/health"
        />
        <button type="button" onClick={handleTest} disabled={loading}>
          {loading ? "Testing..." : "Send Request"}
        </button>
      </div>
      {error ? <p className="status status--error">{error}</p> : null}
      {responseBody ? <pre className="response">{responseBody}</pre> : null}
    </section>
  );
}

export default ApiTester;
