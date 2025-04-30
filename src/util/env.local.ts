/**
 * Get enviromental variable that corresponds to argument of the key.
 * @param key - The key of enviromental variable to get.
 * @returns - The value of enviromental variable that corresponds to the key;
 */
export function getEnvVar(key: string): string {
    const value = process.env[key];

    if (!value) {
        throw new Error(`Missing required enviroment variable: ${key}`);
    }
    return value;
}

import * as fs from 'fs';
import * as path from 'path';

/**
 * Save enviroment variable to .env. If key don't exist, add key
 * @param key The key of enviroment variable to be saved.
 * @param value The value of enviroment variable to be saved.
 */
export function saveEnvVariable(
  key: string,
  value: string,
): void {
    saveEnvVariables({[key]: value});
}

/**
 * Save enviroment variable to .env. If key don't exist, add key.
 * @param variables - Enviroment variables pair of key and value to be saved.
 */
export function saveEnvVariables(
  variables: {[key: string]: string}
) {
    const envFilePath: string = path.join(process.cwd(), '.env.test.local')

    let content = '';

    if (fs.existsSync(envFilePath)) {
        content = fs.readFileSync(envFilePath, 'utf8');
        Object.keys(variables).forEach((key) => {
            const value = variables[key];
            const regex = new RegExp(`^${key}=.*`, 'm');

            if (regex.test(content)) {
                // Update current keys
                content = content.replace(regex, `${key}=${value}`);
            } else {
            // Add new key
            content += `\n${key}=${value}`;
            }
        });

    } else {
        Object.keys(variables).forEach((key) => content = `${key}=${variables[key]}`);
    }

    fs.writeFileSync(envFilePath, content);

    Object.keys(variables).forEach((key) => process.env[key] = variables[key]);
}