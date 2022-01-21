describe('Main Tests', () => {
	describe('Deployment', require('./partials/deployment.test'));

	describe('Token', require('./partials/token.test'));

	describe('Mint', require('./partials/mint.test')());

	describe('Transactions', require('./partials/transactions.test'));

	describe('Withdraw', require('./partials/withdraw.test'));

	after(() => {
		console.log('\n\tToken address:', token.address);
		console.log('\tMarket address:', market.address);
		console.log('\tItem address:', item.address);
	});
});