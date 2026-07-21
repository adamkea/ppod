import { supabase } from '@/lib/supabase';
import type { Pod, PodMember } from '@/types/database';

export async function listMyPods(): Promise<Pod[]> {
  // RLS limits this to pods the caller is a member of.
  const { data, error } = await supabase
    .from('pods')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getPod(podId: string): Promise<Pod> {
  const { data, error } = await supabase
    .from('pods')
    .select('*')
    .eq('id', podId)
    .single();
  if (error) throw error;
  return data;
}

export async function createPod(name: string): Promise<Pod> {
  const { data, error } = await supabase.rpc('create_pod', { _name: name });
  if (error) throw error;
  return data as Pod;
}

export async function joinPod(inviteCode: string): Promise<Pod> {
  const { data, error } = await supabase.rpc('join_pod', {
    _invite_code: inviteCode,
  });
  if (error) throw error;
  return data as Pod;
}

export async function renamePod(podId: string, name: string): Promise<void> {
  const { error } = await supabase.from('pods').update({ name }).eq('id', podId);
  if (error) throw error;
}

export async function setPodCommentsEnabled(
  podId: string,
  enabled: boolean,
): Promise<void> {
  // Owner-only at the RLS layer.
  const { error } = await supabase
    .from('pods')
    .update({ comments_enabled: enabled })
    .eq('id', podId);
  if (error) throw error;
}

export async function deletePod(podId: string): Promise<void> {
  // Owner-only at the RLS layer.
  const { error } = await supabase.from('pods').delete().eq('id', podId);
  if (error) throw error;
}

export async function listMembers(podId: string): Promise<PodMember[]> {
  const { data, error } = await supabase
    .from('pod_members')
    .select('*')
    .eq('pod_id', podId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}
