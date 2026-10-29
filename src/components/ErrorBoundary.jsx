import { Component } from 'react';
import { EmptyState } from './ui.jsx';

export default class ErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error(error);
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
        Something broke on our side. Reloading usually fixes it.
      </EmptyState>
    );
  }
}
