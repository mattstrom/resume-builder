import { type FC } from 'react';
import { useSettings } from './Settings.provider.tsx';

interface ControlsProps {}

export const Controls: FC<ControlsProps> = () => {
	const { template, setTemplate, showMarginPattern, setShowMarginPattern } =
		useSettings();

	return (
		<form>
			<fieldset>
				<label htmlFor="template">Template</label>
				<select
					id="template"
					value={template}
					onChange={(ev) => {
						setTemplate(ev.target.value);
					}}
				>
					<option value="basic">Basic</option>
					<option value="column">Column</option>
				</select>
			</fieldset>
			<fieldset>
				<label htmlFor="marginPattern">Show Margin Pattern</label>
				<input
					id="marginPattern"
					type="checkbox"
					checked={showMarginPattern}
					onChange={(ev) => {
						setShowMarginPattern(ev.target.checked);
					}}
				/>
			</fieldset>
		</form>
	);
};
