import { useState } from 'react';
import { Alert } from './ui/Feedback.jsx';
import { Button } from './ui/Button.jsx';
import { Field, Input, Select, Textarea } from './ui/Form.jsx';
import { Modal } from './ui/Modal.jsx';

const BLANK = {
  name: '', project_name: '', contact_name: '', contact_email: '', contact_phone: '',
  status: 'lead', contract_price: '', due_date: '', notes: '', currency: 'PHP',
};

const STATUSES = [
  { value: 'lead', label: 'Lead' },
  { value: 'active', label: 'Active' },
  { value: 'on_hold', label: 'On hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export function ClientForm({ client, onClose, onSave }) {
  const [form, setForm] = useState(() => ({
    ...BLANK,
    ...client,
    contract_price: client?.contract_price ?? '',
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSave({
        ...form,
        contract_price: Number(form.contract_price),
        due_date: form.due_date || null,
        contact_email: form.contact_email || null,
      });
      onClose();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <Modal
      title={client ? 'Edit client' : 'Add a new client'}
      description={client ? 'Update the details for this engagement.' : 'Create the client and its delivery board.'}
      onClose={onClose}
      wide
      footer={
        <>
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="client-form" variant="primary" loading={saving}>
            {client ? 'Save changes' : 'Create client'}
          </Button>
        </>
      }
    >
      <form id="client-form" onSubmit={submit} className="form-grid">
        {error && (
          <div className="span-2">
            <Alert>{error}</Alert>
          </div>
        )}

        <Field label="Client or business name">
          {(props) => (
            <Input {...props} required value={form.name} onChange={set('name')} placeholder="e.g. Acme Studio" />
          )}
        </Field>

        <Field label="Project name">
          {(props) => (
            <Input
              {...props}
              required
              value={form.project_name}
              onChange={set('project_name')}
              placeholder="e.g. Ecommerce website"
            />
          )}
        </Field>

        <Field label="Contact person" optional>
          {(props) => (
            <Input {...props} value={form.contact_name || ''} onChange={set('contact_name')} placeholder="Full name" />
          )}
        </Field>

        <Field label="Email address" optional>
          {(props) => (
            <Input
              {...props}
              type="email"
              value={form.contact_email || ''}
              onChange={set('contact_email')}
              placeholder="client@example.com"
            />
          )}
        </Field>

        <Field label="Phone number" optional>
          {(props) => (
            <Input {...props} value={form.contact_phone || ''} onChange={set('contact_phone')} placeholder="+63" />
          )}
        </Field>

        <Field label="Project status">
          {(props) => (
            <Select {...props} value={form.status} onChange={set('status')}>
              {STATUSES.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field label="Contract price" hint="Total agreed value, before any payments.">
          {(props) => (
            <Input
              {...props}
              required
              type="number"
              min="0"
              step="0.01"
              value={form.contract_price}
              onChange={set('contract_price')}
              placeholder="0.00"
            />
          )}
        </Field>

        <Field label="Due date" optional>
          {(props) => <Input {...props} type="date" value={form.due_date || ''} onChange={set('due_date')} />}
        </Field>

        <Field label="Notes" optional span>
          {(props) => (
            <Textarea
              {...props}
              value={form.notes || ''}
              onChange={set('notes')}
              placeholder="Project context, preferences, or reminders"
            />
          )}
        </Field>
      </form>
    </Modal>
  );
}
