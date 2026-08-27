import { renderHook } from '@testing-library/react-native';
import { useGreeting } from '../useGreeting';

describe('useGreeting', () => {
  it('uses the first name when one is given', () => {
    const { result } = renderHook(() => useGreeting('Zubair'));
    expect(result.current.text).toMatch(/^Good \w+, Zubair$/);
  });

  it('falls back to the plain time greeting when there is no name — never the app brand', () => {
    const { result } = renderHook(() => useGreeting(''));
    expect(result.current.text).toMatch(/^Good \w+$/);
    expect(result.current.text).not.toContain(',');
    expect(result.current.text).not.toMatch(/Well Mode|MindPulse/i);
  });

  it('also falls back cleanly when no argument is passed at all', () => {
    const { result } = renderHook(() => useGreeting());
    expect(result.current.text).toMatch(/^Good \w+$/);
  });
});
