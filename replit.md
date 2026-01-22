# Tax Client Portal

## Overview

A secure tax client portal application that enables clients to interact with their tax preparer digitally. The portal provides document upload with automatic form recognition, secure messaging, refund tracking, electronic signatures, questionnaire completion, and invoice management. Built with a React frontend and Express backend, using PostgreSQL for data persistence.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state, local React state for UI
- **Styling**: Tailwind CSS with shadcn/ui component library (New York style variant)
- **Build Tool**: Vite with React plugin and Replit-specific development plugins
- **Design System**: Material Design 3 principles applied for professional trust and clarity

The frontend follows a pages-based architecture with shared components:
- Pages in `client/src/pages/` handle route-specific views (dashboard, documents, messages, etc.)
- Reusable UI components in `client/src/components/ui/` from shadcn/ui
- Custom hooks in `client/src/hooks/` for authentication and mobile detection
- Path aliases configured: `@/` maps to `client/src/`, `@shared/` maps to `shared/`

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Authentication**: Custom username/password authentication with bcrypt password hashing
- **Session Management**: express-session with PostgreSQL session store (connect-pg-simple)
- **File Uploads**: Multer for handling document uploads with file type validation
- **API Design**: RESTful endpoints under `/api/` prefix

Key backend patterns:
- Storage interface abstraction in `server/storage.ts` for database operations
- Authentication middleware via `isAuthenticated` guard
- Automatic document type detection from filenames
- File storage in local `uploads/` directory
- Password hashing with bcrypt (12 salt rounds)

### Data Storage
- **Database**: PostgreSQL via Neon serverless driver (@neondatabase/serverless)
- **ORM**: Drizzle ORM with drizzle-zod for schema validation
- **Schema Location**: `shared/schema.ts` contains all table definitions
- **Migrations**: Managed via drizzle-kit with output to `migrations/` directory

Core data entities:
- Users (custom auth with passwordHash field)
- Documents (tax forms with status tracking)
- Required Documents (checklist items)
- Messages (client-preparer communication)
- Signatures (e-signature tracking)
- Refund Tracking (filing status)
- Invoices and Invoice Items (billing)
- Sessions (authentication persistence)

### Authentication Flow
- Custom username/password authentication with bcrypt hashing
- Session-based auth with 1-week TTL stored in PostgreSQL
- User registration creates account with hashed password
- Login validates credentials and creates session
- Protected routes require `isAuthenticated` middleware

### New User Onboarding Flow
- New users must complete the questionnaire before accessing the dashboard
- During questionnaire, users see a minimal header-only layout (no sidebar navigation)
- Upon completing the questionnaire, users are redirected to the dashboard
- The onboarding tour automatically shows on first dashboard visit (hasSeenOnboarding=false)
- Flow: Register/Login -> Questionnaire (required) -> Dashboard with Tour -> Full Portal Access

## External Dependencies

### Database
- **Neon PostgreSQL**: Serverless PostgreSQL database accessed via `DATABASE_URL` environment variable
- WebSocket connection for Neon serverless driver

### Authentication
- **Custom Auth**: Username/password with bcrypt password hashing
- Requires `SESSION_SECRET` environment variable for session encryption

### Third-Party Libraries
- **Radix UI**: Headless UI primitives for accessible components
- **Lucide React**: Icon library
- **react-dropzone**: Drag-and-drop file upload
- **react-signature-canvas**: Electronic signature capture
- **react-icons**: Additional icon sets (Visa, Mastercard, Apple Pay logos)
- **date-fns**: Date formatting utilities
- **zod**: Runtime schema validation

### Development Tools
- **Vite**: Development server with HMR
- **Replit Plugins**: cartographer, dev-banner, runtime-error-modal for Replit integration
- **esbuild**: Production server bundling with dependency allowlist optimization

## Recent Changes (January 2026)

### Affiliate Portal (NEW)
- **Separate Authentication**: Affiliates have their own login/register system at `/affiliate/*`
- **Referral Code System**: Each affiliate gets a unique referral code (e.g., REF-ABC123)
- **Client Attribution**: When clients register with a referral code, they're linked to the affiliate
- **Dashboard Features**:
  - View referral code and copy shareable link
  - Track total referrals, conversions, and conversion rate
  - Monitor pending and paid commissions
  - See recent referral activity with status badges
- **Gamification System**:
  - **Tier System**: Bronze (0), Silver (5), Gold (15), Platinum (30), Diamond (50) based on referral count
  - **Achievement Badges**: 6 unlockable badges for milestones (First Steps, Getting Traction, Closer, Momentum, Benjamin, Sharp Shooter)
  - **Progress Bar**: Shows progress toward next tier with referral count
  - **Leaderboard**: Privacy-focused top 5 display with anonymized competitors, current user's rank always visible
- **Database Tables**: affiliates, affiliate_sessions, affiliate_referrals

### Admin Kanban Board (NEW)
- **Visual Workflow Management**: Drag-and-drop client cards between status columns
- **Status Columns**: Not Started, Gathering Docs, Info Review, Prep, QA Review, Client Review, Signatures, Filing, Filed
- **Real-time Updates**: Uses dnd-kit for smooth drag-and-drop with optimistic updates
- **Access**: Admin sidebar has "Kanban Board" link at `/admin/kanban`

