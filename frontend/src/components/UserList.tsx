import { useEffect, useState } from "react";
import { getUsers, User } from "../services/api";

function UserList(): JSX.Element {
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const loadUsers = async (): Promise<void> => {
      try {
        const response = await getUsers();
        setUsers(response);
        setError("");
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load users"
        );
      }
    };

    void loadUsers();
  }, []);

  return (
    <section className="card">
      <h2>Users</h2>
      {error ? <p className="status status--error">{error}</p> : null}
      <ul className="list">
        {users.map((user) => (
          <li key={user.id}>
            <strong>{user.name}</strong>
            <span>
              {user.role} · {user.email}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default UserList;
