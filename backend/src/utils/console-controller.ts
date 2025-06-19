import readline from 'readline';

export class ConsoleController {
  private originalConsoleLog: typeof console.log;
  private originalConsoleError: typeof console.error;
  private isFrozen: boolean = false;
  private isVerbose: boolean;
  private messageBuffer: string[] = [];
  private maxBufferSize: number = 1000;
  private databaseServiceRef: any = null;
  private startupMessages: string[] = [];
  private captureStartup: boolean = true;

  constructor() {
    // Store original console methods
    this.originalConsoleLog = console.log.bind(console);
    this.originalConsoleError = console.error.bind(console);
    
    // Initialize verbose state from environment
    this.isVerbose = process.env.DATABASE_VERBOSE === 'true';

    // Only set up console features if not disabled
    if (process.env.DISABLE_CONSOLE_COMMANDS !== 'true') {
      // Override console methods
      this.overrideConsoleMethods();
      
      // Setup hotkeys
      this.setupHotkeys();
      
      // Show initial help - delayed to avoid interference with startup logs
      setTimeout(() => {
        this.captureStartup = false; // Stop capturing after startup
        this.showHotkeyHelp();
      }, 1000);
    }
  }

  // Method to set database service reference after initialization
  public setDatabaseService(dbService: any) {
    this.databaseServiceRef = dbService;
  }

  private overrideConsoleMethods() {
    console.log = (...args: any[]) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      
      // Capture startup messages
      if (this.captureStartup && (
        message.includes('✅ Loaded') || 
        message.includes('configurations') ||
        message.includes('agents from configuration')
      )) {
        this.startupMessages.push(message);
      }
      
      if (this.isFrozen) {
        // Store in buffer when frozen
        this.messageBuffer.push(`[LOG] ${new Date().toISOString()} ${message}`);
        if (this.messageBuffer.length > this.maxBufferSize) {
          this.messageBuffer.shift(); // Remove oldest message
        }
      } else {
        this.originalConsoleLog(...args);
      }
    };

