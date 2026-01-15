'use client';

import {
	createContext,
	type FC,
	type PropsWithChildren,
	useContext,
} from 'react';
import type { Resume } from '@resume-builder/entities';

interface ResumeProviderProps extends PropsWithChildren {
	data: Resume;
}

export const ResumeContext = createContext<Resume['data'] | null>(null);

export const ResumeProvider: FC<ResumeProviderProps> = ({ data, children }) => {
	return (
		<ResumeContext.Provider value={data.data}>
			{children}
		</ResumeContext.Provider>
	);
};

export function useResume() {
	const resume = useContext(ResumeContext);

	if (!resume) {
		throw new Error('useResume() must be used within a ResumeProvider');
	}

	return resume;
}
