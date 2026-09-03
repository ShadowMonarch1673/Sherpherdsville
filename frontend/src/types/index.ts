export type Role =
  | 'RESIDENT'
  | 'ADMIN'
  | 'ELECTRICIAN'
  | 'PLUMBER'
  | 'CARPENTER'
  | 'CLEANER'
  | 'SECURITY'

export interface User {
  id: number
  username: string
  first_name: string
  last_name: string
  email: string
  telephone: string
  room_number: string
  role: Role
  profile_picture: string | null
  is_admin?: boolean
  is_specialist?: boolean
  is_staff_operator?: boolean
  category_specialization_id?: number | null
  category_specialization_name?: string | null
  has_usable_password?: boolean
  notify_in_app?: boolean
  notify_email_status?: boolean
  notify_email_announcements?: boolean
}

export type ComplaintStatus = 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED'
export type ComplaintPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export interface Category {
  id: number
  name: string
  description: string
  is_active: boolean
}

export interface ComplaintAttachment {
  id: number
  image: string
  uploaded_at: string
}

export interface StatusHistory {
  id: number
  old_status: string
  new_status: string
  note: string
  changed_at: string
  changed_by_name: string
}

export interface Complaint {
  id: number
  title: string
  description: string
  room_number: string
  status: ComplaintStatus
  priority: ComplaintPriority
  category: number
  category_name: string
  resident: string
  resident_id: number
  assigned_to: number | null
  assigned_to_name: string | null
  resolution_notes: string
  created_at: string
  updated_at: string
  resolved_at: string | null
  attachments: ComplaintAttachment[]
  comments_count: number
  has_review: boolean
  status_history: StatusHistory[]
  resolution_image?: string | null
  reopen_count?: number
  is_overdue?: boolean
  sla_hours?: number
}

export interface Notification {
  id: number
  notification_type: string
  complaint_id: number | null
  message: string
  is_read: boolean
  created_at: string
}

export interface Comment {
  id: number
  complaint: number
  author: string
  author_id: number
  text: string
  created_at: string
}

export interface Review {
  id: number
  complaint: number
  resident: string
  rating: number
  feedback: string
  created_at: string
}

export interface Announcement {
  id: number
  title: string
  content: string
  created_by: number | null
  created_by_name: string
  is_pinned: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Analytics {
  role: 'admin' | 'resident'
  totals: {
    total: number
    pending: number
    in_progress: number
    resolved: number
    rejected: number
    recent_30_days?: number
    avg_resolution_days?: number | null
  }
  by_category?: { category__name: string; count: number }[]
  by_priority?: { priority: string; count: number }[]
  monthly_trend?: { month: string; count: number }[]
}

export interface ScheduledWork {
  id: number
  title: string
  description: string
  category: number | null
  category_name: string | null
  affected_blocks: string
  start_at: string
  end_at: string
  is_cancelled: boolean
  created_by: number | null
  created_by_name: string | null
  created_at: string
}

export interface FAQArticle {
  id: number
  question: string
  answer: string
  category: string
  is_published: boolean
  order: number
  created_at: string
  updated_at: string
}

export interface AuditLog {
  id: number
  actor: number | null
  actor_name: string
  action: string
  object_type: string
  object_id: number | null
  detail: string
  ip_address: string | null
  created_at: string
}

export interface TriageResult {
  suggested_category_id: number | null
  suggested_category_name: string | null
  suggested_priority: string
  reason: string
  confidence: string
}
