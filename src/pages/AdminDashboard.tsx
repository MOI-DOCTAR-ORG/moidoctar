import { useState, useEffect, useCallback } from 'react'
import Icon from '../components/Icon'
import { api } from '../services/api'
import { useToastContext } from '../context/ToastContext'
import { useCacheStats, useClearCache } from '../hooks/useMoiDoctor'

interface AdminUser {
  _id: string
  userName: string
  email: string
  role: 'user' | 'admin'
  isVerified: boolean
  phone?: string
  createdAt?: string
  lastLogin?: string
}

interface SupportTicket {
  ticket_id: string
  name: string
  email: string
  category: string
  subject: string
  message: string
  priority: 'normal' | 'urgent'
  status: 'open' | 'in_progress' | 'resolved'
  created_at: string
}

type AdminTab = 'users' | 'support' | 'cache'

export default function AdminDashboard() {
  const { addToast } = useToastContext()
  const [activeTab, setActiveTab] = useState<AdminTab>('users')

  // Users state
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [updatingUser, setUpdatingUser] = useState<string | null>(null)
  const [userSearch, setUserSearch] = useState('')

  // Support Tickets state
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loadingTickets, setLoadingTickets] = useState(true)
  const [ticketSearch, setTicketSearch] = useState('')
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null)

  // Cache state
  const { data: cacheStatsRes, isLoading: loadingCache, refetch: refetchCache } = useCacheStats()
  const clearCacheMutation = useClearCache()
  const [confirmClearCache, setConfirmClearCache] = useState(false)

  // Fetch Users
  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true)
    try {
      const res = await api.get<{ msg: string; data: AdminUser[] }>('/admin/users')
      setUsers(res.data || [])
    } catch {
      addToast('Could not load user list.', 'error')
    } finally {
      setLoadingUsers(false)
    }
  }, [addToast])

  // Fetch Support Tickets
  const fetchTickets = useCallback(async () => {
    setLoadingTickets(true)
    try {
      const res = await api.get<{ msg: string; data: SupportTicket[] }>('/support/requests')
      setTickets(res.data || [])
    } catch {
      addToast('Could not load support tickets.', 'error')
    } finally {
      setLoadingTickets(false)
    }
  }, [addToast])

  useEffect(() => {
    if (activeTab === 'users') void fetchUsers()
    if (activeTab === 'support') void fetchTickets()
  }, [activeTab, fetchUsers, fetchTickets])

  // Update User Role
  const handleRoleToggle = async (targetUser: AdminUser) => {
    const newRole = targetUser.role === 'admin' ? 'user' : 'admin'
    setUpdatingUser(targetUser._id)
    try {
      await api.put('/admin/user/role', { email: targetUser.email, role: newRole })
      setUsers(prev => prev.map(u => u._id === targetUser._id ? { ...u, role: newRole } : u))
      addToast(`User role updated to ${newRole}.`, 'success')
    } catch {
      addToast('Failed to update user role.', 'error')
    } finally {
      setUpdatingUser(null)
    }
  }

  // Blacklist User
  const handleBlacklist = async (targetUser: AdminUser) => {
    setUpdatingUser(targetUser._id)
    try {
      await api.put('/admin/user/blacklist', { email: targetUser.email })
      addToast(`Action processed for ${targetUser.email}.`, 'info')
    } catch {
      addToast('Failed to restrict user.', 'error')
    } finally {
      setUpdatingUser(null)
    }
  }

  // Clear Cache
  const handleClearCache = () => {
    clearCacheMutation.mutate(undefined, {
      onSuccess: () => {
        setConfirmClearCache(false)
        void refetchCache()
        addToast('Triage cache cleared successfully.', 'success')
      },
      onError: () => {
        addToast('Failed to clear cache.', 'error')
      },
    })
  }

  const filteredUsers = users.filter(u =>
    u.userName.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  )

  const filteredTickets = tickets.filter(t =>
    t.ticket_id.toLowerCase().includes(ticketSearch.toLowerCase()) ||
    t.name.toLowerCase().includes(ticketSearch.toLowerCase()) ||
    t.email.toLowerCase().includes(ticketSearch.toLowerCase()) ||
    t.subject.toLowerCase().includes(ticketSearch.toLowerCase())
  )

  const cacheStats = cacheStatsRes?.data

  return (
    <main className="min-h-[100dvh] p-4 md:p-6 max-w-[1200px] mx-auto bg-background text-on-surface font-body-md">
      {/* Header */}
      <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-md bg-primary/10 text-primary font-bold text-xs uppercase tracking-wider">
              Admin Console
            </span>
          </div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">Platform Administration</h2>
          <p className="font-body-md text-secondary mt-1">Manage platform users, support tickets, and system cache.</p>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-outline-variant mb-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-5 py-3 font-label-md text-label-md border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'users'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-secondary hover:text-on-surface'
          }`}
        >
          <Icon icon="group" size="md" />
          User Management ({users.length})
        </button>

        <button
          onClick={() => setActiveTab('support')}
          className={`flex items-center gap-2 px-5 py-3 font-label-md text-label-md border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'support'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-secondary hover:text-on-surface'
          }`}
        >
          <Icon icon="support_agent" size="md" />
          Support Tickets ({tickets.length})
        </button>

        <button
          onClick={() => setActiveTab('cache')}
          className={`flex items-center gap-2 px-5 py-3 font-label-md text-label-md border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'cache'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-secondary hover:text-on-surface'
          }`}
        >
          <Icon icon="cached" size="md" />
          Cache &amp; Performance
        </button>
      </div>

      {/* TAB 1: USER MANAGEMENT */}
      {activeTab === 'users' && (
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Icon icon="search" size="sm" className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
              <input
                type="text"
                placeholder="Search users by name or email..."
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-outline-variant bg-surface text-sm text-on-surface outline-none focus:border-primary"
              />
            </div>
            <button
              onClick={() => fetchUsers()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-outline-variant text-secondary hover:text-primary transition-all text-sm self-start sm:self-auto"
            >
              <Icon icon="refresh" size="sm" />
              Refresh Users
            </button>
          </div>

          {loadingUsers ? (
            <div className="flex justify-center py-16">
              <span className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="bg-surface rounded-2xl border border-outline-variant p-10 text-center">
              <Icon icon="person_off" size="xl" className="text-secondary mb-3 mx-auto" />
              <p className="text-body-md text-secondary">No users found matching your search.</p>
            </div>
          ) : (
            <div className="bg-surface rounded-2xl border border-outline-variant overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface-container-low border-b border-outline-variant text-caption uppercase text-secondary font-bold">
                    <tr>
                      <th className="p-4">User</th>
                      <th className="p-4">Role</th>
                      <th className="p-4">Verification</th>
                      <th className="p-4">Created</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {filteredUsers.map(u => (
                      <tr key={u._id} className="hover:bg-surface-container/50 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-on-surface">{u.userName}</div>
                          <div className="text-caption text-secondary">{u.email}</div>
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                            u.role === 'admin'
                              ? 'bg-primary/15 text-primary border border-primary/20'
                              : 'bg-surface-container text-secondary border border-outline-variant'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="p-4">
                          {u.isVerified ? (
                            <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
                              <Icon icon="check_circle" size="xs" /> Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-amber-500 font-medium">
                              <Icon icon="schedule" size="xs" /> Pending
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-caption text-secondary">
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleRoleToggle(u)}
                              disabled={updatingUser === u._id}
                              className="px-3 py-1.5 rounded-lg border border-outline-variant hover:border-primary text-xs font-semibold text-primary transition-all disabled:opacity-50"
                            >
                              {u.role === 'admin' ? 'Make User' : 'Make Admin'}
                            </button>
                            <button
                              onClick={() => handleBlacklist(u)}
                              disabled={updatingUser === u._id}
                              className="px-3 py-1.5 rounded-lg border border-error/30 text-xs font-semibold text-error hover:bg-error/10 transition-all disabled:opacity-50"
                            >
                              Restrict
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}

      {/* TAB 2: SUPPORT TICKETS */}
      {activeTab === 'support' && (
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Icon icon="search" size="sm" className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
              <input
                type="text"
                placeholder="Search tickets by ID, user, or subject..."
                value={ticketSearch}
                onChange={e => setTicketSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-outline-variant bg-surface text-sm text-on-surface outline-none focus:border-primary"
              />
            </div>
            <button
              onClick={() => fetchTickets()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-outline-variant text-secondary hover:text-primary transition-all text-sm self-start sm:self-auto"
            >
              <Icon icon="refresh" size="sm" />
              Refresh Tickets
            </button>
          </div>

          {loadingTickets ? (
            <div className="flex justify-center py-16">
              <span className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="bg-surface rounded-2xl border border-outline-variant p-10 text-center">
              <Icon icon="confirmation_number" size="xl" className="text-secondary mb-3 mx-auto" />
              <p className="text-body-md text-secondary">No support tickets found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredTickets.map(t => (
                <div
                  key={t.ticket_id}
                  onClick={() => setSelectedTicket(t)}
                  className="bg-surface rounded-xl border border-outline-variant p-4 md:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer hover:border-primary/50 transition-all group"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-primary text-sm">#{t.ticket_id}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                        t.priority === 'urgent'
                          ? 'bg-error/15 text-error border border-error/20'
                          : 'bg-primary/10 text-primary border border-primary/20'
                      }`}>
                        {t.priority === 'urgent' ? 'Time-sensitive' : 'Normal'}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-surface-container text-secondary text-xs">
                        {t.category}
                      </span>
                    </div>
                    <h4 className="font-bold text-on-surface text-base group-hover:text-primary transition-colors">
                      {t.subject}
                    </h4>
                    <p className="text-caption text-secondary">
                      From: {t.name} ({t.email}) · {new Date(t.created_at).toLocaleString()}
                    </p>
                  </div>
                  <button className="px-4 py-2 rounded-xl border border-primary/30 text-primary text-xs font-semibold group-hover:bg-primary group-hover:text-on-primary transition-colors self-end sm:self-auto">
                    View Detail
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* TAB 3: CACHE & PERFORMANCE */}
      {activeTab === 'cache' && (
        <section className="bg-surface rounded-2xl border border-outline-variant p-6 max-w-2xl">
          <h3 className="font-headline-md text-headline-md text-on-surface mb-2">Triage Cache Performance</h3>
          <p className="text-secondary font-body-md mb-6">Monitor response cache metrics and empty cache entries.</p>

          {loadingCache ? (
            <div className="flex justify-center py-12">
              <span className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : cacheStats ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-surface-container rounded-xl p-4">
                  <p className="text-caption text-secondary uppercase font-bold">Hits</p>
                  <p className="font-headline-md text-headline-md text-on-surface mt-1">{cacheStats.hits}</p>
                </div>
                <div className="bg-surface-container rounded-xl p-4">
                  <p className="text-caption text-secondary uppercase font-bold">Misses</p>
                  <p className="font-headline-md text-headline-md text-on-surface mt-1">{cacheStats.misses}</p>
                </div>
                <div className="bg-surface-container rounded-xl p-4">
                  <p className="text-caption text-secondary uppercase font-bold">Hit Rate</p>
                  <p className="font-headline-md text-headline-md text-on-surface mt-1">{(cacheStats.hit_rate * 100).toFixed(1)}%</p>
                </div>
                <div className="bg-surface-container rounded-xl p-4">
                  <p className="text-caption text-secondary uppercase font-bold">Cached Entries</p>
                  <p className="font-headline-md text-headline-md text-on-surface mt-1">{cacheStats.size}</p>
                </div>
              </div>

              <div className="border-t border-outline-variant pt-6">
                {confirmClearCache ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="font-body-md text-on-surface">Confirm clearing all triage cache?</p>
                    <button
                      onClick={handleClearCache}
                      disabled={clearCacheMutation.isPending}
                      className="bg-error text-on-error px-5 py-2.5 rounded-xl font-label-md text-label-md"
                    >
                      {clearCacheMutation.isPending ? 'Clearing...' : 'Yes, Clear Cache'}
                    </button>
                    <button
                      onClick={() => setConfirmClearCache(false)}
                      className="border border-outline-variant px-5 py-2.5 rounded-xl font-label-md text-label-md text-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmClearCache(true)}
                    className="bg-primary text-on-primary px-6 py-3 rounded-full font-label-md text-label-md hover:opacity-90 transition-all"
                  >
                    Clear Cache
                  </button>
                )}
              </div>
            </div>
          ) : (
            <p className="text-secondary font-body-md">Cache stats unavailable.</p>
          )}
        </section>
      )}

      {/* Ticket Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface rounded-2xl border border-outline-variant p-6 max-w-lg w-full space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-outline-variant pb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-primary">#{selectedTicket.ticket_id}</span>
                <span className="px-2 py-0.5 rounded bg-surface-container text-xs text-secondary">{selectedTicket.category}</span>
              </div>
              <button onClick={() => setSelectedTicket(null)} className="text-secondary hover:text-on-surface">
                <Icon icon="close" size="md" />
              </button>
            </div>

            <div>
              <h3 className="text-lg font-bold text-on-surface">{selectedTicket.subject}</h3>
              <p className="text-caption text-secondary mt-1">
                Submitted by {selectedTicket.name} ({selectedTicket.email})
              </p>
            </div>

            <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant">
              <p className="text-xs uppercase font-bold text-secondary mb-1">Message Detail</p>
              <p className="text-sm text-on-surface whitespace-pre-wrap">{selectedTicket.message}</p>
            </div>

            <div className="flex justify-end pt-3">
              <button
                onClick={() => setSelectedTicket(null)}
                className="bg-primary text-on-primary px-6 py-2.5 rounded-full font-label-md text-label-md"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
