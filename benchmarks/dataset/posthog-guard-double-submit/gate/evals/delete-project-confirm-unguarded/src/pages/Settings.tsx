import { useEffect, useState } from 'react';
import { api, describeError, type Project } from '../api';
import { Button } from '../components/Button';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { toast } from '../components/toast';

export function Settings() {
  const [project, setProject] = useState<Project | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  async function deleteProject() {
    try {
      await api.deleteProject();
      toast.success('Project deleted');
      window.location.assign('/');
    } catch (caught) {
      toast.error(describeError(caught));
    } finally {
      setConfirming(false);
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
      <h2>Danger zone</h2>
      <Button variant="danger" onClick={() => setConfirming(true)}>
        Delete project
      </Button>
      <ConfirmDialog
        open={confirming}
        title="Delete this project?"
        confirmLabel="Delete project"
        danger
        onConfirm={deleteProject}
        onCancel={() => setConfirming(false)}
      >
        This deletes {project.name} and everything in it. There is no undo.
      </ConfirmDialog>
    </section>
  );
}
