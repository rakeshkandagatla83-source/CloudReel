import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, CheckCircle2, XCircle, Loader2, Info } from 'lucide-react'
import { cn } from '../lib/utils'
import { getSignups, approveSignup, rejectSignup, type UserSignupData } from '../lib/signupService'
import { epochToLocalDateTime } from '../lib/dateUtils'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { Toaster } from '../components/ui/Toast'

const SIGNUP_STATUS_MAP: Record<number, string> = {
  0: 'Pending',
  1: 'Approved',
  2: 'Rejected',
}

interface ActionState {
  signupId: number | null
  action: 'approve' | 'reject' | null
  isLoading: boolean
  remarks: string
  isApprovingRejected: boolean
  firstName: string
}

interface ToastState {
  open: boolean
  title: string
  description?: string
  variant: 'error' | 'success' | 'warning'
}

export function AdminUsersPage() {
  const [signups, setSignups] = useState<UserSignupData[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [pageNum, setPageNum] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [totalPages, setTotalPages] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<string | undefined>('pending')
  const [emailVerified, setEmailVerified] = useState<boolean | undefined>(true)
  const [actionState, setActionState] = useState<ActionState>({
    signupId: null,
    action: null,
    isLoading: false,
    remarks: '',
    isApprovingRejected: false,
    firstName: '',
  })
  const [toast, setToast] = useState<ToastState>({
    open: false,
    title: '',
    variant: 'success',
  })

  useEffect(() => {
    fetchSignups()
  }, [pageNum, pageSize, status, emailVerified])

  const fetchSignups = async () => {
    setIsLoading(true)
    try {
      const response = await getSignups(pageSize, pageNum, status, emailVerified)
      if (response.code === 1 && response.data) {
        const { userSignups, totalCount: count, pageNum: page, pageSize: size, totalPages: pages } = response.data
        setSignups(userSignups || [])
        setTotalCount(count)
        setPageNum(page)
        setPageSize(size)
        setTotalPages(pages)
      }
    } catch (error) {
      console.error('Failed to fetch signups:', error)
      setSignups([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleApproveClick = (signupId: number, isApprovingRejected: boolean = false) => {
    const signup = signups.find(s => s.id === signupId)
    setActionState({
      signupId,
      action: 'approve',
      isLoading: false,
      remarks: '',
      isApprovingRejected,
      firstName: signup?.firstName || '',
    })
  }

  const handleRejectClick = (signupId: number) => {
    const signup = signups.find(s => s.id === signupId)
    setActionState({
      signupId,
      action: 'reject',
      isLoading: false,
      remarks: '',
      isApprovingRejected: false,
      firstName: signup?.firstName || '',
    })
  }

  const confirmAction = async () => {
    if (!actionState.signupId || !actionState.action) return

    setActionState(prev => ({ ...prev, isLoading: true }))
    try {
      if (actionState.action === 'approve') {
        await approveSignup(actionState.signupId, actionState.remarks)
      } else {
        await rejectSignup(actionState.signupId, actionState.remarks)
      }
      await fetchSignups()
      setToast({
        open: true,
        title: `User ${actionState.action === 'approve' ? 'Approved' : 'Rejected'} Successfully`,
        description: `${actionState.firstName} has been ${actionState.action === 'approve' ? 'approved' : 'rejected'}.`,
        variant: 'success',
      })
    } catch (error) {
      console.error(`Failed to ${actionState.action} signup:`, error)
      setToast({
        open: true,
        title: `Failed to ${actionState.action === 'approve' ? 'Approve' : 'Reject'} User`,
        description: error instanceof Error ? error.message : 'An error occurred while processing the request.',
        variant: 'error',
      })
    } finally {
      setActionState({
        signupId: null,
        action: null,
        isLoading: false,
        remarks: '',
        isApprovingRejected: false,
        firstName: '',
      })
    }
  }

  const closeAction = () => {
    setActionState({
      signupId: null,
      action: null,
      isLoading: false,
      remarks: '',
      isApprovingRejected: false,
      firstName: '',
    })
  }

  return (
    <div id="admin-users-page" className="h-full flex flex-col bg-white">
      {/* Header */}
      <div id="admin-users-header" className="px-6 py-3 border-b border-white/6 shrink-0 flex items-center justify-between">
        <div className="flex items-baseline gap-3">
          <h1 className="text-lg font-semibold text-white">User Signups</h1>
          <p className="text-xs text-white/40">Manage pending user registrations</p>
        </div>

        {/* Filters */}
        <div id="admin-users-filters" className="flex gap-4 items-center">
          <div className="flex items-center gap-2">
            <label id="admin-users-filter-status-label" className="text-xs font-medium text-white/50">
              Approval Status:
            </label>
            <select
              id="admin-users-filter-status-select"
              value={status || ''}
              onChange={(e) => {
                setStatus(e.target.value || undefined)
                setPageNum(1)
              }}
              className="px-3 py-1.5 rounded-lg text-sm bg-white/5 text-white border border-white/10 hover:bg-white/10 transition-colors cursor-pointer outline-none"
            >
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div className="w-px h-6 bg-white/10" />

          <div className="flex items-center gap-2">
            <label id="admin-users-filter-verified-label" className="text-xs font-medium text-white/50">
              Email Verified:
            </label>
            <select
              id="admin-users-filter-verified-select"
              value={emailVerified === undefined ? '' : emailVerified ? 'true' : 'false'}
              onChange={(e) => {
                if (e.target.value === '') {
                  setEmailVerified(undefined)
                } else if (e.target.value === 'true') {
                  setEmailVerified(true)
                } else {
                  setEmailVerified(false)
                }
                setPageNum(1)
              }}
              className="px-3 py-1.5 rounded-lg text-sm bg-white/5 text-white border border-white/10 hover:bg-white/10 transition-colors cursor-pointer outline-none"
            >
              <option value="">All</option>
              <option value="true">Verified</option>
              <option value="false">Unverified</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div id="admin-users-content" className="flex-1 overflow-hidden flex flex-col px-6">
        {/* Table Header */}
        <div id="admin-users-table-header" className="grid grid-cols-[1fr_1.5fr_1.2fr_1.2fr_0.7fr_0.7fr_1.5fr_0.8fr] gap-4 py-3 border-b border-white/6 shrink-0 text-sm font-medium text-white/60 bg-white/5">
          <div id="admin-users-col-name" className="pl-4">Name</div>
          <div id="admin-users-col-email">Email</div>
          <div id="admin-users-col-channel">Channel</div>
          <div id="admin-users-col-phone">Phone</div>
          <div id="admin-users-col-status">Status</div>
          <div id="admin-users-col-verified">Verified</div>
          <div id="admin-users-col-signup-date">Signup Date</div>
          <div id="admin-users-col-actions">Actions</div>
        </div>

        {/* Table Body */}
        <div id="admin-users-table-body" className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div id="admin-users-loading" className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-white/40" />
            </div>
          ) : signups.length === 0 ? (
            <div id="admin-users-empty" className="flex items-center justify-center py-12 text-white/40">
              No signups found
            </div>
          ) : (
            <div className="space-y-0">
              {signups.map(signup => (
                <div
                  key={signup.id}
                  id={`admin-users-row-${signup.id}`}
                  className="grid grid-cols-[1fr_1.5fr_1.2fr_1.2fr_0.7fr_0.7fr_1.5fr_0.8fr] gap-4 py-3 border-b border-white/6 hover:bg-white/5 transition-colors items-center text-sm"
                >
                  <div className="text-white pl-4">
                    {signup.firstName} {signup.lastName}
                  </div>
                  <div className="text-white/70 truncate">{signup.email}</div>
                  <div className="text-white/70 truncate">{signup.channelName}</div>
                  <div className="text-white/70">{signup.phoneNumber}</div>
                  <div>
                    <span
                      className={cn(
                        'px-2 py-1 rounded text-xs font-medium whitespace-nowrap',
                        signup.signupStatus === 0
                          ? 'bg-yellow-500/15 text-yellow-300'
                          : signup.signupStatus === 1
                            ? 'bg-green-500/15 text-green-300'
                            : 'bg-red-500/15 text-red-300',
                      )}
                    >
                      {SIGNUP_STATUS_MAP[signup.signupStatus] || 'Unknown'}
                    </span>
                  </div>
                  <div>
                    <span
                      className={cn(
                        'px-2 py-1 rounded text-xs font-medium whitespace-nowrap',
                        signup.emailVerified
                          ? 'bg-green-500/15 text-green-300'
                          : 'bg-red-500/15 text-red-300',
                      )}
                    >
                      {signup.emailVerified ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="text-white/70 text-xs">
                    {epochToLocalDateTime(signup.signupTimestamp)}
                  </div>
                  <div>
                    {signup.signupStatus === 0 && signup.emailVerified && (
                      <div id={`admin-users-actions-${signup.id}`} className="flex gap-2">
                        <button
                          id={`admin-users-btn-approve-${signup.id}`}
                          onClick={() => handleApproveClick(signup.id)}
                          className="p-1 rounded hover:bg-green-500/20 transition-colors text-green-400 cursor-pointer"
                          title="Approve"
                        >
                          <CheckCircle2 size={18} />
                        </button>
                        <button
                          id={`admin-users-btn-reject-${signup.id}`}
                          onClick={() => handleRejectClick(signup.id)}
                          className="p-1 rounded hover:bg-red-500/20 transition-colors text-red-400 cursor-pointer"
                          title="Reject"
                        >
                          <XCircle size={18} />
                        </button>
                      </div>
                    )}
                    {signup.signupStatus === 2 && signup.emailVerified && (
                      <div id={`admin-users-actions-${signup.id}`} className="flex gap-2">
                        <button
                          id={`admin-users-btn-approve-rejected-${signup.id}`}
                          onClick={() => handleApproveClick(signup.id, true)}
                          className="p-1 rounded hover:bg-green-500/20 transition-colors text-green-400 cursor-pointer"
                          title="Approve"
                        >
                          <CheckCircle2 size={18} />
                        </button>
                        <div
                          id={`admin-users-btn-rejection-reason-${signup.id}`}
                          className="p-1 rounded hover:bg-white/10 transition-colors text-white/60 cursor-help"
                          title={signup.remarks || 'No rejection reason provided'}
                        >
                          <Info size={18} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pagination Footer */}
      <div id="admin-users-pagination" className="px-6 py-2 border-t border-white/6 flex items-center justify-between shrink-0 bg-white/5">
        <div className="flex items-center gap-4">
          <div className="text-sm text-white/40">
            Showing {signups.length === 0 ? 0 : (pageNum - 1) * pageSize + 1} to {Math.min(pageNum * pageSize, totalCount)} of {totalCount}
          </div>
          <div className="flex items-center gap-2">
            <label id="admin-users-pagesize-label" className="text-sm text-white/40">
              Page size:
            </label>
            <select
              id="admin-users-pagesize-select"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value))
                setPageNum(1)
              }}
              className="px-2 py-1 rounded text-sm bg-white/5 text-white border border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <button
            id="admin-users-btn-prev"
            onClick={() => setPageNum(prev => Math.max(1, prev - 1))}
            disabled={pageNum === 1}
            className="p-1.5 rounded hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={18} className="text-white/60" />
          </button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const pageStart = Math.max(1, pageNum - 2)
              return pageStart + i
            }).map(page => (
              <button
                key={page}
                onClick={() => setPageNum(page)}
                className={cn(
                  'w-8 h-8 rounded text-sm font-medium transition-colors',
                  pageNum === page
                    ? 'bg-[#3031cb] text-white'
                    : 'text-white/50 hover:bg-white/5 hover:text-white/70',
                )}
              >
                {page}
              </button>
            ))}
            {totalPages > 5 && pageNum < totalPages - 2 && (
              <>
                <span className="text-white/30">...</span>
                <button
                  onClick={() => setPageNum(totalPages)}
                  className="w-8 h-8 rounded text-sm font-medium text-white/50 hover:bg-white/5 hover:text-white/70 transition-colors"
                >
                  {totalPages}
                </button>
              </>
            )}
          </div>
          <button
            id="admin-users-btn-next"
            onClick={() => setPageNum(prev => Math.min(totalPages, prev + 1))}
            disabled={pageNum === totalPages}
            className="p-1.5 rounded hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight size={18} className="text-white/60" />
          </button>
        </div>
      </div>

      {/* Action Confirmation Dialog */}
      <ConfirmDialog
        open={actionState.action !== null}
        onOpenChange={(isOpen) => !isOpen && closeAction()}
        title={`${actionState.action === 'approve' ? 'Approve' : 'Reject'} Signup`}
        description={
          actionState.action === 'approve' && actionState.isApprovingRejected
            ? `This user was previously rejected. Provide remarks explaining the approval for ${actionState.firstName}.`
            : actionState.action === 'reject'
              ? `Are you sure you want to reject ${actionState.firstName}?`
              : `Are you sure you want to approve ${actionState.firstName}?`
        }
        onConfirm={confirmAction}
        confirmLabel={actionState.action === 'approve' ? 'Approve' : 'Reject'}
        variant={actionState.action === 'reject' ? 'danger' : 'default'}
        confirmDisabled={
          (actionState.action === 'reject' && !actionState.remarks.trim()) ||
          (actionState.action === 'approve' && actionState.isApprovingRejected && !actionState.remarks.trim())
        }
      >
        {(actionState.action === 'reject' || actionState.isApprovingRejected) && (
          <div className="space-y-2">
            <label id="admin-users-remarks-label" className="block text-sm font-medium text-white/70">
              {actionState.action === 'reject' ? 'Rejection Reason' : 'Approval Remarks'}
            </label>
            <textarea
              id="admin-users-remarks-input"
              value={actionState.remarks}
              onChange={(e) => setActionState(prev => ({ ...prev, remarks: e.target.value }))}
              placeholder={actionState.action === 'reject' ? 'Enter reason for rejection...' : 'Enter reason for re-approval...'}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/20 resize-none"
              rows={3}
            />
          </div>
        )}
      </ConfirmDialog>

      {/* Toast Notification */}
      <Toaster
        id="admin-users-toast"
        open={toast.open}
        onOpenChange={(open) => setToast(prev => ({ ...prev, open }))}
        title={toast.title}
        description={toast.description}
        variant={toast.variant}
      />
    </div>
  )
}
