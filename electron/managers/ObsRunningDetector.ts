import { exec } from 'child_process';
import util from 'util';
import { logger } from '../utils/logger';

const execAsync = util.promisify(exec);

export class ObsRunningDetector {
    /**
     * Checks if OBS Studio is currently running.
     * Looks for obs64.exe or obs.exe processes.
     */
    async isRunning(): Promise<boolean> {
        try {
            // Windows: tasklist command
            if (process.platform === 'win32') {
                const { stdout } = await execAsync('tasklist /FI "IMAGENAME eq obs64.exe" /FO CSV');
                if (stdout.includes('obs64.exe')) {
                    return true;
                }

                const { stdout: stdout2 } = await execAsync('tasklist /FI "IMAGENAME eq obs.exe" /FO CSV');
                if (stdout2.includes('obs.exe')) {
                    return true;
                }
            } else {
                // Linux/Mac: ps command
                const { stdout } = await execAsync('ps aux | grep -i obs');
                const lines = stdout.split('\n');
                for (const line of lines) {
                    if (line.includes('obs') && !line.includes('grep')) {
                        return true;
                    }
                }
            }

            return false;
        } catch (error) {
            // If command fails, assume not running to be safe
            logger.error('Error checking if OBS is running', error);
            return false;
        }
    }
}

