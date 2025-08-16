/**
 * useForm Hook
 * Form management with validation
 */

import { useState, useCallback, useEffect } from 'react';

export interface FormConfig<T> {
  initialValues: T;
  validate?: (values: T) => Partial<Record<keyof T, string>>;
  onSubmit: (values: T) => void | Promise<void>;
}

export interface FormState<T> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isSubmitting: boolean;
  isValid: boolean;
}

export interface FormHelpers<T> {
  handleChange: (field: keyof T) => (value: any) => void;
  handleBlur: (field: keyof T) => () => void;
  handleSubmit: () => void;
  setFieldValue: (field: keyof T, value: any) => void;
  setFieldError: (field: keyof T, error: string) => void;
  setFieldTouched: (field: keyof T, touched: boolean) => void;
  resetForm: () => void;
  validateForm: () => boolean;
}

export function useForm<T extends Record<string, any>>(
  config: FormConfig<T>
): FormState<T> & FormHelpers<T> {
  const { initialValues, validate, onSubmit } = config;

  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValid, setIsValid] = useState(true);

  // Validate form whenever values change
  useEffect(() => {
    if (validate) {
      const validationErrors = validate(values);
      setErrors(validationErrors);
      setIsValid(Object.keys(validationErrors).length === 0);
    }
  }, [values, validate]);

  const handleChange = useCallback(
    (field: keyof T) => (value: any) => {
      setValues(prev => ({
        ...prev,
        [field]: value,
      }));
      setTouched(prev => ({
        ...prev,
        [field]: true,
      }));
    },
    []
  );

  const handleBlur = useCallback(
    (field: keyof T) => () => {
      setTouched(prev => ({
        ...prev,
        [field]: true,
      }));
    },
    []
  );

  const validateForm = useCallback((): boolean => {
    if (!validate) return true;

    const validationErrors = validate(values);
    setErrors(validationErrors);
    
    // Mark all fields as touched
    const allTouched = Object.keys(values).reduce(
      (acc, key) => ({
        ...acc,
        [key]: true,
      }),
      {} as Partial<Record<keyof T, boolean>>
    );
    setTouched(allTouched);

    const isFormValid = Object.keys(validationErrors).length === 0;
    setIsValid(isFormValid);
    return isFormValid;
  }, [values, validate]);

  const handleSubmit = useCallback(async () => {
    // Validate form before submission
    const isFormValid = validateForm();
    
    if (!isFormValid) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(values);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [values, onSubmit, validateForm]);

  const setFieldValue = useCallback((field: keyof T, value: any) => {
    setValues(prev => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const setFieldError = useCallback((field: keyof T, error: string) => {
    setErrors(prev => ({
      ...prev,
      [field]: error,
    }));
  }, []);

  const setFieldTouched = useCallback((field: keyof T, isTouched: boolean) => {
    setTouched(prev => ({
      ...prev,
      [field]: isTouched,
    }));
  }, []);

  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
    setIsValid(true);
  }, [initialValues]);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    isValid,
    handleChange,
    handleBlur,
    handleSubmit,
    setFieldValue,
    setFieldError,
    setFieldTouched,
    resetForm,
    validateForm,
  };
}

export default useForm;