import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";

export default [
	{
		files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"]
	},
	{
		languageOptions: { globals: { ...globals.browser, ...globals.node } }
	},
	pluginJs.configs.recommended,
	...tseslint.configs.recommended,
	pluginReact.configs.flat.recommended,
	{
		files: ["**/*.ts", "**/*.tsx"],
		rules: {
			// no explicit any disabled
			"@typescript-eslint/no-explicit-any": "off",
			"@typescript-eslint/no-unused-vars": "off",

			"semi": ["error", "never"],
			"quotes": ["error", "single"],
			"indent": ["error", "tab"]
		}
	}
];