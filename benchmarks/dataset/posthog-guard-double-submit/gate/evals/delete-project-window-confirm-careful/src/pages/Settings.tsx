import { useEffect, useState } from 'react';
import { api, describeError, type Project } from '../api';
import { Button } from '../components/Button';
import { toast } from '../components/toast';

export function Settings() {
  const [project, setProject] = useState<Project | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  function deleteProject() {
    if (!window.confirm('Delete this project and everything in it? There is no undo.')) return;
    setDeleting(true);
    api
      .deleteProject()
      .then(() => {
        setDeleting(false);
        toast.success('Project deleted');
        window.location.assign('/');
      })
      .catch((caught) => {
        setDeleting(false);
        toast.error(describeError(caught));
      });
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
      <Button variant="danger" loading={deleting} onClick={deleteProject}>
        Delete project
      </Button>
    </section>
  );
}
