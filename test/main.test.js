describe('Main Tests', () => {
	describe('Deployment', require('./partials/deployment.test'));

	describe('Token', require('./partials/token.test'));

	describe('Item', require('./partials/item.test'));

	describe('Land', require('./partials/land.test'));

	describe('Withdraw', require('./partials/withdraw.test'));

	after(() => {
		console.log('\n\tToken address:', token.address);
		console.log('\tLand address:', land.address);
		console.log('\tItem address:', item.address);
		console.log('\tERC1155Market address:', erc1155market.address);
		console.log('\tLandMarket address:', landmarket.address);
	});
});
