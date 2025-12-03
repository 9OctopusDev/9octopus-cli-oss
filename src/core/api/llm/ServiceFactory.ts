import {LLMService} from './LLMService.js';
import {BackendApiService} from '../backendApiService.js';
import {DirectLLMService} from './DirectLLMService.js';

export class ServiceFactory {
	static createService(sessionId: string): LLMService {
		const useBackend = process.env['9OCTOPUS_SERVICE'] === 'true';

		if (useBackend) {
			return new BackendApiService(sessionId);
		} else {
			return new DirectLLMService();
		}
	}
}
