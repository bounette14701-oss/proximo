'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { ErrorMessage, Spinner } from '@/components/Feedback';
import api from '@/lib/api';
import {
  INCIDENT_CATEGORY_LABELS,
  INCIDENT_STATUS_LABELS,
  USER_STATUS_LABELS,
  type AdminUser,
  type Incident,
  type IncidentStatus,
  type Invitation,
  type SyndicSettings,
} from '@/lib/types';

type Tab = 'users' | 'incidents' | 'invitations' | 'settings';

/**
 * Back-office administrateur (2FA obligatoire, vérifiée par l'API) :
 * - validation / suspension / suppression des membres
 * - modération des signalements (statuts)
 * - génération d'invitations + QR codes
 * - réglages du syndic / de l'agence
 */
export default function AdminPage() {
  const { isAdmin, user } = useAuth();
  const [tab, setTab] = useState<Tab>('users');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Utilisateurs
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [search, setSearch] = useState('');

  // Signalements
  const [incidents, setIncidents] = useState<Incident[] | null>(null);

  // Invitations
  const [invitations, setInvitations] = useState<Invitation[] | null>(null);
  const [invNeighborhood, setInvNeighborhood] = useState('');
  const [invHours, setInvHours] = useState(72);

  // Réglages syndic
  const [settings, setSettings] = useState<SyndicSettings | null>(null);
  const [agencyName, setAgencyName] = useState('');
  const [syndicEmail, setSyndicEmail] = useState('');

  const loadUsers = useCallback(() => {
    api<{ users: AdminUser[] }>(`/admin/users?search=${encodeURIComponent(search)}`)
      .then((data) => setUsers(data.users))
      .catch(() => setUsers([]));
  }, [search]);

  const loadIncidents = useCallback(() => {
    api<{ incidents: Incident[] }>('/admin/incidents')
      .then((data) => setIncidents(data.incidents))
      .catch(() => setIncidents([]));
  }, []);

  const loadInvitations = useCallback(() => {
    api<{ invitations: Invitation[] }>('/admin/invitations')
      .then((data) => setInvitations(data.invitations))
      .catch(() => setInvitations([]));
  }, []);

  const loadSettings = useCallback(() => {
    api<{ settings: SyndicSettings }>('/admin/settings')
      .then((data) => {
        setSettings(data.settings);
        setAgencyName(data.settings.agencyName ?? '');
        setSyndicEmail(data.settings.email ?? '');
      })
      .catch(() => setSettings(null));
  }, []);

  useEffect(() => {
    if (tab === 'users') loadUsers();
    if (tab === 'incidents') loadIncidents();
    if (tab === 'invitations') loadInvitations();
    if (tab === 'settings') loadSettings();
  }, [tab, loadUsers, loadIncidents, loadInvitations, loadSettings]);

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="text-4xl">🔒</div>
        <h1 className="mt-3 text-xl font-bold text-slate-900">Accès réservé</h1>
        <p className="mt-2 text-sm text-slate-600">Cette section est réservée aux administrateurs.</p>
      </div>
    );
  }

  const patchUser = async (id: string, data: { status?: string; role?: string }) => {
    setError(null);
    setSuccess(null);
    try {
      await api(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
      setSuccess('Utilisateur mis à jour.');
      loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mise à jour impossible');
    }
  };

  const deleteUser = async (id: string, email: string) => {
    if (!window.confirm(`Supprimer définitivement ${email} ?`)) return;
    setError(null);
    setSuccess(null);
    try {
      await api(`/admin/users/${id}`, { method: 'DELETE' });
      setSuccess('Compte supprimé.');
      loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Suppression impossible');
    }
  };

  const patchIncident = async (id: string, status: IncidentStatus) => {
    setError(null);
    try {
      await api(`/admin/incidents/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      loadIncidents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mise à jour impossible');
    }
  };

  const createInvitation = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      await api('/invitations', {
        method: 'POST',
        body: JSON.stringify({ neighborhood: invNeighborhood, expiresInHours: invHours }),
      });
      setInvNeighborhood('');
      setSuccess('Invitation créée — imprimez le QR code ou partagez le lien.');
      loadInvitations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Création impossible');
    }
  };

  const saveSettings = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      await api('/admin/settings', {
        method: 'PATCH',
        body: JSON.stringify({ agencyName, email: syndicEmail }),
      });
      setSuccess('Réglages syndic enregistrés.');
      loadSettings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible');
    }
  };

  const tabClass = (value: Tab) =>
    `rounded-lg px-4 py-2 text-sm font-medium ${
      tab === value ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'
    }`;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900">Administration</h1>
      <p className="mt-1 text-sm text-slate-600">
        Connecté en tant que {user?.firstName} {user?.lastName} (2FA vérifiée) ✓
      </p>

      <div className="mt-6 flex gap-2">
        <button type="button" className={tabClass('users')} onClick={() => setTab('users')}>
          👥 Membres
        </button>
        <button type="button" className={tabClass('incidents')} onClick={() => setTab('incidents')}>
          🛠️ Signalements
        </button>
        <button type="button" className={tabClass('invitations')} onClick={() => setTab('invitations')}>
          📲 Invitations
        </button>
        <button type="button" className={tabClass('settings')} onClick={() => setTab('settings')}>
          ⚙️ Syndic
        </button>
      </div>

      <ErrorMessage message={error} />
      {success && <p className="mt-3 text-sm font-medium text-brand-600">{success}</p>}

      {/* ─── Membres ─────────────────────────────────────────── */}
      {tab === 'users' && (
        <section className="mt-6">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher par nom ou email…"
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 focus:border-brand-500 focus:outline-none"
          />
          {!users ? (
            <Spinner />
          ) : (
            <ul className="mt-4 space-y-3">
              {users.map((member) => (
                <li
                  key={member.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {member.firstName} {member.lastName}
                        {member.role === 'ADMIN' && (
                          <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                            Admin
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-slate-500">{member.email}</p>
                      <p className="text-xs text-slate-400">
                        {member.neighborhood ?? 'Quartier non précisé'} ·{' '}
                        {new Date(member.createdAt).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                        {USER_STATUS_LABELS[member.status]}
                      </span>
                      {member.status === 'PENDING' && (
                        <button
                          type="button"
                          onClick={() => void patchUser(member.id, { status: 'ACTIVE' })}
                          className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
                        >
                          Valider
                        </button>
                      )}
                      {member.status === 'ACTIVE' && (
                        <button
                          type="button"
                          onClick={() => void patchUser(member.id, { status: 'SUSPENDED' })}
                          className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50"
                        >
                          Suspendre
                        </button>
                      )}
                      {member.status === 'SUSPENDED' && (
                        <button
                          type="button"
                          onClick={() => void patchUser(member.id, { status: 'ACTIVE' })}
                          className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
                        >
                          Réactiver
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => void deleteUser(member.id, member.email)}
                        className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                </li>
              ))}
              {users.length === 0 && (
                <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                  Aucun membre trouvé.
                </p>
              )}
            </ul>
          )}
        </section>
      )}

      {/* ─── Signalements ────────────────────────────────────── */}
      {tab === 'incidents' && (
        <section className="mt-6">
          {!incidents ? (
            <Spinner />
          ) : (
            <ul className="space-y-3">
              {incidents.map((incident) => (
                <li
                  key={incident.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{incident.title}</p>
                      <p className="text-sm text-slate-500">
                        {incident.user?.firstName} {incident.user?.lastName} (
                        {incident.user?.email})
                      </p>
                      <p className="text-xs text-slate-400">
                        {INCIDENT_CATEGORY_LABELS[incident.category]} ·{' '}
                        {new Date(incident.createdAt).toLocaleDateString('fr-FR')} ·{' '}
                        {incident.attachments.length} pièce
                        {incident.attachments.length > 1 ? 's' : ''}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">{incident.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {(
                        ['OPEN', 'IN_PROGRESS', 'RESOLVED'] as IncidentStatus[]
                      ).map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => void patchIncident(incident.id, status)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                            incident.status === status
                              ? 'bg-brand-600 text-white'
                              : 'border border-slate-300 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {INCIDENT_STATUS_LABELS[status]}
                        </button>
                      ))}
                    </div>
                  </div>
                </li>
              ))}
              {incidents.length === 0 && (
                <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                  Aucun signalement.
                </p>
              )}
            </ul>
          )}
        </section>
      )}

      {/* ─── Invitations ─────────────────────────────────────── */}
      {tab === 'invitations' && (
        <section className="mt-6">
          <form
            onSubmit={(event) => void createInvitation(event)}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1">
                <label className="mb-1 block text-sm font-medium text-slate-700">Quartier</label>
                <input
                  type="text"
                  required
                  maxLength={120}
                  value={invNeighborhood}
                  onChange={(event) => setInvNeighborhood(event.target.value)}
                  placeholder="Ex. Lyon 7e"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:border-brand-500 focus:outline-none"
                />
              </div>
              <div className="w-32">
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Validité (h)
                </label>
                <input
                  type="number"
                  min={1}
                  max={168}
                  value={invHours}
                  onChange={(event) => setInvHours(Number(event.target.value))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:border-brand-500 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="rounded-lg bg-brand-600 px-5 py-2.5 font-semibold text-white hover:bg-brand-700"
              >
                Générer l&apos;invitation
              </button>
            </div>
          </form>

          {!invitations ? (
            <Spinner />
          ) : (
            <ul className="mt-4 space-y-3">
              {invitations.map((invitation) => (
                <li
                  key={invitation.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{invitation.neighborhood}</p>
                      <p className="text-xs text-slate-400">
                        Créée par {invitation.createdBy?.firstName}{' '}
                        {invitation.createdBy?.lastName} · expire le{' '}
                        {new Date(invitation.expiresAt).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <img
                        src={invitation.qrUrl}
                        alt={`QR code ${invitation.neighborhood}`}
                        width={64}
                        height={64}
                        className="rounded-md border border-slate-200"
                      />
                      <div className="text-right text-xs text-slate-500">
                        <a
                          href={invitation.url}
                          target="_blank"
                          rel="noreferrer"
                          className="block max-w-[180px] truncate text-brand-600 hover:underline"
                        >
                          {invitation.url}
                        </a>
                        <button
                          type="button"
                          onClick={() => {
                            void navigator.clipboard.writeText(invitation.url);
                          }}
                          className="mt-1 font-medium text-slate-600 hover:underline"
                        >
                          Copier le lien
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
              {invitations.length === 0 && (
                <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                  Aucune invitation pour le moment.
                </p>
              )}
            </ul>
          )}
        </section>
      )}

      {/* ─── Syndic ──────────────────────────────────────────── */}
      {tab === 'settings' && (
        <section className="mt-6">
          <form
            onSubmit={(event) => void saveSettings(event)}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <h2 className="font-semibold text-slate-900">Agence / syndic de gestion</h2>
            <p className="mt-1 text-sm text-slate-500">
              Les signalements d&apos;incidents sont envoyés à cette adresse.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Nom de l&apos;agence
                </label>
                <input
                  type="text"
                  maxLength={120}
                  value={agencyName}
                  onChange={(event) => setAgencyName(event.target.value)}
                  placeholder="Ex. Syndic Lyon 7e"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:border-brand-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Email de réception
                </label>
                <input
                  type="email"
                  value={syndicEmail}
                  onChange={(event) => setSyndicEmail(event.target.value)}
                  placeholder="contact@syndic.fr"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:border-brand-500 focus:outline-none"
                />
              </div>
            </div>
            <button
              type="submit"
              className="mt-4 rounded-lg bg-brand-600 px-5 py-2.5 font-semibold text-white hover:bg-brand-700"
            >
              Enregistrer
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
