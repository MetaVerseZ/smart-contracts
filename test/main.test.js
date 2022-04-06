describe('Main Tests', () => {
	describe('Deployment', require('./partials/deployment.test'));

	describe('Token', require('./partials/token.test'));

	describe('Land', require('./partials/land.test')());

	describe('Item', require('./partials/item.test')());

	describe('Item Transactions', require('./partials/transactions.test'));

	describe('Withdraw', require('./partials/withdraw.test'));

	after(() => {
		console.log('\n\tToken address:', token.address);
		console.log('\tMarket address:', market.address);
		console.log('\tLand address:', land.address);
		console.log('\tItem address:', item.address);
	});
});
