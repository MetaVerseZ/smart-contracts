describe('Main Tests', () => {
	describe('Deployment', require('./partials/deployment.test'));

	describe('Token', require('./partials/token.test'));

	describe('Transactions', require('./partials/transactions.test'));

	describe('Withdraw', require('./partials/withdraw.test'));

	after(() => {
		console.log('\n\tToken address:', token.address);
		console.log('\tMerket address:', market.address);
		console.log('\tNFT address:', nft.address);
	});
});
