/**
 * Interceptor for crypto module
 * Monitors cryptographic operations
 */

import * as originalCrypto from 'node:crypto';
import { BaseInterceptor, CallInfo, ValidationResult } from './base-interceptor';

export class CryptoInterceptor extends BaseInterceptor<typeof originalCrypto> {
  constructor(config = {}) {
    super('crypto', originalCrypto, config);
  }
  
  protected createInterceptor(): typeof originalCrypto {
    // Crypto operations should generally be allowed but logged
    return {
      ...this.originalModule,
      
      // Wrap key generation methods for logging
      generateKeyPair: this.wrapMethod('crypto', "generateKeyPair", this.originalModule.generateKeyPair),
      generateKeyPairSync: this.wrapMethod('crypto', "generateKeyPairSync", this.originalModule.generateKeyPairSync),
      randomBytes: this.wrapMethod('crypto', "randomBytes", this.originalModule.randomBytes),
      randomUUID: this.wrapMethod('crypto', "randomUUID", this.originalModule.randomUUID),
      
      // Keep other methods as-is
      createHash: this.originalModule.createHash,
      createHmac: this.originalModule.createHmac,
      createCipher: this.originalModule.createCipher,
      createDecipher: this.originalModule.createDecipher,
      createCipheriv: this.originalModule.createCipheriv,
      createDecipheriv: this.originalModule.createDecipheriv,
      createSign: this.originalModule.createSign,
      createVerify: this.originalModule.createVerify,
      createDiffieHellman: this.originalModule.createDiffieHellman,
      createECDH: this.originalModule.createECDH,
      pbkdf2: this.originalModule.pbkdf2,
      pbkdf2Sync: this.originalModule.pbkdf2Sync,
      scrypt: this.originalModule.scrypt,
      scryptSync: this.originalModule.scryptSync,
      constants: this.originalModule.constants,
    };
  }
  
  protected async validateSpecific(info: CallInfo): Promise<ValidationResult> {
    // Crypto operations are generally safe but should be logged
    return { allowed: true };
  }
}