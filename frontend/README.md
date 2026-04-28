# FAIRMEDIA Frontend

React-based frontend for the AI Fairness and Bias Detection system.

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm start
```

Runs the app in development mode at [http://localhost:3000](http://localhost:3000).

### Build

```bash
npm run build
```

Builds the app for production to the `build` folder.

## Project Structure

```
frontend/
├── public/
│   └── index.html           # HTML template
├── src/
│   ├── App.jsx              # Main application component
│   ├── index.js             # Entry point
│   ├── index.css            # Global styles
│   ├── api/
│   │   └── api_client.js    # API communication layer
│   ├── components/          # Reusable components
│   │   ├── Sidebar.jsx
│   │   ├── Header.jsx
│   │   ├── InputSection.jsx
│   │   ├── BiasDisplay.jsx
│   │   ├── FairnessDisplay.jsx
│   │   ├── SuggestionDisplay.jsx
│   │   └── ReviewSection.jsx
│   ├── pages/               # Page components
│   │   ├── Dashboard.jsx
│   │   ├── BiasAnalysis.jsx
│   │   └── FairnessMetrics.jsx
│   └── utils/               # Utility functions
│       └── textHighlighter.js
├── package.json
├── tailwind.config.js
└── postcss.config.js
```

## Environment Variables

Create a `.env` file in the frontend directory:

```
REACT_APP_API_URL=http://localhost:8000
```

## Features

- Interactive bias analysis dashboard
- Real-time text analysis
- Bias visualization with highlighted text
- Fairness metrics display
- Actionable recommendations
- Responsive design with Tailwind CSS

## Technologies

- React 18
- Tailwind CSS
- Fetch API for HTTP requests
- React Router (can be added for routing)

## Available Scripts

- `npm start` - Start development server
- `npm build` - Build for production
- `npm test` - Run tests
- `npm eject` - Eject from Create React App

## API Integration

The frontend communicates with the backend API at `http://localhost:8000` by default.

### Analyze Content

```javascript
import { analyzeText } from './api/api_client'

const result = await analyzeText('Your text here', {
  language: 'en',
  metadata: { source: 'user_input' }
})
```

### Health Check

```javascript
import { healthCheck } from './api/api_client'

const isHealthy = await healthCheck()
```

## Deployment

### Build for Production

```bash
npm run build
```

The build folder will contain optimized production files.

### Deploy to Static Hosting

The built files can be deployed to:
- AWS S3 + CloudFront
- Netlify
- Vercel
- GitHub Pages
- Any static hosting service

## Troubleshooting

### Port Already in Use

If port 3000 is already in use:
```bash
PORT=3001 npm start
```

### Build Fails

Clear cache and reinstall:
```bash
rm -rf node_modules package-lock.json
npm install
npm start
```

## Support

For issues or questions, check the main project README or open an issue on GitHub.
