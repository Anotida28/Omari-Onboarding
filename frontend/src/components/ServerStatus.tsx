import { useEffect, useState } from "react";
import { getHealth, HealthResponse } from "../services/api";

function ServerStatus(): JSX.Element {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const loadStatus = async (): Promise<void> => {
      try {
        const response = await getHealth();
        setData(response);
        setError("");
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to reach the backend"
        );
      }
    };

    void loadStatus();
  }, []);

  return (
    <section className="card">
      <h2>Server Status</h2>
      {data ? (
        <p className="status status--success">
          {data.status.toUpperCase()}: {data.message}
        </p>
      ) : (
        <p>Checking backend connection...</p>
      )}
      {error ? <p className="status status--error">{error}</p> : null}
    </section>
  );
}

export default ServerStatus;