    console.error = (...args: any[]) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      
      if (this.isFrozen) {
        // Store in buffer when frozen
        this.messageBuffer.push(`[ERROR] ${new Date().toISOString()} ${message}`);
        if (this.messageBuffer.length > this.maxBufferSize) {
          this.messageBuffer.shift(); // Remove oldest message
        }
      } else {
        this.originalConsoleError(...args);
      }
    };
  }

  private setupHotkeys() {
    try {
      // Create a readline interface for line-based input
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: false,
        prompt: '' // Empty prompt to avoid interference
      });

      // Prevent readline from exiting on Ctrl+D
      rl.on('close', () => {
        // Recreate the interface if it closes
        setTimeout(() => this.setupHotkeys(), 100);
      });

      // Listen for line events (when user presses Enter)
      rl.on('line', (line: string) => {
        const command = line.trim().toLowerCase();
        
        switch (command) {
          case 'c':
            this.clearConsole();
            break;
          case 'f':
            this.toggleFreeze();
            break;
          case 'v':
            this.toggleVerbose();
            break;
          case 'h':
            this.showHotkeyHelp();
            break;
          case 'rs': // Nodemon restart command - let it pass through
            process.stdout.write('rs\n');
            break;
          default:
            // Don't do anything for other input
            break;
        }
      });

      // Handle process exit
      process.on('SIGINT', () => {
        rl.close();
        this.cleanup();
        process.exit(0);
      });

      this.originalConsoleLog('✅ Console commands enabled');
    } catch (error) {
      this.originalConsoleLog('⚠️  Could not set up console commands:', error);
    }
  }

  private clearConsole() {
    // Clear the console
    process.stdout.write('\x1Bc');
    
    // Redisplay startup information
    this.displayStartupInfo();
    
    this.originalConsoleLog('🧹 Console cleared');
    this.showStatus();
  }

  private displayStartupInfo() {
    const PORT = process.env.PORT || 3001;
    const HOST = process.env.HOST || 'localhost';
    
    // Display captured startup messages first
    if (this.startupMessages.length > 0) {
      this.startupMessages.forEach(msg => this.originalConsoleLog(msg));
    }
    
    this.originalConsoleLog('\n🚀 Server is running!');
    this.originalConsoleLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    this.originalConsoleLog(`📡 Port: ${PORT}`);
    this.originalConsoleLog(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    this.originalConsoleLog(`🗄️  Database Verbose Logging: ${this.isVerbose ? '✅ Enabled' : '❌ Disabled'}`);
    
    // Display CORS configuration
    const origins = process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || 'http://localhost:5173';
    this.originalConsoleLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    this.originalConsoleLog('🔒 CORS Configuration:');
    if (origins === '*') {
      this.originalConsoleLog('   ⚠️  All origins allowed (wildcard)');
    } else {
      this.originalConsoleLog('   Allowed origins:');
      origins.split(',').forEach((origin: string) => 
        this.originalConsoleLog(`   • ${origin.trim()}`)
      );
    }
    
    this.originalConsoleLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    this.originalConsoleLog('📚 API Documentation:');
    this.originalConsoleLog(`   👉 http://${HOST}:${PORT}/api-docs`);
    this.originalConsoleLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    this.originalConsoleLog('🔗 Available endpoints:');
    this.originalConsoleLog(`   • GET  http://${HOST}:${PORT}/health`);
    this.originalConsoleLog(`   • POST http://${HOST}:${PORT}/api/export/conversation`);
    this.originalConsoleLog(`   • POST http://${HOST}:${PORT}/api/export/qa-pair`);
    this.originalConsoleLog(`   • GET  http://${HOST}:${PORT}/api/github/status`);
    this.originalConsoleLog(`   • GET  http://${HOST}:${PORT}/api/github/tree`);
    this.originalConsoleLog(`   • GET  http://${HOST}:${PORT}/api/github/files`);
    this.originalConsoleLog(`   • POST http://${HOST}:${PORT}/api/llm/execute-prompt`);
    this.originalConsoleLog(`   • GET  http://${HOST}:${PORT}/api/llm/status/:requestId`);
    this.originalConsoleLog(`   • GET  http://${HOST}:${PORT}/api/llm/configurations`);
    this.originalConsoleLog(`   • POST http://${HOST}:${PORT}/api/llm/test`);
    this.originalConsoleLog(`   • POST http://${HOST}:${PORT}/api/llm/reload`);
    this.originalConsoleLog(`   • GET  http://${HOST}:${PORT}/api/agent`);
    this.originalConsoleLog(`   • GET  http://${HOST}:${PORT}/api/agent/:name`);
    this.originalConsoleLog(`   • GET  http://${HOST}:${PORT}/api/agent/threads?agentName=xxx`);
    this.originalConsoleLog(`   • POST http://${HOST}:${PORT}/api/agent/reload`);
    this.originalConsoleLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Show hotkey help
    this.showHotkeyHelp();
  }

  private toggleFreeze() {
    this.isFrozen = !this.isFrozen;
    
    if (!this.isFrozen) {
      // When unfreezing, show buffered messages
      this.originalConsoleLog(`\n📋 Buffered messages while frozen (${this.messageBuffer.length} messages):`);
      this.originalConsoleLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      this.messageBuffer.forEach(msg => this.originalConsoleLog(msg));
      this.messageBuffer = []; // Clear buffer
      this.originalConsoleLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }
    
    this.originalConsoleLog(`❄️  Console output: ${this.isFrozen ? '🔴 FROZEN' : '🟢 ACTIVE'}`);
    this.showStatus();
  }

  private toggleVerbose() {
    this.isVerbose = !this.isVerbose;
    
    // Update environment variable
    process.env.DATABASE_VERBOSE = this.isVerbose ? 'true' : 'false';
    
    // Update database service verbose flag if reference is set
    if (this.databaseServiceRef) {
      this.databaseServiceRef.verbose = this.isVerbose;
    }
    
    this.originalConsoleLog(`🔊 Verbose mode: ${this.isVerbose ? '✅ ENABLED' : '❌ DISABLED'}`);
    this.showStatus();
  }

  private showStatus() {
    this.originalConsoleLog('\n📊 Current Status:');
    this.originalConsoleLog(`   • Console Output: ${this.isFrozen ? '🔴 Frozen' : '🟢 Active'}`);
    this.originalConsoleLog(`   • Verbose Mode: ${this.isVerbose ? '✅ Enabled' : '❌ Disabled'}`);
    this.originalConsoleLog(`   • Buffered Messages: ${this.messageBuffer.length}`);
    this.originalConsoleLog('');
  }

  private showHotkeyHelp() {
    this.originalConsoleLog('\n⌨️  Console Commands:');
    this.originalConsoleLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    this.originalConsoleLog('   Type a letter and press Enter:');
    this.originalConsoleLog('   • c ↵  : Clear console');
    this.originalConsoleLog('   • f ↵  : Freeze/Unfreeze output');
    this.originalConsoleLog('   • v ↵  : Toggle verbose mode');
    this.originalConsoleLog('   • h ↵  : Show this help');
    this.originalConsoleLog('   • Ctrl+C : Exit application');
    this.originalConsoleLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }

  private cleanup() {
    // Restore original console methods
    console.log = this.originalConsoleLog;
    console.error = this.originalConsoleError;
  }
}

// Export singleton instance
export const consoleController = new ConsoleController();