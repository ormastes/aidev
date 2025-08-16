/**
 * Real Capture Service with multi-platform support
 * Inspired by _aidev implementation
 */

import { fsPromises as fs } from 'fs/promises';
import { path } from '../../../../../../infra_external-log-lib/src';
import { exec } from 'child_process';
import { promisify } from 'node:util';
import { getFileAPI, FileType } from '../../../../../../infra_external-log-lib/pipe';

const fileAPI = getFileAPI();


const execAsync = promisify(exec);

export interface CaptureOptions {
  platform: 'ios' | 'android' | 'web' | 'desktop';
  deviceId?: string;
  browserName?: string;
  outputPath: string;
  format?: 'png' | 'jpg';
}

export interface CaptureResult {
  success: boolean;
  filePath?: string;
  error?: string;
  metadata?: {
    platform: string;
    timestamp: Date;
    deviceInfo?: string;
  };
}

export class RealCaptureService {
  private tempDir: string;
  private playwrightAvailable: boolean = false;

  constructor(tempDir: string = './temp/captures') {
    this.tempDir = tempDir;
    this.checkDependencies();
  }

  private async checkDependencies(): Promise<void> {
    // Check if Playwright is available
    try {
      await execAsync('bunx playwright --version');
      this.playwrightAvailable = true;
    } catch {
      this.playwrightAvailable = false;
    }
  }

  /**
   * Capture screenshot based on platform
   */
  async captureScreenshot(options: CaptureOptions): Promise<CaptureResult> {
    await fileAPI.createDirectory(path.dirname(options.outputPath));

    switch (options.platform) {
      case 'ios':
        return this.captureIOS(options);
      case 'android':
        return this.captureAndroid(options);
      case 'web':
        return this.captureWeb(options);
      case 'desktop':
        return this.captureDesktop(options);
      default:
        return {
          success: false,
          error: `Unsupported platform: ${options.platform}`
        };
    }
  }

