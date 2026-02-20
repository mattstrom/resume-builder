import React, { createContext, useContext, useCallback } from 'react';
import { toast } from 'sonner';

type Severity = 'success' | 'info' | 'warning' | 'error';

interface SnackbarContextType {
	showSnackbar: (message: string, severity?: Severity) => void;
}

const SnackbarContext = createContext<SnackbarContextType | undefined>(
	undefined,
);

export function useSnackbar(): SnackbarContextType {
	const context = useContext(SnackbarContext);
	if (!context) {
		throw new Error('useSnackbar must be used within a SnackbarProvider');
	}
	return context;
}

export function SnackbarProvider({ children }: { children: React.ReactNode }) {
	const showSnackbar = useCallback(
		(message: string, severity: Severity = 'info') => {
			switch (severity) {
				case 'success':
					toast.success(message);
					break;
				case 'error':
					toast.error(message, {
						duration: Infinity, // Don't auto-dismiss errors
					});
					break;
				case 'warning':
					toast.warning(message);
					break;
				case 'info':
				default:
					toast.info(message);
					break;
			}
		},
		[],
	);

	return (
		<SnackbarContext.Provider value={{ showSnackbar }}>
			{children}
		</SnackbarContext.Provider>
	);
}
