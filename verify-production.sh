#!/bin/bash

# Production deployment verification script
# Run this after deploying to Vercel to ensure everything works

echo "🚀 VERIFYING PRODUCTION DEPLOYMENT"
echo "=================================="

# Get the production URL from Vercel
PROD_URL=${VERCEL_URL:-"https://playlists-mvp3.vercel.app"}
echo "Production URL: $PROD_URL"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to test endpoint
test_endpoint() {
    local endpoint=$1
    local expected_status=$2
    local description=$3
    
    echo -n "Testing $description... "
    
    response=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_URL$endpoint")
    
    if [ "$response" = "$expected_status" ]; then
        echo -e "${GREEN}✅ PASS${NC} ($response)"
        return 0
    else
        echo -e "${RED}❌ FAIL${NC} (Expected: $expected_status, Got: $response)"
        return 1
    fi
}

# Function to test streaming endpoint
test_streaming() {
    echo -n "Testing streaming endpoint... "
    
    # Test that streaming endpoint responds with proper headers
    response=$(curl -s -I "$PROD_URL/api/playlist/stream?prompt=test&target_tracks=5" | head -1)
    
    if [[ $response == *"200"* ]]; then
        echo -e "${GREEN}✅ PASS${NC} (Streaming headers OK)"
        return 0
    else
        echo -e "${RED}❌ FAIL${NC} (Streaming not working)"
        return 1
    fi
}

# Function to test health endpoint
test_health() {
    echo -n "Testing health endpoint... "
    
    response=$(curl -s "$PROD_URL/api/health" | jq -r '.status' 2>/dev/null)
    
    if [ "$response" = "healthy" ]; then
        echo -e "${GREEN}✅ PASS${NC} (Health check OK)"
        return 0
    else
        echo -e "${RED}❌ FAIL${NC} (Health check failed)"
        return 1
    fi
}

# Run tests
echo ""
echo "🔍 RUNNING TESTS"
echo "================"

failed_tests=0

# Test basic endpoints
test_endpoint "/" "200" "Home page" || ((failed_tests++))
test_endpoint "/api/health" "200" "Health endpoint" || ((failed_tests++))
test_endpoint "/api/auth/session" "200" "Auth session" || ((failed_tests++))

# Test streaming
test_streaming || ((failed_tests++))

# Test health check
test_health || ((failed_tests++))

echo ""
echo "📊 RESULTS"
echo "=========="

if [ $failed_tests -eq 0 ]; then
    echo -e "${GREEN}🎉 ALL TESTS PASSED!${NC}"
    echo -e "${GREEN}✅ Production deployment is working correctly${NC}"
    echo ""
    echo "🔗 Useful URLs:"
    echo "   • App: $PROD_URL"
    echo "   • Health: $PROD_URL/api/health"
    echo "   • Streaming: $PROD_URL/api/playlist/stream"
    echo ""
    echo "📝 Next steps:"
    echo "   1. Test playlist generation manually"
    echo "   2. Check Vercel logs for any errors"
    echo "   3. Monitor performance in Vercel dashboard"
else
    echo -e "${RED}❌ $failed_tests TEST(S) FAILED${NC}"
    echo -e "${YELLOW}⚠️  Check Vercel logs and environment variables${NC}"
    echo ""
    echo "🔍 Debug steps:"
    echo "   1. Check Vercel deployment logs"
    echo "   2. Verify environment variables are set"
    echo "   3. Check Vercel function logs"
    echo "   4. Test locally first"
fi

echo ""
echo "📋 PRODUCTION CHECKLIST"
echo "======================="
echo "□ Environment variables set in Vercel"
echo "□ Spotify OAuth configured"
echo "□ OpenAI API key configured"
echo "□ NextAuth secret configured"
echo "□ Domain configured in Spotify app"
echo "□ Vercel logs accessible"
echo "□ Performance monitoring enabled"

exit $failed_tests
