import { useState, useCallback } from 'react';

export function useFormValidation<T extends Record<string, any>>(initialValues: T) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Record<keyof T, string>>({} as any);

  const setFieldValue = useCallback((field: keyof T, value: any) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    // Hapus error saat user mulai mengetik
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  }, [errors]);

  const validate = useCallback((rules: Partial<Record<keyof T, (val: any) => string | null>>) => {
    const newErrors: Partial<Record<keyof T, string>> = {};
    let isValid = true;

    for (const key in rules) {
      const validator = rules[key];
      if (validator) {
        const errorMsg = validator(values[key]);
        if (errorMsg) {
          newErrors[key] = errorMsg;
          isValid = false;
        }
      }
    }

    setErrors(newErrors as Record<keyof T, string>);
    return isValid;
  }, [values]);

  const resetForm = useCallback((newValues?: T) => {
    if (newValues) setValues(newValues);
    else setValues(initialValues);
    setErrors({} as any);
  }, [initialValues]);

  return { values, errors, setFieldValue, validate, resetForm };
}
