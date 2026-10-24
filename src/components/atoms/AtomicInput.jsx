import React from 'react';

/**
 * AtomicInput Atom
 * Standard styled input field for forms and filters.
 */
export default function AtomicInput({
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  className = '',
  disabled = false,
  ...rest
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      className={`atomic-input ${className}`.trim()}
      {...rest}
    />
  );
}
