export interface PlanLimits {
  maxPlatforms: number
  maxUploads: number
  maxMeetingHours: number
  maxPublishingHours: number
  tagline: string
}

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  'pcr-starter-30h': {
    maxPlatforms: 2,
    maxUploads: 30,
    maxMeetingHours: 30,
    maxPublishingHours: 30,
    tagline: 'Perfect for emerging creators',
  },
  'pcr-basic-60h': {
    maxPlatforms: 4,
    maxUploads: 60,
    maxMeetingHours: 60,
    maxPublishingHours: 60,
    tagline: 'Ideal for growing teams',
  },
  'pcr-prime-90h': {
    maxPlatforms: 6,
    maxUploads: 90,
    maxMeetingHours: 90,
    maxPublishingHours: 90,
    tagline: 'Perfect for agencies',
  },
}

export const TRIAL_PLAN_LIMITS: Record<string, PlanLimits> = {
  'pcr-starter-30h': {
    maxPlatforms: 2,
    maxUploads: 3,
    maxMeetingHours: 3,
    maxPublishingHours: 3,
    tagline: 'Perfect for emerging creators',
  },
  'pcr-basic-60h': {
    maxPlatforms: 4,
    maxUploads: 8,
    maxMeetingHours: 8,
    maxPublishingHours: 8,
    tagline: 'Ideal for growing teams',
  },
  'pcr-prime-90h': {
    maxPlatforms: 6,
    maxUploads: 12,
    maxMeetingHours: 12,
    maxPublishingHours: 12,
    tagline: 'Perfect for agencies',
  },
}
