-- Migration: Drop audit_logs table and related policies
drop policy if exists "System and users can insert audit logs" on public.audit_logs;
drop policy if exists "Audit logs viewable by agency and platform admins" on public.audit_logs;
drop table if exists public.audit_logs cascade;
