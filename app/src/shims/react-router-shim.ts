/**
 * Shim so that epic-ui's `import { Link, useNavigate, useMatch } from 'react-router'`
 * resolves correctly when the app runs react-router-dom v6.
 * react-router-dom re-exports everything from react-router AND adds DOM-specific
 * things like Link, BrowserRouter, etc.
 */
export * from 'react-router-dom';
