'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { adminConfig, checkPassword, endSession, requireAdmin, startSession } from '@/lib/admin/auth';
import { canWrite, createRecord, deleteRecord, updateRecord } from '@/lib/admin/csv-store';
import { NODE_TYPES, type NodeType } from '@/lib/types';
import { FILE_CONFIG } from '@/lib/convert';

export interface FormState {
  error?: string;
  message?: string;
}

function asType(value: FormDataEntryValue | null): NodeType {
  const t = String(value ?? '');
  if (!(NODE_TYPES as readonly string[]).includes(t)) throw new Error('Unknown entity type.');
  return t as NodeType;
}

function asId(value: FormDataEntryValue | null): string {
  const id = String(value ?? '').trim();
  if (!/^[A-Z]{1,3}\d{1,5}$/.test(id)) throw new Error('Invalid ID.');
  return id;
}

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const config = adminConfig();
  if (!config) return { error: 'The admin is switched off. Set ADMIN_PASSWORD and ADMIN_SESSION_SECRET.' };
  const password = String(formData.get('password') ?? '');
  // Slow down guessing a little; there is no lockout.
  await new Promise((r) => setTimeout(r, 400));
  if (!checkPassword(password, config)) return { error: 'That password is not correct.' };
  await startSession(config);
  redirect('/admin');
}

export async function logout() {
  await endSession();
  redirect('/admin');
}

function ensureWritable() {
  if (!canWrite()) {
    throw new Error(
      'The data folder is read-only on this server, so changes cannot be saved here. Edit locally and commit the CSV files.',
    );
  }
}

export async function saveRecord(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    await requireAdmin();
    ensureWritable();
    const type = asType(formData.get('type'));
    const id = asId(formData.get('id'));
    const keys = Object.values(FILE_CONFIG.find((c) => c.type === type)!.headers).filter((k) => k !== 'id');
    const values = Object.fromEntries(keys.map((k) => [k, String(formData.get(k) ?? '')]));
    const { report } = updateRecord(type, id, values);
    revalidatePath('/', 'layout');
    const notes = report.dangling_links.length ? ` ${report.dangling_links.length} link(s) point to missing IDs.` : '';
    return { message: `Saved. The data file and report were rebuilt.${notes} Restart or rebuild the site to publish.` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Saving failed.' };
  }
}

export async function addRecord(_prev: FormState, formData: FormData): Promise<FormState> {
  let id: string;
  try {
    await requireAdmin();
    ensureWritable();
    const type = asType(formData.get('type'));
    const name = String(formData.get('name') ?? '').trim();
    if (!name) return { error: 'Enter a name.' };
    id = createRecord(type, name);
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Adding failed.' };
  }
  redirect(`/admin/edit/${id}?created=1`);
}

export async function removeRecord(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    await requireAdmin();
    ensureWritable();
    if (formData.get('confirm') !== 'yes') return { error: 'Tick the box to confirm.' };
    deleteRecord(asType(formData.get('type')), asId(formData.get('id')));
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Deleting failed.' };
  }
  redirect('/admin?deleted=1');
}
