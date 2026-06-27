import { forwardRef, useCallback, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

type Props = TextInputProps & {
  label: string;
  secureToggle?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
};

const Input = forwardRef<TextInput, Props>(function Input(
  { label, secureToggle = false, icon, style, ...props },
  ref,
) {
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);
  const localRef = useRef<TextInput | null>(null);

  const setRefs = useCallback(
    (node: TextInput | null) => {
      localRef.current = node;
      if (!ref) return;
      if (typeof ref === 'function') {
        ref(node);
        return;
      }
      ref.current = node;
    },
    [ref],
  );

  const handleToggleVisibility = useCallback(() => {
    setShow(v => !v);
    requestAnimationFrame(() => localRef.current?.focus());
  }, []);

  return (
    <View style={styles.wrap}>
      <Text style={focused ? styles.labelFocused : styles.label}>{label}</Text>
      <View style={[styles.field, focused && styles.fieldFocused]}>
        {icon ? (
          <Ionicons name={icon} size={18} color={focused ? COLORS.purpleLight : COLORS.textMuted} style={styles.leftIcon} />
        ) : null}
        <TextInput
          ref={setRefs}
          style={[styles.input, icon && styles.inputWithIcon, secureToggle && styles.inputWithToggle, style]}
          placeholderTextColor={COLORS.textMuted}
          secureTextEntry={secureToggle ? !show : props.secureTextEntry}
          onFocus={e => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={e => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          {...props}
        />
        {secureToggle ? (
          <TouchableOpacity onPress={handleToggleVisibility} activeOpacity={0.7} hitSlop={8}>
            <Ionicons
              name={show ? 'eye-off' : 'eye'}
              size={18}
              color={focused ? COLORS.purpleLight : COLORS.textMuted}
            />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
});

export default Input;

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  label: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  labelFocused: {
    color: COLORS.purpleLight,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingRight: 12,
  },
  fieldFocused: {
    borderColor: COLORS.purple,
  },
  input: {
    flex: 1,
    color: COLORS.text,
    fontSize: 15,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  inputWithIcon: {
    paddingLeft: 0,
  },
  inputWithToggle: {
    paddingRight: 8,
  },
  leftIcon: {
    marginLeft: 16,
  },
});
