import { Component, type ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { reportError } from '@/utils/errorLogger';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Last line of defense: an uncaught render error anywhere in the tree shows a
 * calm recovery screen instead of a white screen of death. "Try again" resets
 * the boundary and re-renders from the root — state that caused the crash is
 * usually gone by then (navigation params, transient context).
 */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: { componentStack?: string | null }) {
    reportError(error, { tag: 'ErrorBoundary', componentStack: info.componentStack });
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <View style={styles.root}>
        <Text style={styles.emoji}>🌙</Text>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.subtitle}>
          Take a breath — your data is safe.{'\n'}Tap below to continue.
        </Text>
        <TouchableOpacity style={styles.button} onPress={this.handleRetry} activeOpacity={0.85}>
          <Text style={styles.buttonText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const ACCENT = '#34D399';

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0A0A18',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  emoji: { fontSize: 44 },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.95)',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
    lineHeight: 21,
  },
  button: {
    marginTop: 16,
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 26,
    backgroundColor: ACCENT,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#052e22',
    letterSpacing: 0.5,
  },
});
