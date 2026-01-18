import { useQuery } from '@apollo/client/react';
import {
	Box,
	Button,
	Checkbox,
	List,
	ListItemButton,
	ListItemIcon,
	ListItemText,
	Paper,
	Stack,
	Typography,
} from '@mui/material';
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
	);
	const [checked, setChecked] = useState<string[]>([]);

	if (loading) {
		return <Typography sx={{ color: 'white' }}>Loading...</Typography>;
	}

	if (error) {
		return (
			<Typography sx={{ color: 'red' }}>
				Error loading educations: {error.message}
			</Typography>
		);
	}

	const allEducations = data?.listEducations || [];
	const available = allEducations.filter((edu: Education) => !selectedIds.includes(edu._id));
	const selected = allEducations.filter((edu: Education) => selectedIds.includes(edu._id));

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
		<Paper
			sx={{
				width: '100%',
				height: 300,
				overflow: 'auto',
				backgroundColor: 'rgba(0, 0, 0, 0.2)',
				border: '1px solid rgba(255, 255, 255, 0.1)',
			}}
		>
			<Typography
				variant="subtitle2"
				sx={{ p: 1, color: 'white', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}
			>
				{title}
			</Typography>
			<List dense component="div" role="list">
				{items.map((edu) => {
					const labelId = `transfer-list-item-${edu._id}-label`;
					return (
						<ListItemButton
							key={edu._id}
							role="listitem"
							onClick={() => handleToggle(edu._id)}
						>
							<ListItemIcon>
								<Checkbox
									checked={checked.indexOf(edu._id) !== -1}
									tabIndex={-1}
									disableRipple
									inputProps={{
										'aria-labelledby': labelId,
									}}
									sx={{
										color: 'rgba(255, 255, 255, 0.7)',
										'&.Mui-checked': {
											color: 'white',
										},
									}}
								/>
							</ListItemIcon>
							<ListItemText
								id={labelId}
								primary={formatEducation(edu)}
								sx={{ color: 'white' }}
							/>
						</ListItemButton>
					);
				})}
			</List>
		</Paper>
	);

	return (
		<Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mt: 1 }}>
			<Box sx={{ flex: 1 }}>
				{customList('Available', available)}
			</Box>
			<Stack sx={{ alignItems: 'center', minWidth: 80 }}>
				<Button
					sx={{ my: 0.5 }}
					variant="outlined"
					size="small"
					onClick={handleAllRight}
					disabled={available.length === 0}
				>
					≫
				</Button>
				<Button
					sx={{ my: 0.5 }}
					variant="outlined"
					size="small"
					onClick={handleCheckedRight}
					disabled={
						checked.filter((id) => available.some((edu: Education) => edu._id === id))
							.length === 0
					}
				>
					&gt;
				</Button>
				<Button
					sx={{ my: 0.5 }}
					variant="outlined"
					size="small"
					onClick={handleCheckedLeft}
					disabled={
						checked.filter((id) => selected.some((edu: Education) => edu._id === id))
							.length === 0
					}
				>
					&lt;
				</Button>
				<Button
					sx={{ my: 0.5 }}
					variant="outlined"
					size="small"
					onClick={handleAllLeft}
					disabled={selected.length === 0}
				>
					≪
				</Button>
			</Stack>
			<Box sx={{ flex: 1 }}>
				{customList('Selected', selected)}
			</Box>
		</Box>
	);
};
