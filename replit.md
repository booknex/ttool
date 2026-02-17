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
- **Admin Kanban Board**: Multi-row workflow board showing all active services simultaneously. Tax Returns row at top with All/Personal/Business filter, plus a row per active product/service type. Each row is collapsible, has independent drag-and-drop, and shows client counts per stage. Only products with active clients appear. Three-dots menu on product cards for "Mark Complete" action; completed items shown in expandable section with "Reopen" option. API: `/api/admin/kanban-all`.
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

### Admin Dashboard Redesign (February 2026)
- **Command Center Layout** - Redesigned from basic stat cards to an action-oriented command center
- **Clickable Stat Cards** - 7 cards (Clients, Documents, Messages, Signatures, Revenue, Outstanding, Returns) with colored icons, alert dots for items needing attention, each linking to its admin page
- **Quick Action Buttons** - Row of buttons: Add Client, Create Invoice, Kanban Board, View Documents
- **Needs Attention Section** - Top 10 clients with pending items (unread messages, docs to review, unsigned signatures, unpaid invoices) with click-through to client detail
- **Recent Activity Feed** - Timeline of latest 15 activities (document uploads, messages, signatures, payments) with color-coded icons and relative timestamps
- **Return Pipeline** - Stacked progress bar + per-stage count badges showing all 9 Kanban stages, with link to full Kanban board
- **Revenue Overview** - Collected vs Outstanding cards, collection rate progress bar, invoice summary (total/paid/unpaid)
- **Expanded Stats API** - `/api/admin/stats` now returns pipeline counts, needsAttention array, recentActivity feed, pendingSignatures, documentStats breakdown, totalReturns/filedReturns

### Admin Client Detail Page Redesign (February 2026)
- **Header** - Avatar + client name + Active/Archived badge + "Login as Client" button + three-dots DropdownMenu (Edit Info, Archive/Restore, Delete Permanently)
- **Summary Stat Cards** - 6 cards across top: Documents (progress bar), Messages (unread badge), Signatures (signed/total), Invoices (paid/total), Returns (status badge), Services
- **Two-Column Layout** - Left profile card with editable info + services list with status dots; Right side has 8 tabs
- **Documents Tab** - Search + status filter dropdown + table-style layout with view actions
- **Messages Tab** - Chat-style bubbles with auto-scroll, client=left, admin=right, unread badges
- **Signatures Tab** - Table layout with signed/pending icons and dates
- **Invoices Tab** - Summary cards (Total Billed, Paid, Outstanding) + table with status badges
- **Businesses Tab** - Cards with collapsible Owners and Expenses sections, inline editing
- **Returns Tab** - Cards with prep/filing status dropdowns and federal/state amount fields
- **Dependents Tab** - Table-style layout with relationship badges

### Admin Documents Page - File Explorer Redesign (February 2026)
- **File Explorer Layout** - Two-level navigation: client folders at top level, documents inside each folder
- **Folder View** - Grid or list view of client folders with avatar, doc count, verification progress bar, and status breakdown (pending/processing/rejected counts)
- **Grid/List Toggle** - Switch between card grid and table list view for client folders
- **Breadcrumb Navigation** - "All Clients > Client Name (X files)" breadcrumb when viewing a client's documents
- **Client Document View** - Inside a folder: search, status/type filters, sortable table with file-type icons (PDF red, image purple, spreadsheet green), bulk actions, pagination
- **Stats Summary Cards** - Global document stats always visible at top: Total, Pending, Processing, Verified, Rejected, Archived
- **Bulk Actions** - Select multiple documents and batch-update status (verify, processing, reject)
- **Document Actions** - View/download documents and quick status changes via dropdown menu

### Client Homepage Redesign
- **Personalized Greeting** - Shows "Hi [FirstName]!" with user's actual name
- **Current Status Banner** - Prominent card showing current tax prep stage with description
- **Next Action Card** - Dynamically prioritizes what user should do next (pay invoice > sign docs > upload documents > read messages)
- **Document Progress** - Visual progress bar showing completion percentage
- **Returns Summary** - List of personal/business returns with their current status
- **Quick Stats Grid** - Compact 4-column grid (Documents, Unread Messages, To Sign, Businesses)

