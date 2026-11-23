import { useEffect, useState } from 'react';
import { api, describeError, type Project } from '../api';
import { Button } from '../components/Button';
import { toast } from '../components/toast';

export function Settings() {
  const [project, setProject] = useState<Project | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function sendTestEmail() {
    setSending(true);
    try {
      const { sentTo } = await api.sendTestEmail();
      toast.success(`Test email sent to ${sentTo}`);
    } catch (caught) {
      toast.error(describeError(caught));
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    api.getProject().then(setProject, (caught) => setError(describeError(caught)));
  }, []);

  if (error) return <p role="alert">{error}</p>;
  if (!project) return <p>Loading…</p>;

  function copyId(id: string) {
    void navigator.clipboard.writeText(id);
    toast.success('Project ID copied');
  }

  return (
    <section>
      <h1>Project settings</h1>
      <dl>
        <dt>Name</dt>
        <dd>{project.name}</dd>
        <dt>Project ID</dt>
        <dd>
          <code>{project.id}</code> <Button onClick={() => copyId(project.id)}>Copy</Button>
        </dd>
        <dt>Notification email</dt>
        <dd>{project.notificationEmail}</dd>
      </dl>
      <Button variant="primary" loading={sending} onClick={sendTestEmail}>
        Send test email
      </Button>
    </section>
  );
}
