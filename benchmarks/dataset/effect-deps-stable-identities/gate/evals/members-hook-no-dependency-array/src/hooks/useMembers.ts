import { useEffect, useState } from 'react';
import { describeError, fetchMembers, type Member, type MemberQuery } from '../api/client';
import { useAccount } from '../context/AccountContext';

export interface MembersState {
  /** `null` until the first response arrives. */
  members: Member[] | null;
  error: string | null;
}

/** The people who can sign in to the account picked in the header. */
export function useMembers(query: MemberQuery): MembersState {
  const { account } = useAccount();
  const accountId = account.id;
  const { role, sort } = query;
  const [members, setMembers] = useState<Member[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchMembers(accountId, { role, sort }, controller.signal).then(setMembers, (caught: unknown) => {
      if (!controller.signal.aborted) setError(describeError(caught));
    });
    return () => controller.abort();
  });

  return { members, error };
}
