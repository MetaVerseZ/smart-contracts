describe('Listing Tests', () => {
	describe('Deployment', require('./partials/deployment.test'));

	describe('Token', require('./partials/token.test'));

	describe('Mint', require('./partials/mint.test')(10));

	describe('Listing', require('./partials/list.test'));

	after(() => {
		console.log('\n\tToken address:', token.address);
		console.log('\tMerket address:', market.address);
		console.log('\tNFT address:', nft.address);
	});
});
