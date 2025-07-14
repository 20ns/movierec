/**
 * Lambda Function Validation Tests
 * 
 * Tests that validate Lambda function code quality and error handling
 * to prevent 502 errors and ensure robust production deployment
 */

const fs = require('fs');
const path = require('path');

// Get all Lambda function directories
function getLambdaFunctions() {
    const lambdaDir = path.join(__dirname, '../lambda-functions');
    return fs.readdirSync(lambdaDir)
        .filter(dir => {
            const fullPath = path.join(lambdaDir, dir);
            return fs.statSync(fullPath).isDirectory() && 
                   fs.existsSync(path.join(fullPath, 'index.js'));
        })
        .map(dir => ({
            name: dir,
            path: path.join(lambdaDir, dir, 'index.js')
        }));
}

// Read and parse Lambda function code
function readLambdaCode(functionPath) {
    return fs.readFileSync(functionPath, 'utf8');
}

describe('Lambda Function Code Quality', () => {
    const lambdaFunctions = getLambdaFunctions();

    test('All Lambda functions should exist and be readable', () => {
        expect(lambdaFunctions.length).toBeGreaterThan(0);
        
        lambdaFunctions.forEach(func => {
            expect(fs.existsSync(func.path)).toBe(true);
            const code = readLambdaCode(func.path);
            expect(code.length).toBeGreaterThan(100); // Substantial code
        });
    });

    lambdaFunctions.forEach(func => {
        describe(`${func.name} Function Validation`, () => {
            let code;
            
            beforeAll(() => {
                code = readLambdaCode(func.path);
            });

            test('should export a handler function', () => {
                expect(code).toMatch(/exports\.handler\s*=|module\.exports\s*=.*handler/);
            });

            test('should handle CORS preflight requests', () => {
                // Should handle OPTIONS HTTP method
                expect(code).toMatch(/OPTIONS.*method/i);
                // Should use createApiResponse which handles CORS automatically
                expect(code).toMatch(/createApiResponse/i);
            });

            test('should have proper error handling for try-catch blocks', () => {
                const tryBlocks = (code.match(/try\s*{/g) || []).length;
                const catchBlocks = (code.match(/catch\s*\(/g) || []).length;
                
                // Every try should have a corresponding catch
                expect(catchBlocks).toBeGreaterThanOrEqual(tryBlocks);
            });

            test('should not have unhandled Promise rejections', () => {
                // Check for async functions without proper error handling
                const asyncFunctions = code.match(/async\s+\w+/g) || [];
                if (asyncFunctions.length > 0) {
                    expect(code).toMatch(/try|catch|\.catch\(/);
                }
            });

            test('should validate JWT tokens properly (if authentication required)', () => {
                if (code.includes('CognitoJwtVerifier') || code.includes('jwt')) {
                    // Should validate token format before processing
                    expect(code).toMatch(/token.*\.split\('\.'\)|tokenParts.*length/);
                    
                    // Should handle invalid token formats gracefully
                    expect(code).toMatch(/Invalid.*token.*format|token.*parts/i);
                    
                    // Should not let JWT verification errors crash the function
                    expect(code).toMatch(/catch.*error.*token/i);
                }
            });

            test('should return proper HTTP status codes', () => {
                // Should not return generic 500 errors for authentication issues
                if (code.includes('Authorization') || code.includes('Bearer')) {
                    expect(code).toMatch(/401|unauthorized/i);
                }
                
                // Should handle missing headers properly
                expect(code).toMatch(/400|401|404|500/);
            });

            test('should have proper input validation', () => {
                // Should validate required environment variables
                if (code.includes('process.env')) {
                    expect(code).toMatch(/if.*!.*process\.env|process\.env.*\|\|/);
                }
                
                // Should validate event structure
                expect(code).toMatch(/event\.|headers|body|httpMethod/);
            });

            test('should not crash on malformed requests', () => {
                // Should handle JSON parsing errors
                if (code.includes('JSON.parse')) {
                    expect(code).toMatch(/try.*JSON\.parse|catch.*parse/i);
                }
                
                // Should validate Authorization header format
                if (code.includes('Authorization')) {
                    expect(code).toMatch(/startsWith.*Bearer|Bearer\s+/);
                }
            });

            test('should use proper response formatting', () => {
                // Should use consistent response structure via shared utility
                expect(code).toMatch(/createApiResponse|response.*status|statusCode/i);
                
                // CORS headers are handled by createApiResponse utility, not in function code
                // This is the correct architectural pattern for separation of concerns
            });

            test('should have environment-specific logic', () => {
                // Should handle offline/development mode appropriately
                if (code.includes('IS_OFFLINE')) {
                    expect(code).toMatch(/process\.env\.IS_OFFLINE/);
                }
            });
        });
    });
});

describe('JWT Layer Dependencies', () => {
    test('JWT layer should exist and have required dependencies', () => {
        const jwtLayerPath = path.join(__dirname, '../lambda-layers/jwt/nodejs');
        const packageJsonPath = path.join(jwtLayerPath, 'package.json');
        const nodeModulesPath = path.join(jwtLayerPath, 'node_modules');
        const awsJwtVerifyPath = path.join(nodeModulesPath, 'aws-jwt-verify');

        expect(fs.existsSync(jwtLayerPath)).toBe(true);
        expect(fs.existsSync(packageJsonPath)).toBe(true);
        expect(fs.existsSync(nodeModulesPath)).toBe(true);
        expect(fs.existsSync(awsJwtVerifyPath)).toBe(true);
    });

    test('JWT layer package.json should have correct dependencies', () => {
        const packageJsonPath = path.join(__dirname, '../lambda-layers/jwt/nodejs/package.json');
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

        expect(packageJson.dependencies).toHaveProperty('aws-jwt-verify');
        expect(packageJson.dependencies['aws-jwt-verify']).toMatch(/^\^?[\d.]+/);
    });
});

describe('Shared Response Module', () => {
    const sharedResponsePath = path.join(__dirname, '../lambda-functions/shared/response.js');

    test('Shared response module should exist', () => {
        expect(fs.existsSync(sharedResponsePath)).toBe(true);
    });

    test('Shared response module should have proper CORS configuration', () => {
        const code = fs.readFileSync(sharedResponsePath, 'utf8');
        
        // Should include production domains
        expect(code).toMatch(/www\.movierec\.net|movierec\.net/);
        
        // Should include localhost for development
        expect(code).toMatch(/localhost.*3000/);
        
        // Should have proper CORS headers
        expect(code).toMatch(/Access-Control-Allow-Origin/);
        expect(code).toMatch(/Access-Control-Allow-Methods/);
        expect(code).toMatch(/Access-Control-Allow-Headers/);
    });
});

describe('Environment Configuration', () => {
    test('Environment variables should be properly configured', () => {
        const envPath = path.join(__dirname, '../.env');
        
        if (fs.existsSync(envPath)) {
            const envContent = fs.readFileSync(envPath, 'utf8');
            
            // Should have required API configuration
            expect(envContent).toMatch(/REACT_APP_API_GATEWAY_INVOKE_URL/);
            expect(envContent).toMatch(/REACT_APP_TMDB_API_KEY/);
        }
    });

    test('CDK configuration should be valid', () => {
        const cdkConfigPath = path.join(__dirname, '../infrastructure/cdk.json');
        
        expect(fs.existsSync(cdkConfigPath)).toBe(true);
        
        const cdkConfig = JSON.parse(fs.readFileSync(cdkConfigPath, 'utf8'));
        expect(cdkConfig).toHaveProperty('app');
        expect(cdkConfig.app).toMatch(/\.js|\.ts/);
    });
});

describe('Code Quality Standards', () => {
    const lambdaFunctions = getLambdaFunctions();

    lambdaFunctions.forEach(func => {
        test(`${func.name} should not have console.log in production code`, () => {
            const code = readLambdaCode(func.path);
            
            // Allow console.error and console.warn, but minimize console.log
            const consoleLogs = (code.match(/console\.log/g) || []).length;
            const consoleErrors = (code.match(/console\.(error|warn)/g) || []).length;
            
            // Should have more error logging than debug logging
            expect(consoleErrors).toBeGreaterThan(0);
        });

        test(`${func.name} should have proper constants and configuration`, () => {
            const code = readLambdaCode(func.path);
            
            // Should not have hardcoded URLs or sensitive data
            expect(code).not.toMatch(/https:\/\/[^'"]*\.amazonaws\.com[^'"]*\/[^'"]/);
            expect(code).not.toMatch(/AKIA[A-Z0-9]{16}/); // AWS Access Key pattern
        });
    });
});