
import { useState, useEffect, useCallback } from "react";

interface FormPersistenceOptions {
  storageKey: string;
  defaultValues: Record<string, any>;
  autoSaveDelay?: number;
}

export const useFormPersistence = <T extends Record<string, any>>({
  storageKey,
  defaultValues,
  autoSaveDelay = 1000
}: FormPersistenceOptions) => {
  const [formData, setFormData] = useState<T>(defaultValues as T);
  const [isDirty, setIsDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Load saved data on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsedData = JSON.parse(saved);
        setFormData({ ...defaultValues, ...parsedData } as T);
        setLastSaved(new Date(parsedData._lastSaved || Date.now()));
        console.log(`Restored form data from localStorage for key: ${storageKey}`);
      }
    } catch (error) {
      console.error("Error loading saved form data:", error);
    }
  }, [storageKey]);

  // Auto-save with debounce
  useEffect(() => {
    if (!isDirty) return;

    const timeoutId = setTimeout(() => {
      try {
        const dataToSave = {
          ...formData,
          _lastSaved: new Date().toISOString()
        };
        localStorage.setItem(storageKey, JSON.stringify(dataToSave));
        setLastSaved(new Date());
        setIsDirty(false);
        console.log(`Auto-saved form data for key: ${storageKey}`);
      } catch (error) {
        console.error("Error auto-saving form data:", error);
      }
    }, autoSaveDelay);

    return () => clearTimeout(timeoutId);
  }, [formData, isDirty, storageKey, autoSaveDelay]);

  const updateField = useCallback((field: keyof T, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  }, []);

  const updateForm = useCallback((updates: Partial<T>) => {
    setFormData(prev => ({ ...prev, ...updates }));
    setIsDirty(true);
  }, []);

  const resetForm = useCallback(() => {
    setFormData(defaultValues as T);
    setIsDirty(false);
    try {
      localStorage.removeItem(storageKey);
      console.log(`Cleared saved form data for key: ${storageKey}`);
    } catch (error) {
      console.error("Error clearing saved form data:", error);
    }
  }, [storageKey, defaultValues]);

  const hasSavedData = useCallback(() => {
    try {
      return localStorage.getItem(storageKey) !== null;
    } catch {
      return false;
    }
  }, [storageKey]);

  return {
    formData,
    updateField,
    updateForm,
    resetForm,
    isDirty,
    lastSaved,
    hasSavedData
  };
};
