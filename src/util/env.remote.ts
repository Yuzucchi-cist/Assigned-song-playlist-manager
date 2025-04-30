/**
 * Get enviromental variable that corresponds to argument of the key.
 * @param key - The key of enviromental variable to get.
 * @returns - The value of enviromental variable that corresponds to the key;
 */
export function getEnvVar(key: string): string {
    const value = PropertiesService.getScriptProperties().getProperty(key);

    if (!value) {
        throw new Error(`Missing required enviroment variable: ${key}`);
    }
    return value;
}

/**
 * Save enviroment variable to .env. If key don't exist, add key
 * @param key - The key of enviroment variable to be saved.
 * @param value - The value of enviroment variable to be saved.
 */
export function saveEnvVariable(
  key: string,
  value: string,
): void {
  
  const scriptProperties = PropertiesService.getScriptProperties();
  scriptProperties.setProperty(key, value);
}

/**
 * Save enviroment variable to .env. If key don't exist, add key.
 * @param variables - Enviroment variables pair of key and value to be saved.
 */
export function saveEnvVariables(
  variables: {[key: string]: string}
): void {
  const scriptProperties = PropertiesService.getScriptProperties();
  scriptProperties.setProperties(variables);
}