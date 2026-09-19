"use client";

import { Component, type ReactNode } from "react";

import { ConfigurationError } from "@/config/env";
import { ConfigErrorState } from "@/components/states/ConfigErrorState";

/**
 * Catches missing/invalid configuration at the shell boundary and renders the
 * honest configuration state. The application never fabricates configuration
 * values, so an unconfigured deployment must fail visibly (Rule: fail safe).
 */
export class ConfigErrorBoundary extends Component<{ children: ReactNode }, { error: ConfigurationError | null }> {
  state = { error: null as ConfigurationError | null };

  static getDerivedStateFromError(error: unknown) {
    if (error instanceof ConfigurationError) return { error };
    throw error;
  }

  render() {
    if (this.state.error) return <ConfigErrorState error={this.state.error} />;
    return this.props.children;
  }
}
