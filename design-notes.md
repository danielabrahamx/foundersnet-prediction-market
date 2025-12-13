# Design Notes - Movement Prediction Market

## UI/UX Design Principles

1. **Simplicity First**: Prioritize clean, intuitive interfaces for hackathon demo
2. **Blockchain Transparency**: Show real-time on-chain data clearly
3. **Mobile-Friendly**: Responsive design for all device sizes
4. **Dark Mode**: Default dark theme with light mode option
5. **Accessibility**: Follow WCAG 2.1 AA standards

## Component Architecture Patterns

### Atomic Design Structure
```
Atoms/       # Basic UI elements (buttons, inputs)
Molecules/   # Component compositions (forms, cards)
Organisms/   # Complex components (market list, trade interface)
Templates/   # Page layouts
Pages/       # Final page implementations
```

### Key Components
- **MarketCard**: Displays individual market information
- **TradeInterface**: Betting/position management
- **WalletConnector**: Movement wallet integration
- **TransactionStatus**: Real-time transaction updates
- **MarketList**: Filterable/sortable market display

## Styling Approach

### Tailwind CSS
- Utility-first CSS framework
- Custom theme configuration in `tailwind.config.js`
- Dark mode enabled by default
- Responsive breakpoints: sm, md, lg, xl, 2xl

### Color Palette
```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          500: '#6366f1',  // Indigo
          600: '#4f46e5',
        },
        secondary: {
          500: '#10b981',  // Emerald
        },
        dark: {
          800: '#1f2937',  // Default dark background
          900: '#111827',  // Darker surfaces
        }
      }
    }
  }
}
```

## Accessibility Standards

1. **Semantic HTML**: Proper use of HTML5 elements
2. **Keyboard Navigation**: Full keyboard support
3. **ARIA Attributes**: Screen reader compatibility
4. **Color Contrast**: Minimum 4.5:1 ratio for text
5. **Focus Management**: Clear focus indicators
6. **Form Accessibility**: Proper labels and validation

## State Management Patterns

### Real-time Blockchain Data
- **React Query**: For blockchain data fetching
- **WebSocket Integration**: Real-time updates from Movement
- **Optimistic Updates**: Immediate UI feedback on transactions
- **Polling Strategy**: Fallback for WebSocket connectivity

### Local State
- **React Context**: Global state (wallet, user preferences)
- **useState/useReducer**: Component-level state
- **Custom Hooks**: Reusable state logic

## Form Validation and Error Handling

### Validation Approach
- **Zod Schemas**: Shared validation between frontend/backend
- **Real-time Validation**: On-blur and on-submit validation
- **Clear Error Messages**: User-friendly error display

### Error Handling Patterns
```typescript
// Example error handling pattern
try {
  const result = await movementClient.queryMarkets();
  setMarkets(result);
} catch (error) {
  if (error instanceof MovementError) {
    toast.error(`Blockchain error: ${error.message}`);
  } else {
    toast.error('Failed to load markets');
    console.error(error);
  }
}
```

## Real-time Data Update Patterns

### Movement Blockchain Integration
1. **Initial Load**: Fetch all markets on app mount
2. **WebSocket Subscription**: Listen for market updates
3. **Polling Fallback**: 30-second refresh if WebSocket fails
4. **Transaction Monitoring**: Track submitted transactions

### Data Flow
```
Blockchain Event → WebSocket → Backend → Frontend Update
```

## Mobile Responsiveness Approach

### Breakpoint Strategy
- Mobile: < 640px (sm)
- Tablet: 640px - 768px (md)
- Desktop: > 768px

### Mobile-Specific Patterns
- **Bottom Navigation**: Primary navigation on mobile
- **Collapsible Sections**: Save screen space
- **Touch Targets**: Minimum 48x48px for buttons
- **Simplified Forms**: Reduced fields on mobile

### Responsive Components
```jsx
// Example responsive component
function MarketCard({ market }) {
  return (
    <div className="bg-dark-800 rounded-lg p-4">
      <div className="flex flex-col md:flex-row justify-between">
        <div className="mb-2 md:mb-0">
          <h3 className="text-lg font-bold">{market.question}</h3>
          <p className="text-sm text-gray-400">{market.description}</p>
        </div>
        <div className="flex flex-col md:items-end">
          <div className="text-2xl font-bold text-primary-500">
            {formatOdds(market.odds)}
          </div>
          <button className="mt-2 md:mt-0 bg-primary-600 hover:bg-primary-700 
                            px-4 py-2 rounded-md text-sm font-medium">
            Trade
          </button>
        </div>
      </div>
    </div>
  );
}
```

## Animation and Transitions

### Purposeful Animations
- **Loading States**: Skeleton loaders and spinners
- **Transaction Feedback**: Success/failure animations
- **State Transitions**: Smooth UI updates
- **Micro-interactions**: Hover and focus effects

### Implementation
- **Framer Motion**: Complex animations
- **CSS Transitions**: Simple state changes
- **Tailwind Animation**: Built-in utilities

## Internationalization (Future Consideration)

While not implemented for hackathon demo, consider:
- **i18n Framework**: react-i18next
- **Locale Detection**: Browser language detection
- **Translation Files**: JSON-based translations
- **RTL Support**: Right-to-left language support
