// Quick test for place-bet endpoint

// First, get market details
console.log('Fetching market 1...');
const marketResp = await fetch('http://localhost:5000/api/markets/1');
const market = await marketResp.json();
console.log('Market:', JSON.stringify(market, null, 2));

// Now try to place a bet
console.log('\nTrying to place bet...');
const response = await fetch('http://localhost:5000/api/place-bet', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        marketId: '1',
        betType: 'YES',
        amount: 10000000,
        userAddress: '0x3cab0d4baece087681585a2ccb8b09f7957c74abef25938f02046c8030ed83a1',
    }),
});

console.log('Status:', response.status);
const json = await response.json();
console.log('Error:', json.error);
console.log('Details:', json.details);
console.log('Code:', json.code);
