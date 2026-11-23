import { useEffect, useState } from 'react';
import { api, describeError, type Member } from '../api';
import { roleLabel } from '../lib/format';

export function Team() {
  const [members, setMembers] = useState<Member[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    api.getMembers().then(setMembers, (caught) => setError(describeError(caught)));
  }, []);

  if (error) return <p role="alert">{error}</p>;
  if (!members) return <p>Loading…</p>;

  const needle = filter.trim().toLowerCase();
  const shown = members.filter(
    (member) => member.name.toLowerCase().includes(needle) || member.email.toLowerCase().includes(needle)
  );

  return (
    <section>
      <h1>Team</h1>
      <input
        type="search"
        aria-label="Filter members"
        placeholder="Filter by name or email"
        value={filter}
        onChange={(event) => setFilter(event.target.value)}
      />
      <ul>
        {shown.map((member) => (
          <li key={member.id}>
            {member.name} ({member.email}), {roleLabel(member.role)}
          </li>
        ))}
      </ul>
    </section>
  );
}
