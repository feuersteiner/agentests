import { useEffect, useState, type FormEvent } from 'react';
import { api, describeError, type Member } from '../api';
import { Button } from '../components/Button';
import { toast } from '../components/toast';
import { roleLabel } from '../lib/format';
import { isValidEmail } from '../lib/validate';

export function Team() {
  const [members, setMembers] = useState<Member[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [email, setEmail] = useState('');
  const [inviting, setInviting] = useState(false);

  async function invite(event: FormEvent) {
    event.preventDefault();
    if (!isValidEmail(email)) {
      toast.error('Enter a valid email address.');
      return;
    }
    setInviting(true);
    try {
      const invited = await api.inviteMember(email.trim());
      toast.success(`Invitation sent to ${invited.email}`);
      setEmail('');
      setInviting(false);
    } catch (caught) {
      toast.error(describeError(caught));
    }
  }

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
      <form onSubmit={invite}>
        <label htmlFor="invite-email">Invite a teammate</label>
        <input
          id="invite-email"
          type="email"
          placeholder="name@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Button type="submit" variant="primary" loading={inviting}>
          Send invite
        </Button>
      </form>
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
