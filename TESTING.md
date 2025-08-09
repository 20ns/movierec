# MovieRec API Testing Guide

## Instant Testing (No Setup Required!)

Your API testing is now completely automated. Just run the command and everything works instantly.

### Test Everything
```bash
npm run test:instant
```

### Test Specific Endpoints
```bash
# Test recommendations only
npm run test:instant recommendations

# Test user preferences
npm run test:instant preferences  

# Test favorites
npm run test:instant favorites

# Test watchlist
npm run test:instant watchlist
```

## What You Get

✅ **No manual setup** - Just run the command  
✅ **Automatic authentication** - Uses built-in test account  
✅ **Fresh JWT tokens** - Auto-generated every time  
✅ **Real API testing** - Tests your actual production endpoints  
✅ **Comprehensive coverage** - All major functionality tested  

## Sample Output

```
🚀 MovieRec Instant Tester

🔐 Authenticating with test account...
✅ Authentication successful

🧪 Running All Tests - 8/9/2025, 5:38:46 PM

👤 Testing User Preferences...
✅ Get Preferences [200] 
✅ Set Preferences [200] 6 fields

⭐ Testing Favorites...
✅ Get Favorites [200] 0 items
✅ Add to Favorites [200] Fight Club

📺 Testing Watchlist...
✅ Get Watchlist [200] 0 items
✅ Add to Watchlist [200] Game of Thrones

🎯 Testing Recommendations...
✅ Movie Recs [200] 3 items 10s
✅ TV Recs [200] 3 items 5s
✅ Mixed Recs [200] 6 items 2s

📊 Results: 9 passed, 1 failed
```

## What Gets Tested

1. **User Preferences** - Get/set user taste profiles
2. **Favorites Management** - Add/remove/list favorites  
3. **Watchlist Management** - Add/remove/list watchlist items
4. **Personalized Recommendations** - Movie, TV, and mixed recommendations
5. **Performance Tracking** - Processing times for recommendations

## Technical Details

- **Test Account**: `test@gmail.com` (auto-created and verified)
- **Authentication**: Automatic JWT token generation
- **Clean Testing**: Adds and removes test data to avoid pollution
- **Performance Metrics**: Shows recommendation processing times
- **Error Handling**: Clear error messages and status codes

## Perfect For

✅ **After code changes** - Verify everything still works  
✅ **Before deployments** - Ensure API health  
✅ **Daily development** - Quick functionality checks  
✅ **Debugging issues** - Isolate API problems  
✅ **Performance monitoring** - Track recommendation speeds  

## No More

❌ Manual JWT token copying  
❌ Complex authentication setup  
❌ Credential management  
❌ Browser developer tools  
❌ Account creation hassles  

Just run `npm run test:instant` anytime you want to test your API!