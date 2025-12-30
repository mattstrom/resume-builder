import { type FC } from 'react';
import { useResume } from '../Resume.provider.tsx';

interface CandidateNameProps {}

export const CandidateName: FC<CandidateNameProps> = () => {
	const { name } = useResume();

	return <h1 className='candidate-name'>{name}</h1>;
};
