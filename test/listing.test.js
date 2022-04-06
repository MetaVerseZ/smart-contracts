describe('Listing Tests', () => {
	describe('Deployment', require('./partials/deployment.test'));

	describe('Token', require('./partials/token.test'));

	describe('Item', require('./partials/item.test')(10));

	describe('Listing', require('./partials/list.test'));

	after(() => {
		console.log('\n\tToken address:', token.address);
		console.log('\tMarket address:', market.address);
		console.log('\tItem address:', item.address);
	});
});
