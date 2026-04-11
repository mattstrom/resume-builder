import { useQuery } from '@apollo/client/react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { type FC, useState } from 'react';
import { LIST_EDUCATIONS } from '../../../graphql/queries';

interface Education {
	_id: string;
	degree: string;
	field: string;
	institution: string;
	graduated: string;
}

interface EducationTransferListProps {
	selectedIds: string[];
	onChange: (newSelectedIds: string[]) => void;
}

export const EducationTransferList: FC<EducationTransferListProps> = ({
	selectedIds,
	onChange,
}) => {
	const { data, loading, error } = useQuery<{ listEducations: Education[] }>(
		LIST_EDUCATIONS,
		{
			fetchPolicy: 'network-only',
		},
	);
	const [checked, setChecked] = useState<string[]>([]);

	if (loading) {
		return <p className="text-foreground">Loading...</p>;
	}

	if (error) {
		return (
			<p className="text-destructive">
				Error loading educations: {error.message}
			</p>
		);
	}

	const allEducations = data?.listEducations || [];
	const available = allEducations.filter(
		(edu: Education) => !selectedIds.includes(edu._id),
	);
	const selected = allEducations.filter((edu: Education) =>
		selectedIds.includes(edu._id),
	);

	const formatEducation = (edu: Education) =>
		`${edu.degree} in ${edu.field} - ${edu.institution} (${edu.graduated})`;

	const handleToggle = (id: string) => {
		const currentIndex = checked.indexOf(id);
		const newChecked = [...checked];

		if (currentIndex === -1) {
			newChecked.push(id);
		} else {
			newChecked.splice(currentIndex, 1);
		}

		setChecked(newChecked);
	};

	const handleAllRight = () => {
		onChange([...selectedIds, ...available.map((edu) => edu._id)]);
		setChecked([]);
	};

	const handleCheckedRight = () => {
		const checkedAvailable = checked.filter((id) =>
			available.some((edu: Education) => edu._id === id),
		);
		onChange([...selectedIds, ...checkedAvailable]);
		setChecked(checked.filter((id) => !checkedAvailable.includes(id)));
	};

	const handleCheckedLeft = () => {
		const checkedSelected = checked.filter((id) =>
			selected.some((edu: Education) => edu._id === id),
		);
		onChange(selectedIds.filter((id) => !checkedSelected.includes(id)));
		setChecked(checked.filter((id) => !checkedSelected.includes(id)));
	};

	const handleAllLeft = () => {
		onChange([]);
		setChecked([]);
	};

	const customList = (title: string, items: Education[]) => (
		<div className="w-full h-[300px] overflow-auto bg-muted/30 border border-border rounded-md">
			<div className="p-2 text-sm font-medium text-foreground border-b border-border">
				{title}
			</div>
			<div role="list" className="divide-y divide-border">
				{items.map((edu) => {
					const labelId = `transfer-list-item-${edu._id}-label`;
					const isChecked = checked.indexOf(edu._id) !== -1;
					return (
						<div
							key={edu._id}
							role="listitem"
							className="flex items-center px-3 py-2 hover:bg-accent cursor-pointer transition-colors"
							onClick={() => handleToggle(edu._id)}
						>
							<Checkbox
								checked={isChecked}
								onCheckedChange={() => handleToggle(edu._id)}
								aria-labelledby={labelId}
								className="mr-3"
							/>
							<span
								id={labelId}
								className="text-sm text-foreground flex-1"
							>
								{formatEducation(edu)}
							</span>
						</div>
					);
				})}
			</div>
		</div>
	);

	return (
		<div className="flex gap-4 items-center mt-2">
			<div className="flex-1">{customList('Available', available)}</div>
			<div className="flex flex-col items-center min-w-[80px] gap-1">
				<Button
					variant="outline"
					size="sm"
					onClick={handleAllRight}
					disabled={available.length === 0}
				>
					≫
				</Button>
				<Button
					variant="outline"
					size="sm"
					onClick={handleCheckedRight}
					disabled={
						checked.filter((id) =>
							available.some((edu: Education) => edu._id === id),
						).length === 0
					}
				>
					&gt;
				</Button>
				<Button
					variant="outline"
					size="sm"
					onClick={handleCheckedLeft}
					disabled={
						checked.filter((id) =>
							selected.some((edu: Education) => edu._id === id),
						).length === 0
					}
				>
					&lt;
				</Button>
				<Button
					variant="outline"
					size="sm"
					onClick={handleAllLeft}
					disabled={selected.length === 0}
				>
					≪
				</Button>
			</div>
			<div className="flex-1">{customList('Selected', selected)}</div>
		</div>
	);
};
