import { createFileRoute } from '@tanstack/react-router';

import { ProfessionalStatementsView } from '@/components/profile/ProfessionalStatementsView.tsx';

export const Route = createFileRoute('/_authenticated/profile/statements')({
	component: ProfessionalStatementsView,
});
