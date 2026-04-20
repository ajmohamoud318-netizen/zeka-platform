import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("UI error:", error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-slate-950 p-6 text-left text-red-300">
          <h1 className="text-lg font-semibold text-white">Something broke while rendering</h1>
          <p className="mt-2 text-sm text-slate-400">Open the browser console (F12 → Console) for full details.</p>
          <pre className="mt-4 overflow-auto whitespace-pre-wrap rounded bg-slate-900 p-3 text-xs">
            {this.state.error.message}
            {"\n\n"}
            {this.state.error.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
