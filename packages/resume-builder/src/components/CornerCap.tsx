import { type FC, type PropsWithChildren } from 'react';
import './CornerCap.css';

export const CornerCap: FC<PropsWithChildren> = ({ children }) => {
	return <div className="corner-cap">{children}</div>;
};
