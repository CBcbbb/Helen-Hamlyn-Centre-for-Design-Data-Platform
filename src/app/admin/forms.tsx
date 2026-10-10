'use client';

import { useActionState, useId } from 'react';
import { useFormStatus } from 'react-dom';
import { addRecord, login, removeRecord, saveRecord, type FormState } from './actions';
import type { EditableField } from '@/lib/admin/csv-store';
import type { NodeType } from '@/lib/types';
import { TYPE_META } from '@/lib/types-meta';

const initial: FormState = {};

function Submit({ children, variant = 'primary' }: { children: string; variant?: 'primary' | 'secondary' }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={`btn btn-${variant}`} aria-disabled={pending} disabled={pending}>
      {pending ? 'Working…' : children}
    </button>
  );
}

function Feedback({ state }: { state: FormState }) {
  return (
    <div role="status" aria-live="polite" className="min-h-6">
      {state.error && (
        <p className="rounded-md bg-[var(--color-partners-tint)] px-4 py-3 text-[var(--color-partners-hover)]">{state.error}</p>
      )}
      {state.message && (
        <p className="rounded-md bg-[var(--color-methods-tint)] px-4 py-3 text-[var(--color-methods-text)]">{state.message}</p>
      )}
    </div>
  );
}

const inputClass =
  'w-full rounded-md border-0 bg-paper px-3 py-2.5 text-base text-ink ring-1 ring-control focus:outline-none focus-visible:ring-2 focus-visible:ring-accent';

export function LoginForm() {
  const [state, action] = useActionState(login, initial);
  return (
    <form action={action} className="space-y-5">
      <div>
        <label htmlFor="password" className="heading mb-1.5 block text-[0.9375rem]">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className={inputClass}
          aria-describedby={state.error ? 'login-error' : undefined}
          aria-invalid={state.error ? true : undefined}
        />
      </div>
      <div id="login-error">
        <Feedback state={state} />
      </div>
      <Submit>Sign in</Submit>
    </form>
  );
}

export function EditForm({ type, id, fields }: { type: NodeType; id: string; fields: EditableField[] }) {
  const [state, action] = useActionState(saveRecord, initial);
  const uid = useId();
  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="id" value={id} />
      {fields.map((f) => {
        const fid = `${uid}-${f.key}`;
        const hint = f.isLink ? 'One link per line.' : f.multiline ? 'Leave a blank line between paragraphs.' : undefined;
        return (
          <div key={f.key}>
            <label htmlFor={fid} className="heading mb-0.5 block text-[0.9375rem]">
              {f.header.replace(/\s*\[[^\]]*\]\s*$/, '')}
              {f.key === 'name' && <span className="meta font-normal"> (required)</span>}
            </label>
            {hint && (
              <p id={`${fid}-hint`} className="meta mb-1.5">
                {hint}
              </p>
            )}
            {f.multiline ? (
              <textarea
                id={fid}
                name={f.key}
                defaultValue={f.value}
                rows={f.isLink ? 2 : Math.min(12, Math.max(3, Math.ceil(f.value.length / 90)))}
                className={`${inputClass} font-serif leading-relaxed`}
                aria-describedby={hint ? `${fid}-hint` : undefined}
              />
            ) : (
              <input id={fid} name={f.key} defaultValue={f.value} required={f.key === 'name'} className={inputClass} />
            )}
          </div>
        );
      })}
      <Feedback state={state} />
      <Submit>Save changes</Submit>
    </form>
  );
}

export function AddForm({ type }: { type: NodeType }) {
  const [state, action] = useActionState(addRecord, initial);
  const meta = TYPE_META[type];
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="type" value={type} />
      <div className="min-w-0 flex-1">
        <label htmlFor={`add-${type}`} className="meta mb-1 block">
          New {meta.singularLower}
        </label>
        <input id={`add-${type}`} name="name" required placeholder="Name" className={inputClass} />
      </div>
      <Submit variant="secondary">{`Add ${meta.singularLower}`}</Submit>
      <div className="basis-full">
        <Feedback state={state} />
      </div>
    </form>
  );
}

export function DeleteForm({ type, id, name }: { type: NodeType; id: string; name: string }) {
  const [state, action] = useActionState(removeRecord, initial);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="id" value={id} />
      <label className="flex items-start gap-3 text-[0.9375rem]">
        <input type="checkbox" name="confirm" value="yes" required className="mt-1 size-4 accent-[var(--color-partners-text)]" />
        <span>
          Delete {name} and every link to it. This changes the CSV files and cannot be undone here (use git to recover).
        </span>
      </label>
      <Feedback state={state} />
      <Submit variant="secondary">{`Delete ${TYPE_META[type].singularLower}`}</Submit>
    </form>
  );
}
