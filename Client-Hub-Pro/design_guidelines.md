# Tax Client Portal - Design Guidelines

## Design Approach

**Selected System: Material Design 3**

Justification: Tax portals require trust, clarity, and efficiency. Material Design 3 provides robust patterns for data-dense interfaces, form-heavy workflows, and document management. Its elevation system creates clear information hierarchy essential for legal/financial applications.

**Key Design Principles:**
- Professional trust through clean, organized layouts
- Clear visual hierarchy for complex workflows
- Seamless transitions between related tasks
- Accessibility-first for compliance and usability

---

## Typography

**Font Family:**
- Primary: Inter (via Google Fonts)
- Monospace: JetBrains Mono (for document IDs, status codes)

**Hierarchy:**
- H1: 2.5rem (40px), font-weight 700, tracking tight - Dashboard headers
- H2: 2rem (32px), font-weight 600 - Section titles
- H3: 1.5rem (24px), font-weight 600 - Card headers
- H4: 1.25rem (20px), font-weight 500 - Subsection titles
- Body: 1rem (16px), font-weight 400, line-height 1.6
- Small: 0.875rem (14px), font-weight 400 - Metadata, timestamps
- Caption: 0.75rem (12px), font-weight 500 - Labels, badges

---

## Layout System

**Spacing Scale:** Tailwind units of 2, 4, 6, 8, 12, 16, 24
- Component padding: p-4 to p-6
- Section spacing: space-y-8 to space-y-12
- Card gaps: gap-6
- Page margins: px-4 md:px-8 lg:px-16

**Container Strategy:**
- Max-width: max-w-7xl for main content
- Sidebar: fixed w-64 on desktop, full-width drawer on mobile
- Two-column layouts: 2/3 main content, 1/3 sidebar on large screens

---

## Component Library

### Navigation
**Top Bar:**
- Fixed header with company logo (left), user avatar with dropdown (right)
- Notification bell icon with badge counter
- Height: h-16
- Subtle shadow for elevation

**Sidebar:**
- Vertical navigation with icon + label pattern
- Active state: filled background with rounded-lg
- Sections: Dashboard, Documents, Messages, Tax Questionnaire, Invoices, Settings
- Collapsible on mobile

### Dashboard Cards
**Status Card Pattern:**
- Rounded-xl border with shadow-sm
- Header with icon, title, action button
- Content area with key metrics or progress
- Footer with timestamp or secondary action
- Padding: p-6

**Quick Stats Grid:**
- 4-column grid (grid-cols-1 md:grid-cols-2 lg:grid-cols-4)
- Each stat: Large number (text-3xl font-bold), label below (text-sm)
- Icon in top-right corner

### Document Upload Center
**Upload Zone:**
- Dashed border (border-2 border-dashed) when empty
- Large centered icon (cloud upload)
- "Drag & drop or click to browse" text
- File type indicators below
- Minimum height: min-h-64

**Document List:**
- Table layout with columns: Thumbnail, Name, Type, Status, Actions
- Status badges: "Processing" (amber), "Verified" (green), "Missing" (red)
- Row hover reveals action buttons

### Missing Documents Checklist
**Checklist Component:**
- Each item: checkbox (disabled), document name, "Upload" button
- Progress bar at top showing completion percentage
- Grouped by category (W-2s, 1099s, Investment Documents, etc.)

### E-Signature Panel
**Signature Interface:**
- Document preview (PDF viewer) on left 2/3
- Signature controls on right 1/3
- Canvas area with clear "Sign Here" indicators
- Type, Draw, Upload signature options
- "Clear" and "Complete Signature" buttons below canvas

### Refund Tracker
**Timeline Component:**
- Vertical stepper with 4-5 stages
- Active stage: filled circle with pulse animation
- Completed: checkmark icon
- Pending: outlined circle
- Stage labels with estimated dates
- Current status in large text above timeline

### Messaging Center
**Chat Interface:**
- Conversation list (left 1/3): Contact cards with last message preview
- Message thread (right 2/3): Standard chat bubble pattern
- File attachment preview cards within messages
- Input area with attachment button, emoji selector, send button
- Height: h-[calc(100vh-theme(spacing.32))]

### Tax Questionnaire Wizard
**Multi-Step Form:**
- Progress indicator at top: numbered circles connected by lines
- One question per screen for complex questions
- Multiple questions per screen for related simple questions
- "Previous" and "Next" navigation buttons
- Auto-save indicator

**Question Types:**
- Yes/No: Large button selection (h-20 w-full)
- Multiple choice: Radio buttons with descriptions
- Text input: Full-width with character counter if limited
- Number input: Stepper controls on right
- File upload: Mini upload zone pattern

### Invoice & Payments
**Invoice Display:**
- Company header with logo and details
- Line items table: Description, Quantity, Rate, Amount columns
- Subtotal, Tax, Total with right-aligned numbers
- Payment status badge (Paid, Pending, Overdue)

**Payment Form:**
- Stripe Elements integration
- Payment method icons (Visa, Mastercard, Apple Pay, ACH)
- "Pay Now" vs "Pay Later" toggle
- Amount summary card on right
- Secure badge indicators

### Forms & Inputs
**Standard Input:**
- Floating label pattern
- Border: border rounded-lg
- Focus: thicker border with subtle shadow
- Error state: red border with error message below
- Helper text: text-sm below input
- Height: h-12

**Buttons:**
- Primary: Filled, h-11, px-6, rounded-lg, font-medium
- Secondary: Outlined, same sizing
- Text button: No border, underline on hover
- Icon buttons: w-10 h-10, rounded-full

### Data Tables
**Table Pattern:**
- Sticky header row
- Alternating row backgrounds for readability
- Sortable columns with arrow indicators
- Row selection with checkboxes
- Pagination controls at bottom
- Empty state with icon and message

### Modals & Overlays
**Modal:**
- Centered, max-w-2xl
- Backdrop blur
- Close button top-right
- Header, Content, Footer sections
- Rounded-xl

**Toast Notifications:**
- Fixed bottom-right
- Rounded-lg with shadow-lg
- Icon (left), message, close button (right)
- Auto-dismiss after 5 seconds

---

## Images

**Dashboard Hero:**
- No large hero image required
- Focus on functional dashboard layout

**Empty States:**
- Illustration-style graphics for empty document lists, no messages, etc.
- Centered, max width 400px
- Supportive, professional tone

**Document Thumbnails:**
- PDF first page preview or file type icon
- Dimensions: w-16 h-20 for list view, w-32 h-40 for grid view

**User Avatars:**
- Circular, sizes: w-8 h-8 (small), w-10 h-10 (default), w-16 h-16 (profile)
- Fallback: initials on solid background

---

## Animations

Use sparingly, only for:
- Loading states: Subtle spinner or skeleton screens
- Toast notifications: Slide in from bottom-right
- Refund tracker: Pulse on active stage
- No scroll animations or hover effects beyond standard button/link states