import path from 'path';
import { getEnvVar, saveEnvVariable, saveEnvVariables } from '@/env';
import * as fs from 'fs';

describe("Generating local enviroment variable", () => {
    const test_key = "TEST";
    const test_value = "sample"
    beforeAll(() => {
        process.env[test_key] = test_value;
    });
    afterAll(resetTestEnvFile);

    describe("getEnvVar", () => {
        test("Get test from TEST", () => {
            const result = getEnvVar(test_key);
            expect(result).toBe(test_value);
        });

        test("Throw error when no matching", () => {
            const no_exist_property = "NOT_EXIST_PROPERTY";
            expect(() => getEnvVar(no_exist_property)).toThrow(new Error(`Missing required enviroment variable: ${no_exist_property}`));
        });
    });

    describe("saveEnvVariable", () => {
        const save_key = "SAVE_TEST";
        const save_value = "save test";

        test("Save enviromant variable to .env file.", () => {
            saveEnvVariable(save_key, save_value);
            expect(getTestEnvFromFile(save_key)).toBe(save_value);
        });

        test("Save to process env", () => {
            saveEnvVariable(save_key,save_value);
            expect(process.env[save_key]).toBe(save_value);
        })
    });

    describe("saveEnvVariables", () => {
        const save_variables: {[key: string]: string} = {
            "SAVE_TEST1": "save sample 1",
            "SAVE_TEST2": "save sample 2",
            "SAVE_TEST3": "save sample 3",
        };
        test("Save enviromant variable to .env file.", () => {
            saveEnvVariables(save_variables);
            Object.keys(save_variables).forEach((key) =>
                expect(getTestEnvFromFile(key)).toBe(save_variables[key]));
        });

        test("Save to process env", () => {
            saveEnvVariables(save_variables);
            Object.keys(save_variables).forEach((key) =>
                expect(process.env[key]).toBe(save_variables[key]));
        });
    });
    
});

const envFilePath = path.join(process.cwd(), ".env.test.local");
const envFileContent = fs.readFileSync(envFilePath, 'utf-8');
    
function getTestEnvFromFile(key: string): string | null {
    const regex = new RegExp(`^${key}=(.*)$`, 'm');
    const content = fs.readFileSync(envFilePath, 'utf-8');
    const matched = content.match(regex);
    return matched ? matched[1]: null;
}

function resetTestEnvFile() {
    fs.writeFileSync(envFilePath, envFileContent);        
}