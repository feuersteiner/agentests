import { useState } from 'react';
import type { Role } from '../api/client';
import { useMembers } from '../hooks/useMembers';
import { formatLastActive, roleLabel } from '../lib/format';

const roles: Role[] = ['owner', 'admin', 'member'];

export function Members() {
  const [role, setRole] = useState<Role | 'all'>('all');
  const { members, error } = useMembers({ role: role === 'all' ? undefined : role, sort: 'name' });

  return (
    <section>
      <h1>Members</h1>
      <label>
        Role{' '}
        <select value={role} onChange={(event) => setRole(event.target.value as Role | 'all')}>
          <option value="all">All roles</option>
          {roles.map((option) => (
            <option key={option} value={option}>
              {roleLabel(option)}
            </option>
          ))}
        </select>
      </label>
      {error && <p role="alert">{error}</p>}
      {!error && !members && <p>Loading members…</p>}
      {members && (
        <ul>
          {members.map((member) => (
            <li key={member.id}>
              {member.name} ({member.email}), {roleLabel(member.role)}, last active {formatLastActive(member.lastActiveAt)}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
