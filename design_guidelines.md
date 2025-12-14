# FoundersNet Design Guidelines

## Design Approach
**Reference-Based**: Modern financial trading platforms (Robinhood, Coinbase, Binance) with clean data visualization and intuitive trading interfaces. Emphasis on clarity, speed, and professional credibility for financial decision-making.

## Typography System

**Font Families:**
- Primary: Inter (via Google Fonts) - clean, readable at small sizes for data-heavy tables
- Monospace: JetBrains Mono - for numerical values, prices, wallet addresses

**Hierarchy:**
- Hero/Page Titles: text-4xl font-bold (36px)
- Section Headers: text-2xl font-semibold (24px)
- Card Titles: text-lg font-medium (18px)
- Body Text: text-base font-normal (16px)
- Data Labels: text-sm font-medium (14px)
- Numerical Values: text-base font-mono font-semibold (16px monospace)
- Micro Text: text-xs (12px) for timestamps, secondary info

## Layout System

**Spacing Primitives:** Use Tailwind units of 2, 4, 6, 8, 12, 16 consistently
- Tight spacing: p-2, gap-2 (for compact data rows)
- Standard spacing: p-4, gap-4 (cards, form elements)
- Generous spacing: p-8, gap-8 (page sections)
- Section padding: py-12 or py-16 (vertical rhythm)

**Grid Structure:**
- Container: max-w-7xl mx-auto px-4
- Market Cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6
- Trading Layout: Two-column split (2/3 main, 1/3 sidebar on desktop)
- Portfolio Table: Full-width responsive table with horizontal scroll on mobile

## Component Library

### Navigation
- Fixed top navbar: bg-slate-900 with subtle border-b border-slate-800
- Logo left, nav links center, wallet connection button right
- Wallet display: Address truncated (0xf9d1...2ab2) with copy icon
- Active nav state: Underline accent with transition

### Market Cards
- Elevated cards with rounded-xl and subtle shadow
- Card header: Company name (text-lg font-semibold) + expiry countdown
- Price display: Large YES price in basis points with conversion ($0.65)
- YES/NO price indicators side-by-side with color-coded backgrounds (green/red at 10% opacity)
- Bottom row: 24h volume + total liquidity (text-sm muted)
- Hover state: Slight scale transform (hover:scale-[1.02]) + shadow increase

### Trading Interface
- Tab system: YES/NO tabs with active state background fill
- Input group: Label above, input field with APT suffix, max button inline
- Calculation display card: Shows estimated tokens, current price, price impact % with warning if >5%
- Execute button: Full-width, prominent with loading spinner state
- Current position card: Your YES/NO tokens with cost basis and unrealized P&L (green/red text)

### Portfolio Table
- Sticky header row with sortable columns
- Columns: Company | Position (YES/NO badge) | Tokens | Current Value | P&L | Actions
- P&L column: Color-coded text (green positive, red negative) with percentage
- Claim button: Small rounded button, enabled only for resolved markets
- Empty state: Centered illustration placeholder with "No positions yet" message

### Admin Dashboard
- Warning banner: "Admin Mode Active" with wallet verification icon
- Form sections with clear labels and helper text
- Create Market form: Company name, description textarea, initial liquidity slider, expiry date picker
- Resolve Market modal: Market selector dropdown, outcome radio buttons (YES/NO), confirmation step
- Treasury withdrawal: Current balance display + amount input with max button

### Charts
- Line chart for YES token price over time using Recharts
- Y-axis: Price in dollars (converted from basis points)
- X-axis: Time intervals (1H, 24H, 7D tabs)
- Hover tooltip: Timestamp, exact price, volume
- Chart container: Aspect ratio 16:9, responsive width

### Buttons & Actions
- Primary action: Solid background, rounded-lg, px-6 py-3
- Secondary action: Outlined with border-2, same padding
- Destructive action: Red variant for sells/cancellations
- Disabled state: Opacity 50%, cursor-not-allowed
- Loading state: Spinner icon + "Processing..." text

### Modals & Overlays
- Backdrop: bg-black/50 with backdrop-blur-sm
- Modal container: Centered, max-w-md, rounded-2xl with shadow-2xl
- Close button: Top-right corner, hover:bg-gray-100 rounded-full
- Actions at bottom: Cancel (secondary) + Confirm (primary) side-by-side

### Status Indicators
- Transaction pending: Animated pulse with yellow accent
- Transaction confirmed: Green checkmark with success message
- Transaction failed: Red X with error details + retry button
- Market active: Green dot indicator
- Market resolved: Gray "Resolved" badge
- Market expired: Orange "Expired" badge

## Data Visualization Patterns

**Price Display:**
- Always show both basis points and dollar equivalent
- YES price: 6,500 bp → $0.65
- Color-code based on price movement (green up, red down)

**Position Cards:**
- Three-column layout: Token count | Current value | P&L
- Clear visual separation with vertical dividers
- Monospace font for all numerical values

**Activity Feed:**
- Reverse chronological list with timestamps
- User avatar (if available) or wallet icon
- Action description: "Bought 100 YES tokens for 98 APT"
- Relative time: "2 minutes ago"

## Responsive Behavior

**Desktop (lg+):**
- Trading: Side-by-side layout (chart left, form right)
- Market grid: 3 columns
- Full navigation visible

**Tablet (md):**
- Trading: Stacked layout
- Market grid: 2 columns
- Collapsible navigation menu

**Mobile (base):**
- Single column everything
- Bottom navigation bar for main actions
- Horizontal scroll for tables
- Simplified chart with tap-to-expand

## Images
No hero images required - this is a data-focused application. Focus on clean layouts with emphasis on numerical data, charts, and trading interfaces.