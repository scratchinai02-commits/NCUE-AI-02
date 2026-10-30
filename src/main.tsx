import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { enableProtection } from './lib/protect';
import './index.css';

enableProtection();

createRoot(document.getElementById('root')!).render(<App />);
