import { AppRegistry } from './AppRegistry';
import { AuthService } from './AuthService';

export class NavigationHelper {
  static async generateNavigationHTML(
    appId: string, 
    authService: AuthService, 
    req: any
  ): Promise<string> {
    const appRegistry = AppRegistry.getInstance();
    const user = await authService.getCurrentUser(req);
    const isAuthenticated = !!user;
    
    const navHTML = appRegistry.generateNavigationHTML(appId, isAuthenticated);
    const navScript = appRegistry.generateNavigationScript();
    
    return navHTML + navScript;
  }
  
  static injectNavigationIntoHTML(html: string, navigation: string): string {
    // Insert navigation after opening body tag
    return html.replace('<body>', `<body>\n${navigation}`);
  }
}