import type { Config } from "jest";

const config: Config = {
	preset: "ts-jest",
	transform: {
		"^.+\\.tsx?$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.jest.json" }],
	},
	testEnvironment: "node",
	roots: ["<rootDir>/app"],
	moduleNameMapper: {
		"^@/(.*)$": "<rootDir>/$1",
	},
	testMatch: ["**/__tests__/**/*.test.ts"],
};

export default config;