### Admin Module Pages - Large Dataset Handling Pattern
All admin data listing pages follow a consistent pattern for handling large datasets:

**Common Features Across All Admin Pages**:
1. **Stats Summary Cards** - Clickable cards showing counts by status/type that filter the table when clicked
2. **Sortable Data Table** - Column headers with sort icons (ArrowUpDown/ArrowUp/ArrowDown) for ascending/descending
3. **Search Bar** - Full-text search with clear button
4. **Dropdown Filters** - Status, type, or client filters as applicable
5. **Pagination Controls** - Configurable items per page (10/25/50/100) with first/prev/next/last navigation
6. **Page State Management** - Reset to page 1 on filter changes, clamp page with useEffect when totalPages changes
7. **useMemo Optimization** - Filtered and sorted data computed with useMemo for performance

**Implemented Pages**:
- **clients.tsx** - Action-first redesign: summary cards (Needs Attention, Missing Docs, Ready to File, New This Week) with clickable filtering; enriched table columns (Client, Services badges, Doc Progress bar, Action Needed indicators, Last Active timestamp); inline quick actions per row (View Profile, Message, Log in as Client, Archive/Unarchive); bulk select with batch archive; 2-step Add Client dialog with optional service/product assignment after creation; `/api/admin/clients/:id/assign-product` endpoint for admin product assignment
- **invoices.tsx** - Stats (total, draft, sent, paid, overdue); sortable by invoice, client, status, amount, due date; Create Invoice dialog with custom line items (description, rate, quantity)
- **signatures.tsx** - Stats (total, engagement letters, form 8879); sortable by client, document type, tax year, signed date
- **refunds.tsx** - Stats (total, completed, in progress, total refunds); sortable by client, federal/state status/amount, updated date
- **return-statuses.tsx** - Stats (total, not started, in progress, filed); sortable by client, status; inline status update
- **documents.tsx** - Stats (total, pending, processing, verified, rejected, archived); bulk actions; advanced filters
- **products.tsx** - Admin CRUD for products with pipeline stages, icon selection, display location configuration

### Products System (February 2026)
- **Products table** - Admin-defined service templates with name, icon (Lucide), description, display location (sidebar/tools/both), active toggle
- **Product stages table** - Custom Kanban pipeline stages per product (name, slug, color, sort order)
- **Product document requirements table** - Admin-defined document requirements per product (name, description, isRequired, sortOrder); cascade deletes with product
- **Client products table** - Tracks which products each client has with current stage progress
- **Admin Products page** - Full CRUD for products with inline stage management and document requirements editor (name, description, required toggle)
- **Client sidebar** - "My Services" section shows returns + products with status dots; "+" button shows available products (filters out already-assigned and inactive products)
- **Kanban Board** - Dropdown selector switches between Tax Returns pipeline and any product pipeline; each product uses its own custom stages as columns

### Individual Service Status Pages (February 2026)
- **Routing**: Each return and product has its own dedicated page
  - `/return-status/personal` — Personal return status with 9-stage stepper
  - `/return-status/:returnId` — Business return status (by return ID)
  - `/service-status/:clientProductId` — Product/service status with custom pipeline stages
- **Dashboard** (`/`) — Overview page with links to individual service pages
- **Sidebar** — Each service links directly to its dedicated status page with active state highlighting

### Client Documents Page (February 2026)
- **Service-grouped checklist** - Document requirements organized by service: Personal Return, Business Returns, and Products/Services
- **Product document requirements** - Each product shows its admin-defined required documents in the sidebar checklist with name, description, and required/optional badge
- **Upload dialog integration** - When uploading files, users can tag documents as belonging to a specific product's requirement
- **Existing features preserved** - Upload dropzone, drag-and-drop, file preview, AI classification, delete, mark N/A

### Client Sidebar Redesign (February 2026)
- Compact logo + greeting header
- "My Services" section with returns and products as clean rows with status dots
- Icon-grid tools bar with notification badges (unread messages, pending signatures, unpaid invoices)
- Sidebar links point to individual service status pages
- Simple sign-out link at bottom