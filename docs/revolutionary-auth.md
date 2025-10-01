# Revolutionary Authentication System - HITADY

## Overview

HITADY implements a revolutionary authentication system designed for the Malagasy context, featuring:

- **Username-based authentication** (3-20 characters)
- **Passphrase authentication** using memorable Malagasy words instead of traditional passwords
- **Recovery word system** for account recovery
- **Identity verification** with CIN (Carte d'Identité Nationale)
- **Professional profiles** for service providers
- **Real-time status management**

## Authentication Flow

### 1. User Registration

**Endpoint:** `POST /api/revolutionary-auth/register`

**Request Body:**
```json
{
  "username": "rakoto123",
  "name": "Rakoto Jean",
  "phoneNumber": "+261340000000",
  "recoveryWord": "fianarantsoa",
  "email": "rakoto@example.mg" // Optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "userId": "abc123...",
    "username": "rakoto123",
    "connectionWords": "vary sy loaka mofo", // Save this!
    "recoveryHint": "f***a" // Hint for recovery word
  }
}
```

**Important:** The user must save the `connectionWords` as they are needed for login.

### 2. User Login

**Endpoint:** `POST /api/revolutionary-auth/login`

**Request Body:**
```json
{
  "username": "rakoto123",
  "connectionWords": "vary sy loaka mofo"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "abc123...",
      "username": "rakoto123",
      "name": "Rakoto Jean",
      "isVerified": false,
      "status": "online"
    },
    "session": {
      "token": "session_token_here",
      "expiresAt": "2024-12-01T00:00:00.000Z"
    }
  }
}
```

### 3. Account Recovery

**Endpoint:** `POST /api/revolutionary-auth/recover`

**Request Body:**
```json
{
  "username": "rakoto123",
  "recoveryWord": "fianarantsoa"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Account recovered successfully",
  "data": {
    "username": "rakoto123",
    "connectionWords": "kafe rano hazo lanitra" // New connection words
  }
}
```

### 4. Logout

**Endpoint:** `POST /api/revolutionary-auth/logout`

**Headers:**
```
Authorization: Bearer <session_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

## Identity Verification

### Submit CIN for Verification

**Endpoint:** `POST /api/verification/submit`

**Request Body:**
```json
{
  "userId": "abc123...",
  "cinNumber": "101012345678",
  "cinPhotoUrl": "https://storage.example.com/cin/photo.jpg"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Identity verification submitted. Please wait for admin approval.",
  "data": {
    "userId": "abc123...",
    "isVerified": false
  }
}
```

### Check Verification Status

**Endpoint:** `GET /api/verification/status/:userId`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "abc123...",
    "username": "rakoto123",
    "isVerified": true,
    "verifiedAt": "2024-01-15T10:30:00.000Z",
    "cinNumber": "101012345678"
  }
}
```

## Professional Profile Management

### Update Professional Profile

**Endpoint:** `POST /api/profile/professional`

**Request Body:**
```json
{
  "userId": "abc123...",
  "isProfessional": true,
  "activityCategory": "Mécanique",
  "serviceDescription": "Réparation de voitures et motos",
  "address": "Lot 123, Analakely, Antananarivo",
  "gpsCoordinates": "-18.9100,47.5362",
  "openingHours": {
    "monday": { "open": "08:00", "close": "17:00" },
    "tuesday": { "open": "08:00", "close": "17:00" },
    "wednesday": { "open": "08:00", "close": "17:00" },
    "thursday": { "open": "08:00", "close": "17:00" },
    "friday": { "open": "08:00", "close": "17:00" },
    "saturday": { "open": "08:00", "close": "12:00" },
    "sunday": "closed"
  },
  "contactNumbers": ["+261340000000", "+261320000000"]
}
```

### Update Portfolio

**Endpoint:** `POST /api/profile/portfolio`

**Request Body:**
```json
{
  "userId": "abc123...",
  "portfolioPhotos": [
    "https://storage.example.com/portfolio/photo1.jpg",
    "https://storage.example.com/portfolio/photo2.jpg"
  ],
  "portfolioVideos": [
    "https://storage.example.com/portfolio/video1.mp4"
  ],
  "certificates": [
    "https://storage.example.com/certificates/cert1.pdf"
  ]
}
```

**Note:** Maximum 20 photos allowed.

### Update Status

**Endpoint:** `POST /api/profile/status`

**Request Body:**
```json
{
  "userId": "abc123...",
  "status": "available",
  "autoStatus": false
}
```

**Status Options:**
- `available` - Ready to accept new clients
- `busy` - Currently working, limited availability
- `closed` - Not accepting clients (outside hours or absent)
- `online` - Connected to the app
- `offline` - Not connected

### Get User Profile

**Endpoint:** `GET /api/profile/:userId`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "abc123...",
    "username": "rakoto123",
    "name": "Rakoto Jean",
    "image": "https://storage.example.com/avatars/user.jpg",
    "isVerified": true,
    "district": "Analakely",
    "city": "Antananarivo",
    "isProfessional": true,
    "activityCategory": "Mécanique",
    "serviceDescription": "Réparation de voitures et motos",
    "address": "Lot 123, Analakely, Antananarivo",
    "gpsCoordinates": "-18.9100,47.5362",
    "openingHours": {},
    "contactNumbers": ["+261340000000"],
    "portfolioPhotos": [],
    "portfolioVideos": [],
    "certificates": [],
    "status": "available",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

## Database Schema

The revolutionary authentication system extends the `users` table with the following fields:

### Authentication Fields
- `username` (TEXT, UNIQUE) - Unique username (3-20 chars)
- `phone_number` (TEXT) - User's phone number
- `recovery_word` (TEXT) - Encrypted recovery word
- `connection_words` (TEXT) - Encrypted passphrase

### Identity Verification
- `cin_number` (TEXT) - CIN number
- `cin_photo_url` (TEXT) - URL to CIN photo
- `is_verified` (BOOLEAN) - Verification status
- `verified_at` (TIMESTAMP) - Verification timestamp

### Location
- `district` (TEXT) - User's district
- `city` (TEXT) - User's city

### Professional Profile
- `is_professional` (BOOLEAN) - Is user a professional?
- `activity_category` (TEXT) - Service category
- `service_description` (TEXT) - Service description
- `address` (TEXT) - Physical address
- `gps_coordinates` (TEXT) - GPS coordinates
- `opening_hours` (JSONB) - Opening hours
- `contact_numbers` (JSONB) - Contact numbers array

### Portfolio
- `portfolio_photos` (JSONB) - Photo URLs array (max 20)
- `portfolio_videos` (JSONB) - Video URLs array
- `certificates` (JSONB) - Certificate URLs array

### Status
- `status` (TEXT) - Current status
- `auto_status` (BOOLEAN) - Auto status management

## Security Features

1. **Passphrase Encryption:** Connection words and recovery words are encrypted using bcrypt with cost factor 10
2. **Username Binding:** Encryption keys are bound to usernames for additional security
3. **No Plain Text Storage:** Passwords/passphrases are never stored in plain text
4. **Session Management:** Secure session tokens with expiration
5. **Status Tracking:** IP address and user agent logged for sessions

## Malagasy Word List

The system uses a curated list of Malagasy words for passphrase generation, including:

- **Food:** vary, loaka, mofo, kafe, etc.
- **Nature:** rano, hazo, lanitra, masoandro, etc.
- **Colors:** mena, maitso, manga, fotsy, etc.
- **Common words:** fitiavana, fiadanana, fahasoavana, etc.
- **Objects:** trano, boky, fitaovana, etc.
- **Actions:** mandeha, mihinana, miasa, etc.

## Migration

To apply the database changes, run:

```bash
# Using Drizzle
npm run db:push

# Or manually run the migration
psql -U postgres -d hitady -f drizzle/0002_add_revolutionary_auth_fields.sql
```

## Testing

Run the passphrase utility tests:

```bash
npm test src/infrastructure/utils/passphrase.util.spec.ts
```

## Best Practices

1. **Always save connection words during registration** - They cannot be retrieved later
2. **Choose a memorable recovery word** - It's the only way to recover the account
3. **Keep the recovery word private** - Never share it with anyone
4. **Professional profiles should be complete** - Include all relevant information
5. **Update status regularly** - Helps clients know when you're available
6. **Upload clear CIN photos** - Ensures faster verification

## Example Integration

```typescript
// Registration
const response = await fetch('/api/revolutionary-auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'rakoto123',
    name: 'Rakoto Jean',
    phoneNumber: '+261340000000',
    recoveryWord: 'fianarantsoa'
  })
})

const { data } = await response.json()
// IMPORTANT: Save data.connectionWords securely!
localStorage.setItem('connectionWords', data.connectionWords)

// Login
const loginResponse = await fetch('/api/revolutionary-auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'rakoto123',
    connectionWords: localStorage.getItem('connectionWords')
  })
})

const { data: loginData } = await loginResponse.json()
// Store session token
localStorage.setItem('sessionToken', loginData.session.token)
```

## Support

For issues or questions, please contact the development team or open an issue in the repository.
