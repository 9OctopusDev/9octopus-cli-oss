import * as fs from 'fs';
import * as yaml from 'js-yaml';



class Config {


    private settings = {
        AUTH_ENABLED: true,
        NODE_ENV: 'development',
        OCTOPUS_API_URL: '',
        AUTH0_DOMAIN: '',
        AUTH0_CLIENT_ID: '',
        AUTH0_AUDIENCE: '',
        NETWORK_RETRY_MAX_ATTEMPTS: '3',
        NETWORK_RETRY_BASE_DELAY: '1000',
        NETWORK_RETRY_MAX_DELAY: '10000',
        NETWORK_RETRY_JITTER_PERCENT: '25',
        NETWORK_CONNECTION_TIMEOUT: '30000',
        NETWORK_REQUEST_TIMEOUT: '60000',
        DEFAULT_PROVIDER: '',
        DEFAULT_MODEL: '',
    };

    constructor(config_file_path: string = 'dist/config.yml') {
        // Load configuration from file if needed
        if (config_file_path) {
            try {
                const fileContents = fs.readFileSync(config_file_path, 'utf8');
                const loadedConfig = yaml.load(fileContents) as Partial<typeof this.settings>;

                for (const [key, value] of Object.entries(loadedConfig)) {

                    if (key in this.settings && value !== undefined) {
                        (this.settings as any)[key] = value;
                    }
                }
            } catch (error) {

            }
        }

    }

    getSetting<T>(key: keyof typeof this.settings): T {


        return this.settings[key] as T;
    }

    // setSetting(key: string, value: any) {
    //     this.settings[key] = value;
    // }
}

const envConfig = new Config();


export default envConfig;