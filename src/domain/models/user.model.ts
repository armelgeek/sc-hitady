import { z } from 'zod'

export const User = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  emailVerified: z.boolean().optional(),
  image: z.string().optional(),
  isAdmin: z.boolean().optional(),
  
  // Revolutionary authentication fields
  username: z.string().min(3).max(20).optional(),
  phoneNumber: z.string().optional(),
  recoveryWord: z.string().optional(),
  connectionWords: z.string().optional(),
  
  // Identity verification
  cinNumber: z.string().optional(),
  cinPhotoUrl: z.string().optional(),
  isVerified: z.boolean().optional(),
  verifiedAt: z.date().optional(),
  
  // Location
  district: z.string().optional(),
  city: z.string().optional(),
  
  // Professional profile
  isProfessional: z.boolean().optional(),
  activityCategory: z.string().optional(),
  serviceDescription: z.string().optional(),
  address: z.string().optional(),
  gpsCoordinates: z.string().optional(),
  openingHours: z.record(z.any()).optional(),
  contactNumbers: z.array(z.string()).optional(),
  
  // Portfolio
  portfolioPhotos: z.array(z.string()).max(20).optional(),
  portfolioVideos: z.array(z.string()).optional(),
  certificates: z.array(z.string()).optional(),
  
  // Real-time status
  status: z.enum(['available', 'busy', 'closed', 'online', 'offline']).optional(),
  autoStatus: z.boolean().optional(),
  
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
})
