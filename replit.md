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
- **UI/UX**: Light mode only, responsive design. Personalized greetings, status banners, next action cards, visual progress bars, and quick stats grids on client homepage. Admin dashboard features action-oriented command center, clickable stat cards, quick action buttons, "Needs Attention" section, recent activity feed, and return pipeline visualization. Admin client detail pages offer a redesigned header, summary stat cards, two-column layout with a profile card and 8 tabs (Documents, Messages, Signatures, Invoices, Businesses, Returns, Dependents), and an advanced file explorer for document management with folder views and bulk actions.
- **Client Navigation**: Dedicated status pages for each return and product (`/return-status/personal`, `/return-status/:returnId`, `/service-status/:clientProductId`) with dynamic links from the dashboard and sidebar.
- **Client Documents Page**: Service-grouped checklist for document requirements, product-specific document requirements displayed in the sidebar, and integration with the upload dialog for tagging documents.

### Backend
- **Framework**: Express.js with TypeScript
- **Authentication**: Custom username/password authentication using bcrypt for hashing, session management with `express-session` and PostgreSQL store.
- **File Uploads**: Multer for document handling, including file type validation.
- **API Design**: RESTful endpoints under `/api/` prefix.
- **Patterns**: Storage interface abstraction, authentication middleware, automatic document type detection from filenames, local file storage.
- **Security**: Cache clearing on authentication events and admin impersonation.

### Data Storage
- **Database**: PostgreSQL via Neon serverless driver
- **ORM**: Drizzle ORM with `drizzle-zod` for schema validation.
- **Schema**: Defined in `shared/schema.ts`, managed with `drizzle-kit` migrations.
- **Core Entities**: Users, Documents, Required Documents, Messages, Signatures, Refund Tracking, Invoices, Sessions, Dependents, Affiliates, Affiliate Referrals, Appointments, Personal Events, Products, Product Stages, Product Document Requirements, Client Products.

### Authentication and Onboarding
- **Auth Flow**: Custom username/password, bcrypt hashing, 1-week PostgreSQL session TTL.
- **Onboarding**: Mandatory questionnaire completion before dashboard access, followed by an introductory tour.

### Features
- **Client Portal**: Document upload, secure messaging, refund tracking, e-signatures, dynamic questionnaires, invoice management, personalized homepage with actionable items, document progress, and returns summary.
- **Admin Dashboard**: Role-based access, client management (view, edit, create, impersonate, archive, delete), document review, message management, invoice creation, refund status updates, signature review, Kanban board.
- **Admin Kanban Board**: Multi-row workflow board with collapsible rows, independent drag-and-drop, client counts per stage, and "Mark Complete"/"Reopen" actions. Supports switching between Tax Returns and product-specific pipelines.
- **Affiliate Portal**: Separate authentication, unique referral codes, client attribution, dashboard for tracking referrals/commissions, gamification with tier system, achievement badges, and leaderboards.
- **Admin Module Pages**: Consistent pattern for handling large datasets with stats summary cards, sortable data tables, search bars, dropdown filters, and pagination controls. Pages include Clients, Invoices, Signatures, Refunds, Return Statuses, Documents, and Products.
- **Products System**: Admin-defined service templates with name, icon, description, display location, active toggle. Custom Kanban pipeline stages and document requirements per product. Client-specific product tracking.
- **Appointment Scheduling Calendar**: Admin calendar page with monthly view, color-coded appointment indicators (including purple for client-requested meetings), month navigation, side panel for daily/upcoming appointments with pending request approve/decline actions. CRUD for appointments with client search and status management. Client calendar with "Request Meeting" (sends request to admin) and "Add Event" (personal private events) features. Personal events displayed alongside appointments with color-coded left borders. Integration of upcoming appointments on the client dashboard.

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
- **esbuild**: Production server bundling.