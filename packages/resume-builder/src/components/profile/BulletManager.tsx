import {
	type Bullet,
	BulletSourceType,
	BulletStatus,
	type UpdateBulletInput,
} from '@resume-builder/entities';
import { Plus } from 'lucide-react';
import { observer } from 'mobx-react';
import { type FC, useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Card, CardContent, CardHeader } from '@/components/ui/card.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select.tsx';
import { Switch } from '@/components/ui/switch.tsx';
import { Textarea } from '@/components/ui/textarea.tsx';
import { useStore } from '@/stores/store.provider.tsx';

interface BulletManagerProps {
	sourceType: BulletSourceType;
	sourceId: string;
}

type ScoreKey = 'context' | 'action' | 'outcome' | 'clarity';

const SCORE_FIELDS: Array<{ key: ScoreKey; label: string }> = [
	{ key: 'context', label: 'Context' },
	{ key: 'action', label: 'Action' },
	{ key: 'outcome', label: 'Outcome' },
	{ key: 'clarity', label: 'Clarity' },
];

const BulletCard: FC<{ bullet: Bullet }> = observer(({ bullet }) => {
	const { bulletsStore } = useStore();
	const [text, setText] = useState(bullet.text);

	useEffect(() => setText(bullet.text), [bullet.text]);

	const update = (input: UpdateBulletInput) => void bulletsStore.update(bullet.id, input);

	return (
		<Card>
			<CardHeader className="flex-row items-center gap-2">
				<Badge variant={bullet.status === BulletStatus.DRAFT ? 'secondary' : 'outline'}>
					{bullet.status}
				</Badge>
				<Select
					value={bullet.status}
					onValueChange={(status) =>
						void bulletsStore.setStatus(bullet.id, status as BulletStatus)
					}
				>
					<SelectTrigger className="ml-auto h-8 w-32">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectGroup>
							<SelectItem value={BulletStatus.DRAFT}>Draft</SelectItem>
							<SelectItem value={BulletStatus.READY}>Ready</SelectItem>
							<SelectItem value={BulletStatus.ARCHIVED}>Archived</SelectItem>
						</SelectGroup>
					</SelectContent>
				</Select>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				<div className="flex flex-col gap-1">
					<Label htmlFor={`bullet-${bullet.id}`}>Bullet</Label>
					<Textarea
						id={`bullet-${bullet.id}`}
						value={text}
						onChange={(event) => setText(event.target.value)}
						onBlur={() => {
							const value = text.trim();
							if (value && value !== bullet.text) update({ text: value });
						}}
					/>
				</div>
				<div className="grid gap-3 sm:grid-cols-2">
					{SCORE_FIELDS.map(({ key, label }) => (
						<ScoreField key={key} bullet={bullet} scoreKey={key} label={label} />
					))}
				</div>
			</CardContent>
		</Card>
	);
});

const ScoreField: FC<{
	bullet: Bullet;
	scoreKey: ScoreKey;
	label: string;
}> = observer(({ bullet, scoreKey, label }) => {
	const { bulletsStore } = useStore();
	const scoreField = `${scoreKey}Score` as keyof UpdateBulletInput;
	const noteField = `${scoreKey}Note` as keyof UpdateBulletInput;
	const score = bullet[scoreField as keyof Bullet] as number | null | undefined;
	const note = bullet[noteField as keyof Bullet] as string | null | undefined;
	const [scoreDraft, setScoreDraft] = useState(score == null ? '' : String(score));
	const [noteDraft, setNoteDraft] = useState(note ?? '');

	useEffect(() => setScoreDraft(score == null ? '' : String(score)), [score]);
	useEffect(() => setNoteDraft(note ?? ''), [note]);

	return (
		<div className="flex flex-col gap-1 rounded-md border border-border p-3">
			<Label htmlFor={`${scoreKey}-score-${bullet.id}`}>{label}</Label>
			<Input
				id={`${scoreKey}-score-${bullet.id}`}
				type="number"
				min="0"
				max="1"
				step="0.05"
				value={scoreDraft}
				onChange={(event) => setScoreDraft(event.target.value)}
				onBlur={() => {
					const parsed = scoreDraft === '' ? null : Number(scoreDraft);
					if (
						parsed === null ||
						(Number.isFinite(parsed) && parsed >= 0 && parsed <= 1)
					) {
						void bulletsStore.update(bullet.id, { [scoreField]: parsed });
					}
				}}
			/>
			<Input
				aria-label={`${label} note`}
				placeholder={`${label} note`}
				value={noteDraft}
				onChange={(event) => setNoteDraft(event.target.value)}
				onBlur={() => {
					if (noteDraft !== (note ?? '')) {
						void bulletsStore.update(bullet.id, { [noteField]: noteDraft || null });
					}
				}}
			/>
		</div>
	);
});

export const BulletManager: FC<BulletManagerProps> = observer(({ sourceType, sourceId }) => {
	const { bulletsStore } = useStore();
	const [showArchived, setShowArchived] = useState(false);
	const [newText, setNewText] = useState('');
	const bullets = bulletsStore.forSource(sourceType, sourceId, showArchived);

	const addBullet = async () => {
		const text = newText.trim();
		if (!text) return;
		await bulletsStore.create({ text, sourceType, sourceId });
		setNewText('');
	};

	return (
		<section className="flex flex-col gap-3">
			<div className="flex items-center justify-between gap-3">
				<div>
					<h4 className="text-sm font-medium">Resume bullets</h4>
					<p className="text-xs text-muted-foreground">
						Reusable statements for tailored resumes.
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Label htmlFor={`archived-${sourceType}-${sourceId}`}>Show archived</Label>
					<Switch
						id={`archived-${sourceType}-${sourceId}`}
						checked={showArchived}
						onCheckedChange={setShowArchived}
					/>
				</div>
			</div>

			{bullets.map((bullet) => (
				<BulletCard key={bullet.id} bullet={bullet} />
			))}

			<div className="flex flex-col gap-2">
				<Label htmlFor={`new-bullet-${sourceType}-${sourceId}`}>New bullet</Label>
				<Textarea
					id={`new-bullet-${sourceType}-${sourceId}`}
					placeholder="Describe an accomplishment, action, or outcome"
					value={newText}
					onChange={(event) => setNewText(event.target.value)}
				/>
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="self-start"
					disabled={!newText.trim()}
					onClick={() => void addBullet()}
				>
					<Plus data-icon="inline-start" />
					Add draft bullet
				</Button>
			</div>
		</section>
	);
});

export { BulletSourceType };
