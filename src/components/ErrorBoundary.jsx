import { Component } from "react";
import { Button } from "./ui";

/**
 * Catches render errors without leaking stack traces to end users.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    if (import.meta.env.DEV) {
      console.error("ErrorBoundary", error, info?.componentStack);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 px-4 text-center">
          <h1 className="text-xl font-semibold text-gray-900">Something went wrong</h1>
          <p className="max-w-md text-sm text-gray-600">
            Please refresh the page. If this keeps happening, contact your administrator.
          </p>
          <Button type="button" onClick={() => window.location.assign("/")}>
            Go home
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
