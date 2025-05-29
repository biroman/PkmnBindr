# Pokemon Card Binder Manager

A modern React application for managing Pokemon card collections with digital binder functionality.

## Features

- 📚 **Digital Binders**: Create and manage multiple card binders
- 🔍 **Card Search**: Advanced search across Pokemon TCG API
- 📋 **Card Clipboard**: Temporary storage for organizing cards
- 📊 **Progress Tracking**: Monitor collection completion
- 🎨 **Modern UI**: Beautiful dark/light themes with Tailwind CSS
- 💾 **Auto-Save**: Automatic saving with local storage
- 📱 **Responsive**: Works on desktop and mobile devices

## Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
npm install
npm run dev
```

### Logging

This project uses a centralized logging system to manage console output:

#### Development vs Production

- **Development**: All logs are displayed
- **Production**: Console statements are automatically removed during build

#### Logging Levels

```javascript
import logger from "./utils/logger";

// Debug logs (development only)
logger.debug("Detailed debugging info");

// General logs (development only)
logger.log("General information");

// Info logs (development only)
logger.info("Important information");

// Warning logs (development only)
logger.warn("Something might be wrong");

// Error logs (always shown, configurable)
logger.error("Something went wrong");

// Performance tracking (development only)
logger.time("operation");
logger.timeEnd("operation");
```

#### Environment Variables

- `VITE_DEBUG=true` - Enable debug logs in any environment
- `VITE_SILENT_ERRORS=true` - Disable error logs in production

### Build Optimization

The production build automatically:

- Removes all `console.*` statements
- Minifies code with esbuild
- Removes comments and debugger statements
- Optimizes bundle size

```bash
npm run build
```

### Architecture

- **React 18** with hooks and modern patterns
- **Vite** for fast development and optimized builds
- **Tailwind CSS** for styling
- **React Query** for data fetching and caching
- **Pokemon TCG API** for card data

### Key Components

- `src/utils/logger.js` - Centralized logging utility
- `src/components/` - Reusable UI components
- `src/hooks/` - Custom React hooks
- `src/utils/storageUtils.js` - Local storage management

## Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Set build command: `npm run build`
3. Set output directory: `dist`
4. Deploy automatically on push to main

The production build will automatically have all console logs removed for optimal performance.

## Contributing

1. Follow the logging guidelines above
2. Use the `logger` utility instead of direct `console.*` calls
3. Keep debug logs minimal and focused
4. Test both development and production builds

## License

MIT
