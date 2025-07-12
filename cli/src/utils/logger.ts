export const logger = {
  info: (message: string, data?: any) => {
    console.error(`[INFO] ${message}`, data ? JSON.stringify(data) : '');
  },
  
  error: (message: string, error?: any) => {
    console.error(`[ERROR] ${message}`, error);
  },
  
  debug: (message: string, data?: any) => {
    if (process.env.DEBUG) {
      console.error(`[DEBUG] ${message}`, data ? JSON.stringify(data) : '');
    }
  },
};