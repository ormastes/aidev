/**
 * Fetcher Module
 * HTTP/HTTPS fetching with retry logic, cookie and session management,
 * proxy support, rate limiting, and user agent rotation
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { CookieJar } from 'tough-cookie';
import { ProxyAgent } from 'proxy-agent';
import UserAgent from 'user-agents';

export interface ProxyConfig {
  host: string;
  port: number;
  protocol: 'http' | 'https' | 'socks4' | 'socks5';
  username?: string;
  password?: string;
}

export interface RateLimitConfig {
  requestsPerSecond: number;
  requestsPerMinute: number;
  requestsPerHour: number;
  delayBetweenRequests: number;
  respectRobotsTxt: boolean;
}

export interface FetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD' | 'OPTIONS';
  headers?: Record<string, string>;
  data?: any;
  timeout?: number;
  followRedirects?: boolean;
  maxRedirects?: number;
  proxy?: ProxyConfig;
  cookies?: boolean;
  userAgent?: string | boolean; // true for random UA, string for specific UA
  validateStatus?: (status: number) => boolean;
}

export interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  backoffMultiplier: number;
  maxDelay: number;
  retryCondition: (error: any) => boolean;
}

export interface FetchResult {
  data: string | Buffer;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  url: string;
  redirectUrls: string[];
  timing: {
    start: number;
    end: number;
    duration: number;
  };
  cookies: Record<string, string>;
}

export interface RobotsInfo {
  allowed: boolean;
  crawlDelay?: number;
  sitemap?: string[];
}

export class RateLimiter {
  private requestQueue: Array<{
    resolve: Function;
    reject: Function;
    timestamp: number;
  }> = [];
  
  private lastRequestTime: number = 0;
  private requestCounts: {
    second: { count: number; timestamp: number };
    minute: { count: number; timestamp: number };
    hour: { count: number; timestamp: number };
  } = {
    second: { count: 0, timestamp: 0 },
    minute: { count: 0, timestamp: 0 },
    hour: { count: 0, timestamp: 0 }
  };

  constructor(private config: RateLimitConfig) {}

  async waitForSlot(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ resolve, reject, timestamp: Date.now() });
      this.processQueue();
    });
  }

  private processQueue(): void {
    if (this.requestQueue.length === 0) return;

    const now = Date.now();
    const secondsAgo = now - 1000;
    const minutesAgo = now - 60000;
    const hoursAgo = now - 3600000;

    // Reset counters if needed
    if (this.requestCounts.second.timestamp < secondsAgo) {
      this.requestCounts.second = { count: 0, timestamp: now };
    }
    if (this.requestCounts.minute.timestamp < minutesAgo) {
      this.requestCounts.minute = { count: 0, timestamp: now };
    }
    if (this.requestCounts.hour.timestamp < hoursAgo) {
      this.requestCounts.hour = { count: 0, timestamp: now };
    }

    // Check if we can process a request
    if (
      this.requestCounts.second.count < this.config.requestsPerSecond &&
      this.requestCounts.minute.count < this.config.requestsPerMinute &&
      this.requestCounts.hour.count < this.config.requestsPerHour
    ) {
      const timeSinceLastRequest = now - this.lastRequestTime;
      const minDelay = this.config.delayBetweenRequests;

      if (timeSinceLastRequest >= minDelay) {
        const request = this.requestQueue.shift();
        if (request) {
          this.requestCounts.second.count++;
          this.requestCounts.minute.count++;
          this.requestCounts.hour.count++;
          this.lastRequestTime = now;
          request.resolve();

          // Continue processing queue
          setTimeout(() => this.processQueue(), this.config.delayBetweenRequests);
        }
      } else {
        // Wait for remaining delay
        setTimeout(() => this.processQueue(), minDelay - timeSinceLastRequest);
      }
    } else {
      // Wait and try again
      setTimeout(() => this.processQueue(), 1000);
    }
  }
}

export class SessionManager {
  private cookieJar: CookieJar;
  private sessions: Map<string, any> = new Map();

  constructor() {
    this.cookieJar = new CookieJar();
  }

  getCookieJar(): CookieJar {
    return this.cookieJar;
  }

  setSession(key: string, value: any): void {
    this.sessions.set(key, value);
  }

  getSession(key: string): any {
    return this.sessions.get(key);
  }

  clearSession(key?: string): void {
    if (key) {
      this.sessions.delete(key);
    } else {
      this.sessions.clear();
    }
  }

  getCookiesForUrl(url: string): Record<string, string> {
    const cookies: Record<string, string> = {};
    const cookiesArray = this.cookieJar.getCookiesSync(url);
    
    for (const cookie of cookiesArray) {
      cookies[cookie.key] = cookie.value;
    }
    
    return cookies;
  }
}

export class Fetcher {
  private axios: AxiosInstance;
  private rateLimiter: RateLimiter;
  private sessionManager: SessionManager;
  private userAgents: UserAgent;
  private robotsCache: Map<string, RobotsInfo> = new Map();

  private defaultRetryConfig: RetryConfig = {
    maxRetries: 3,
    initialDelay: 1000,
    backoffMultiplier: 2,
    maxDelay: 30000,
    retryCondition: (error: any) => {
      // Retry on network errors, timeouts, and 5xx responses
      return !error.response || 
             error.code === 'ECONNRESET' ||
             error.code === 'ETIMEDOUT' ||
             error.code === 'ENOTFOUND' ||
             (error.response && error.response.status >= 500);
    }
  };

  constructor(
    rateLimitConfig?: RateLimitConfig,
    retryConfig?: Partial<RetryConfig>
  ) {
    this.rateLimiter = new RateLimiter(rateLimitConfig || {
      requestsPerSecond: 2,
      requestsPerMinute: 60,
      requestsPerHour: 1000,
      delayBetweenRequests: 500,
      respectRobotsTxt: true
    });

    this.sessionManager = new SessionManager();
    this.userAgents = new UserAgent();

    // Merge retry config
    if (retryConfig) {
      Object.assign(this.defaultRetryConfig, retryConfig);
    }

    this.axios = axios.create({
      timeout: 30000,
      maxRedirects: 5,
      validateStatus: (status) => status < 500 // Don't throw on 4xx errors
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.axios.interceptors.request.use((config) => {
      // Add timestamp for timing
      config.metadata = { startTime: Date.now() };
      return config;
    });

    // Response interceptor
    this.axios.interceptors.response.use(
      (response) => {
        // Add timing information
        if (response.config.metadata) {
          response.config.metadata.endTime = Date.now();
        }
        return response;
      },
      (error) => {
        // Add timing information to errors
        if (error.config && error.config.metadata) {
          error.config.metadata.endTime = Date.now();
        }
        return Promise.reject(error);
      }
    );
  }

  async fetch(url: string, options: FetchOptions = {}): Promise<FetchResult> {
    // Check robots.txt if enabled
    if (this.rateLimiter['config'].respectRobotsTxt) {
      const robotsInfo = await this.checkRobots(url);
      if (!robotsInfo.allowed) {
        throw new Error(`Robots.txt disallows access to ${url}`);
      }
      
      // Respect crawl delay
      if (robotsInfo.crawlDelay) {
        await new Promise(resolve => setTimeout(resolve, robotsInfo.crawlDelay * 1000));
      }
    }

    // Wait for rate limiter
    await this.rateLimiter.waitForSlot();

    // Prepare request config
    const config = await this.prepareConfig(url, options);

    // Execute request with retry logic
    return this.executeWithRetry(config);
  }

  private async prepareConfig(url: string, options: FetchOptions): Promise<AxiosRequestConfig> {
    const config: AxiosRequestConfig = {
      url,
      method: options.method || 'GET',
      timeout: options.timeout || 30000,
      headers: { ...options.headers },
      data: options.data,
      maxRedirects: options.maxRedirects || 5,
      validateStatus: options.validateStatus || ((status) => status < 500)
    };

    // Handle user agent
    if (options.userAgent === true) {
      config.headers!['User-Agent'] = this.userAgents.random().toString();
    } else if (typeof options.userAgent === 'string') {
      config.headers!['User-Agent'] = options.userAgent;
    } else if (!config.headers!['User-Agent']) {
      config.headers!['User-Agent'] = 'Mozilla/5.0 (compatible; WebScraper/1.0)';
    }

    // Handle cookies
    if (options.cookies !== false) {
      const cookies = this.sessionManager.getCookiesForUrl(url);
      if (Object.keys(cookies).length > 0) {
        const cookieString = Object.entries(cookies)
          .map(([key, value]) => `${key}=${value}`)
          .join('; ');
        config.headers!['Cookie'] = cookieString;
      }
    }

    // Handle proxy
    if (options.proxy) {
      const proxyUrl = this.buildProxyUrl(options.proxy);
      config.httpsAgent = new ProxyAgent(proxyUrl);
      config.httpAgent = new ProxyAgent(proxyUrl);
    }

    // Add common headers
    if (!config.headers!['Accept']) {
      config.headers!['Accept'] = 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8';
    }
    if (!config.headers!['Accept-Language']) {
      config.headers!['Accept-Language'] = 'en-US,en;q=0.5';
    }
    if (!config.headers!['Accept-Encoding']) {
      config.headers!['Accept-Encoding'] = 'gzip, deflate, br';
    }
    if (!config.headers!['Connection']) {
      config.headers!['Connection'] = 'keep-alive';
    }
    if (!config.headers!['Upgrade-Insecure-Requests']) {
      config.headers!['Upgrade-Insecure-Requests'] = '1';
    }

    return config;
  }

  private async executeWithRetry(config: AxiosRequestConfig): Promise<FetchResult> {
    let lastError: any;
    let attempt = 0;

    while (attempt <= this.defaultRetryConfig.maxRetries) {
      try {
        const response = await this.axios(config);
        return this.buildResult(response);
      } catch (error) {
        lastError = error;
        
        if (attempt < this.defaultRetryConfig.maxRetries && 
            this.defaultRetryConfig.retryCondition(error)) {
          
          const delay = Math.min(
            this.defaultRetryConfig.initialDelay * 
            Math.pow(this.defaultRetryConfig.backoffMultiplier, attempt),
            this.defaultRetryConfig.maxDelay
          );
          
          await new Promise(resolve => setTimeout(resolve, delay));
          attempt++;
        } else {
          break;
        }
      }
    }

    throw lastError;
  }

  private buildResult(response: AxiosResponse): FetchResult {
    const startTime = response.config.metadata?.startTime || 0;
    const endTime = response.config.metadata?.endTime || Date.now();
    
    // Extract cookies from response
    const cookies: Record<string, string> = {};
    const setCookieHeaders = response.headers['set-cookie'];
    if (setCookieHeaders) {
      for (const cookieHeader of setCookieHeaders) {
        const cookie = cookieHeader.split(';')[0];
        const [key, value] = cookie.split('=');
        if (key && value) {
          cookies[key.trim()] = value.trim();
          
          // Store in session manager
          this.sessionManager.getCookieJar().setCookieSync(
            `${key.trim()}=${value.trim()}`, 
            response.config.url!
          );
        }
      }
    }

    // Extract redirect URLs
    const redirectUrls: string[] = [];
    if (response.request && response.request._redirectable && response.request._redirectable._redirects) {
      for (const redirect of response.request._redirectable._redirects) {
        redirectUrls.push(redirect.url);
      }
    }

    return {
      data: response.data,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      url: response.config.url!,
      redirectUrls,
      timing: {
        start: startTime,
        end: endTime,
        duration: endTime - startTime
      },
      cookies
    };
  }

  private buildProxyUrl(proxy: ProxyConfig): string {
    let url = `${proxy.protocol}://`;
    
    if (proxy.username && proxy.password) {
      url += `${proxy.username}:${proxy.password}@`;
    }
    
    url += `${proxy.host}:${proxy.port}`;
    
    return url;
  }

  private async checkRobots(url: string): Promise<RobotsInfo> {
    const urlObj = new URL(url);
    const robotsUrl = `${urlObj.protocol}//${urlObj.host}/robots.txt`;
    
    // Check cache first
    if (this.robotsCache.has(urlObj.host)) {
      const cached = this.robotsCache.get(urlObj.host)!;
      return cached;
    }

    try {
      const response = await axios.get(robotsUrl, { timeout: 10000 });
      const robotsParser = require('robots-parser');
      const robots = robotsParser(robotsUrl, response.data);
      
      const info: RobotsInfo = {
        allowed: robots.isAllowed(url, 'WebScraper') !== false,
        crawlDelay: robots.getCrawlDelay('WebScraper') || robots.getCrawlDelay('*'),
        sitemap: robots.getSitemaps()
      };
      
      // Cache for 24 hours
      this.robotsCache.set(urlObj.host, info);
      setTimeout(() => {
        this.robotsCache.delete(urlObj.host);
      }, 24 * 60 * 60 * 1000);
      
      return info;
    } catch (error) {
      // If robots.txt is not accessible, allow scraping
      const info: RobotsInfo = { allowed: true };
      this.robotsCache.set(urlObj.host, info);
      return info;
    }
  }

  // Utility methods
  async head(url: string, options: Omit<FetchOptions, 'method'> = {}): Promise<FetchResult> {
    return this.fetch(url, { ...options, method: 'HEAD' });
  }

  async get(url: string, options: Omit<FetchOptions, 'method'> = {}): Promise<FetchResult> {
    return this.fetch(url, { ...options, method: 'GET' });
  }

  async post(url: string, data: any, options: Omit<FetchOptions, 'method' | 'data'> = {}): Promise<FetchResult> {
    return this.fetch(url, { ...options, method: 'POST', data });
  }

  getSessionManager(): SessionManager {
    return this.sessionManager;
  }

  setUserAgent(userAgent: string): void {
    this.axios.defaults.headers.common['User-Agent'] = userAgent;
  }

  getRateLimitConfig(): RateLimitConfig {
    return this.rateLimiter['config'];
  }

  updateRateLimitConfig(config: Partial<RateLimitConfig>): void {
    Object.assign(this.rateLimiter['config'], config);
  }

  clearCache(): void {
    this.robotsCache.clear();
    this.sessionManager.clearSession();
  }
}

export default Fetcher;