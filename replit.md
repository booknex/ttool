# Tax Client Portal

## Overview
The Tax Client Portal is a secure web application designed to streamline interactions between tax preparers and their clients. It offers a comprehensive digital solution for tax season, enabling clients to securely upload documents with automatic form recognition, communicate via secure messaging, track refunds, complete electronic signatures, fill out questionnaires, and manage invoices. The portal also features an Admin Dashboard for preparers to manage clients, track progress, and utilize a Kanban board for workflow management. Key business ambitions include enhancing client experience, improving operational efficiency for tax preparers, and providing a scalable platform for digital tax services.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter
- **State Management**: TanStack React Query for server state, React local state for UI
- **Styling**: Tailwind CSS with shadcn/ui (New York variant) and Material Design 3 principles
- **Build Tool**: Vite
- **Structure**: Pages-based architecture with reusable components and custom hooks. Path aliases for easy module imports.

### Backend
- **Framework**: Express.js with TypeScript
- **Authentication**: Custom username/password authentication using bcrypt for hashing, session management with `express-session` and PostgreSQL store.
- **File Uploads**: Multer for document handling, including file type validation.
- **API Design**: RESTful endpoints under `/api/` prefix.
- **Patterns**: Storage interface abstraction, authentication middleware, automatic document type detection from filenames, local file storage.

### Data Storage
- **Database**: PostgreSQL via Neon serverless driver
- **ORM**: Drizzle ORM with `drizzle-zod` for schema validation.
- **Schema**: Defined in `shared/schema.ts`, managed with `drizzle-kit` migrations.
- **Core Entities**: Users, Documents, Required Documents, Messages, Signatures, Refund Tracking, Invoices, Sessions, Dependents, Affiliates, Affiliate Referrals.

### Authentication and Onboarding
- **Auth Flow**: Custom username/password, bcrypt hashing, 1-week PostgreSQL session TTL.
- **Onboarding**: Mandatory questionnaire completion before dashboard access, followed by an introductory tour.
- **Security**: Cache clearing on authentication events (login, logout, registration) and admin impersonation to prevent data leakage.

### Features
- **Client Portal**: Document upload, secure messaging, refund tracking, e-signatures, dynamic questionnaires, invoice management, personalized homepage with actionable items, document progress, and returns summary.
- **Admin Dashboard**: Role-based access, client management (view, edit, create, impersonate, archive, delete), document review, message management, invoice creation, refund status updates, signature review.
- **Admin Kanban Board**: Drag-and-drop workflow management for client returns with status columns (Not Started, Gathering Docs, Info Review, Prep, QA Review, Client Review, Signatures, Filing, Filed).
- **Affiliate Portal**: Separate authentication, unique referral codes, client attribution, dashboard for tracking referrals/commissions, gamification with tier system, achievement badges, and leaderboards.
- **General**: Light mode only, responsive design.

## External Dependencies

### Database
- **Neon PostgreSQL**: Serverless PostgreSQL.

### Authentication
- **bcrypt**: Password hashing.

### Third-Party Libraries
- **Radix UI**: Headless UI components.
- **Lucide React**: Icon library.
- **react-dropzone**: File upload component.
- **react-signature-canvas**: Electronic signature pad.
- **react-icons**: Additional icons.
- **date-fns**: Date utility library.
- **zod**: Runtime schema validation.

### Development Tools
- **Vite**: Development server.
- **Replit Plugins**: cartographer, dev-banner, runtime-error-modal.
- **esbuild**: Production server bundling.

## Recent Changes (February 2026)

### Admin Documents Page Redesign
- **Stats Summary Cards** - Clickable cards showing total, pending, processing, verified, rejected, and archived document counts (clicking filters the table)
- **Data Table Interface** - Replaced card list with sortable table columns (client, document, type, status, upload date, file size)
- **Search Bar** - Full-text search by client name or filename
- **Advanced Filters** - Dropdown filters for status, document type, and specific client
- **Bulk Actions** - Select multiple documents and batch-update status (verify, processing, reject)
- **Pagination** - Configurable items per page (10/25/50/100) with page navigation controls
- **Document Actions** - View/download documents and quick status changes via dropdown menu

### Client Homepage Redesign
- **Personalized Greeting** - Shows "Hi [FirstName]!" with user's actual name
- **Current Status Banner** - Prominent card showing current tax prep stage with description
- **Next Action Card** - Dynamically prioritizes what user should do next (pay invoice > sign docs > upload documents > read messages)
- **Document Progress** - Visual progress bar showing completion percentage
- **Returns Summary** - List of personal/business returns with their current status
- **Quick Stats Grid** - Compact 4-column grid (Documents, Unread Messages, To Sign, Businesses)