import { createTheme } from '@mui/material';

export const darkTheme = createTheme({
	cssVariables: true,
	palette: { mode: 'dark' },
	components: {
		MuiButton: {
			defaultProps: {
				size: 'small',
				variant: 'outlined',
			},
		},
		MuiFormControl: {
			defaultProps: {
				size: 'small',
				variant: 'outlined',
			},
		},
	},
});
