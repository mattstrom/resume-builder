import { ChevronDown, Trash2 } from 'lucide-react';
import { type FC, type PropsWithChildren } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ExpandableCardProps extends PropsWithChildren {
	title: string;
	expanded: boolean;
	onExpandChange: () => void;
	onDelete: () => void;
}

export const ExpandableCard: FC<ExpandableCardProps> = ({
	title,
	expanded,
	onExpandChange,
	onDelete,
	children,
}) => {
	return (
		<Card className="mb-4 bg-card/5 border-border/50">
			<Collapsible open={expanded} onOpenChange={onExpandChange}>
				<CardHeader className="py-3">
					<div className="flex items-center justify-between">
						<h3 className="text-sm font-medium text-foreground">
							{title}
						</h3>
						<div className="flex items-center gap-1">
							<Button
								variant="ghost"
								size="icon"
								className="h-8 w-8"
								onClick={onExpandChange}
							>
								<ChevronDown
									className={cn(
										'h-4 w-4 transition-transform duration-300',
										expanded && 'rotate-180',
									)}
								/>
							</Button>
							<Button
								variant="ghost"
								size="icon"
								className="h-8 w-8"
								onClick={onDelete}
							>
								<Trash2 className="h-4 w-4" />
							</Button>
						</div>
					</div>
				</CardHeader>
				<CollapsibleContent>
					<CardContent>{children}</CardContent>
				</CollapsibleContent>
			</Collapsible>
		</Card>
	);
};