  /**
   * Capture iOS simulator screenshot
   */
  private async captureIOS(options: CaptureOptions): Promise<CaptureResult> {
    try {
      const deviceId = options.deviceId || 'booted';
      const format = options.format || 'png';
      
      // Use xcrun simctl for iOS simulator
      const command = `xcrun simctl io ${deviceId} screenshot "${options.outputPath}"`;
      await execAsync(command);

      // Convert to desired format if needed
      if (format === 'jpg' && options.outputPath.endsWith('.png')) {
        const jpgPath = options.outputPath.replace('.png', '.jpg');
        await execAsync(`convert "${options.outputPath}" "${jpgPath}"`);
        await fileAPI.unlink(options.outputPath);
        options.outputPath = jpgPath;
      }

      return {
        success: true,
        filePath: options.outputPath,
        metadata: {
          platform: 'ios',
          timestamp: new Date(),
          deviceInfo: deviceId
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `iOS capture failed: ${error}`
      };
    }
  }

  /**
   * Capture Android device/emulator screenshot
   */
  private async captureAndroid(options: CaptureOptions): Promise<CaptureResult> {
    try {
      const deviceId = options.deviceId || '';
      const deviceFlag = deviceId ? `-s ${deviceId}` : '';
      
      // Capture screenshot on device
      const tempPath = '/sdcard/screenshot.png';
      await execAsync(`adb ${deviceFlag} shell screencap -p ${tempPath}`);
      
      // Pull screenshot to local
      await execAsync(`adb ${deviceFlag} pull ${tempPath} "${options.outputPath}"`);
      
      // Clean up device
      await execAsync(`adb ${deviceFlag} shell rm ${tempPath}`);

      return {
        success: true,
        filePath: options.outputPath,
        metadata: {
          platform: 'android',
          timestamp: new Date(),
          deviceInfo: deviceId || 'default'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Android capture failed: ${error}`
      };
    }
  }

  /**
   * Capture web browser screenshot using Playwright
   */
  private async captureWeb(options: CaptureOptions): Promise<CaptureResult> {
    if (!this.playwrightAvailable) {
      return {
        success: false,
        error: 'Playwright not available. Install with: npm install -D playwright'
      };
    }

    try {
      const browserName = options.browserName || "chromium";
      
      // Create a Playwright script
      const script = `
        const { ${browserName} } = require("playwright");
        (async () => {
          const browser = await ${browserName}.launch();
          const page = await browser.newPage();
          await page.goto('${process.env.APP_URL || 'http://localhost:3000'}');
          await page.waitForLoadState("networkidle");
          await page.screenshot({ 
            path: '${options.outputPath}',
            fullPage: true
          });
          await browser.close();
        })();
      `;

      // Execute the script
      await fileAPI.createFile(path.join(this.tempDir, 'capture-web.js'), { type: FileType.TEMPORARY })}"`);

      return {
        success: true,
        filePath: options.outputPath,
        metadata: {
          platform: 'web',
          timestamp: new Date(),
          deviceInfo: browserName
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Web capture failed: ${error}`
      };
    }
  }

  /**
   * Capture desktop screenshot
   */
  private async captureDesktop(options: CaptureOptions): Promise<CaptureResult> {
    try {
      const platform = process.platform;
      let command: string;

      switch (platform) {
        case 'darwin': // macOS
          command = `screencapture -x "${options.outputPath}"`;
          break;
        case 'win32': // Windows
          // Use PowerShell to capture screenshot
          const psScript = `
            Add-Type -AssemblyName System.Windows.Forms,System.Drawing
            $screens = [Windows.Forms.Screen]::AllScreens
            $top    = ($screens.Bounds.Top    | Measure-Object -Minimum).Minimum
            $left   = ($screens.Bounds.Left   | Measure-Object -Minimum).Minimum
            $right  = ($screens.Bounds.Right  | Measure-Object -Maximum).Maximum
            $bottom = ($screens.Bounds.Bottom | Measure-Object -Maximum).Maximum
            $bounds = [Drawing.Rectangle]::FromLTRB($left, $top, $right, $bottom)
            $bmp = New-Object Drawing.Bitmap $bounds.Width, $bounds.Height
            $graphics = [Drawing.Graphics]::FromImage($bmp)
            $graphics.CopyFromScreen($bounds.Location, [Drawing.Point]::Empty, $bounds.Size)
            $bmp.Save("${options.outputPath}")
            $graphics.Dispose()
            $bmp.Dispose()
          `.replace(/\n/g, ' ');
          command = `powershell -Command "${psScript}"`;
          break;
        case 'linux': // Linux
          // Try different tools in order of preference
          try {
            await execAsync('which gnome-screenshot');
            command = `gnome-screenshot -f "${options.outputPath}"`;
          } catch {
            try {
              await execAsync('which import');
              command = `import -window root "${options.outputPath}"`;
            } catch {
              command = `scrot "${options.outputPath}"`;
            }
          }
          break;
        default:
          throw new Error(`Unsupported platform: ${platform}`);
      }

      await execAsync(command);

      return {
        success: true,
        filePath: options.outputPath,
        metadata: {
          platform: 'desktop',
          timestamp: new Date(),
          deviceInfo: platform
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Desktop capture failed: ${error}`
      };
    }
  }

  /**
   * Capture synchronized screenshot and log
   */
  async captureSynchronized(
    screenshotOptions: CaptureOptions,
    logPath: string,
    logContent: string
  ): Promise<{ screenshot: CaptureResult; logSaved: boolean }> {
    // Capture screenshot
    const screenshot = await this.captureScreenshot(screenshotOptions);
    
    // Save log content
    let logSaved = false;
    try {
      await fileAPI.createDirectory(path.dirname(logPath));
      await fileAPI.writeFile(logPath, `\n[${new Date().toISOString()}]\n${logContent}\n`);
      logSaved = true;
    } catch (error) {
      console.error('Failed to save log:', { append: true });
    }

    return { screenshot, logSaved };
  }

  /**
   * Clean up temporary files
   */
  async cleanup(): Promise<void> {
    try {
      await fs.rm(this.tempDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  }
}