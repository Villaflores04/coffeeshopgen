import { Component } from 'react';
import { EmptyState } from './ui.jsx';

// After a new deploy, a tab that was open earlier asks for page files that no
// longer exist. Reloading once fetches the new version.
const STALE_CHUNK = /dynamically imported module|Importing a module script failed|Failed to fetch dynamically|error loading dynamically/i;
const FLAG = 'coffeeshopgen.reloaded';

export default class ErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error(error);
    try {
      if (STALE_CHUNK.test(String(error?.message)) && !sessionStorage.getItem(FLAG)) {
        sessionStorage.setItem(FLAG, '1');
        window.location.reload();
      }
    } catch {
      /* sessionStorage can be unavailable; the reload button below still works */
    }
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <EmptyState
        title="That page didn’t load"
        action={
          <button className="rounded-lg bg-ink-900 px-5 py-2.5 text-sm font-semibold text-foam" onClick={() => window.location.assign('/')}>
            Reload the app
          </button>
        }
      >
        Something went wrong. Reloading usually fixes it.
      </EmptyState>
    );
  }
}