### Completed Features
- **Full Schema Implementation**: Complete PostgreSQL schema with 12 tables (users, sessions, documents, required_documents, signatures, refund_tracking, messages, questionnaire_responses, invoices, invoice_items, affiliates, affiliate_referrals)
- **Authentication**: Custom username/password authentication with bcrypt, session management, login/register pages
- **Landing Page**: Professional landing page with feature highlights and CTA buttons
- **Return Status (Home)**: The default landing page showing tax return preparation status
- **Summary**: Overview page with document progress, refund status, pending actions, and quick links
- **Document Center**: Drag-and-drop upload with AI classification simulation, document checklist, and status tracking
- **Messages**: Real-time messaging interface with auto-reply simulation
- **Questionnaire**: Dynamic multi-section tax questionnaire with conditional questions, progress tracking, and multi-entry business inputs (add multiple businesses)
- **Refund Tracker**: Visual progress tracker for federal and state refunds
- **E-Signatures**: Signature pad using react-signature-canvas for engagement letter and Form 8879
- **Invoices**: Invoice management with payment simulation (ready for Stripe integration)
- **Light Mode Only**: Clean white/light theme throughout the application
- **Responsive Design**: Mobile-friendly layouts with Shadcn sidebar

### Admin Dashboard
- **Role-based Access**: Users with isAdmin=true see admin layout, regular users see client portal
- **Admin Account**: dylan@booknex.com is configured as the admin
- **Admin Pages**:
  - Dashboard: Overview stats (total clients, documents, messages, revenue)
  - Clients: View all registered clients with their stats, click to open detail page
  - Client Detail: View/edit client info, see documents/questionnaire/messages/signatures/invoices tabs
  - Kanban Board: Visual drag-and-drop workflow management
  - Documents: Review and update document status for all clients
  - Messages: Respond to client messages with real replies
  - Invoices: Create and manage invoices for clients
  - Refunds: Update refund status for clients
  - Signatures: View all e-signatures from clients
- **Admin Client Management**:
  - Add Client: Modal form on clients page to manually create client accounts with email/password
  - Login as Client: Button on client detail page to impersonate a client (view portal as they see it)
  - Impersonation Banner: Orange banner shown when admin is viewing as client, with "Return to Admin" button
  - Session data stored securely server-side in PostgreSQL (not in client cookies)
  - Search & Filter: Search clients by name/email, filter by return prep status with color-coded badges
  - Archive Clients: Archive/unarchive clients and their documents, toggle to show archived clients, cannot archive admin accounts

### API Endpoints

#### Authentication Endpoints:
- `POST /api/auth/register` - Register new user with email/password
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/logout` - Logout current user
- `GET /api/auth/user` - Get current authenticated user
- `POST /api/auth/complete-onboarding` - Mark onboarding tour as seen
- `POST /api/auth/complete-questionnaire` - Mark questionnaire as completed

#### Client Endpoints (authenticated via session):
- `GET /api/documents` - List documents
- `POST /api/documents/upload` - Upload with AI classification
- `DELETE /api/documents/:id` - Remove document
- `GET /api/required-documents` - Document checklist
- `GET /api/signatures` - List signatures
- `POST /api/signatures` - Create signature
- `GET /api/refund` - Refund status
- `GET /api/messages` - List messages
- `POST /api/messages` - Send message
- `POST /api/messages/mark-read` - Mark as read
- `GET /api/questionnaire` - Get responses
- `POST /api/questionnaire` - Save answers
- `GET /api/invoices` - List invoices
- `GET /api/invoices/:id/items` - Invoice line items
- `POST /api/invoices/:id/pay` - Process payment

#### Admin Endpoints (require isAdmin=true):
- `GET /api/admin/stats` - Dashboard statistics
- `GET /api/admin/clients` - All clients with stats
- `POST /api/admin/clients` - Create new client account with email/password
- `GET /api/admin/clients/:id` - Single client with stats
- `PATCH /api/admin/clients/:id` - Update client info (firstName, lastName, email, phone)
- `POST /api/admin/clients/:id/impersonate` - Login as client (admin impersonation)
- `GET /api/admin/clients/:id/documents` - Client's documents
- `GET /api/admin/clients/:id/messages` - Client's messages
- `GET /api/admin/clients/:id/signatures` - Client's signatures
- `GET /api/admin/clients/:id/invoices` - Client's invoices
- `GET /api/admin/clients/:id/questionnaire` - Client's questionnaire responses
- `GET /api/admin/documents` - All documents
- `PATCH /api/admin/documents/:id` - Update document status
- `GET /api/admin/messages` - All messages grouped by client
- `POST /api/admin/messages/:userId` - Reply to client
- `GET /api/admin/signatures` - All signatures
- `GET /api/admin/invoices` - All invoices
- `POST /api/admin/invoices` - Create invoice for client
- `GET /api/admin/refunds` - All refund tracking
- `PATCH /api/admin/refunds/:userId` - Update refund status
- `POST /api/admin/return` - Return from client impersonation to admin
- `GET /api/admin/impersonation-status` - Check if currently impersonating a client