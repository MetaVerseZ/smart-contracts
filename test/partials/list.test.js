const { expect } = require('chai');
const { ethers } = require('hardhat');
// const { create, urlSource } = require('ipfs-http-client');

const test = () => {
	it('number of listings', async () => {
		const numListings = await market._totalNumberOfListings();
		expect(parseInt(ethers.utils.formatUnits(numListings, 0))).to.equal(10);
	});

	it('unlist items', async () => {
		const listings = Array.from({ length: 2 }, (v, k) => k + 5);

		await Promise.all(
			listings.map(async id => {
				await market.cancel(id);
				const listing = await market.getListing(id);
				expect(listing.status).to.equal(1);
			})
		);

		const totalNumberOfListings = ethers.utils.formatUnits(await market._totalNumberOfListings(), 0);
		const numberOfListedItems = ethers.utils.formatUnits(await market.numberOfListedItems(), 0);

		const unlistedItems = await market.getUnlistedItems();

		expect(unlistedItems.length).to.equal(totalNumberOfListings - numberOfListedItems);
		expect(parseInt(ethers.utils.formatUnits(unlistedItems[0].id, 0))).to.equal(5);
		expect(parseInt(ethers.utils.formatUnits(unlistedItems[1].id, 0))).to.equal(6);
	});

	it('list again', async () => {
		const listings = Array.from({ length: 2 }, (v, k) => k + 5);

		await Promise.all(
			listings.map(async id => {
				await market.listToken(id, ethers.utils.parseEther('100'));
				const listing = await market.getListing(id);
				expect(listing.status).to.equal(0);
			})
		);

		const totalNumberOfListings = ethers.utils.formatUnits(await market._totalNumberOfListings(), 0);
		const numberOfListedItems = ethers.utils.formatUnits(await market.numberOfListedItems(), 0);

		const unlistedItems = await market.getUnlistedItems();

		expect(unlistedItems.length).to.equal(totalNumberOfListings - numberOfListedItems);

		const numListings = await market._totalNumberOfListings();
		expect(parseInt(ethers.utils.formatUnits(numListings, 0))).to.equal(10);
	});

	it('number of sold items', async () => {
		const listings = Array.from({ length: 3 }, (v, k) => k);

		await Promise.all(
			listings.map(async listing => {
				listing = await market.getListing(listing);
				await token.connect(buyer).approve(market.address, listing.price);
				await market.connect(buyer).buyToken(listing.id);
			})
		);

		expect(parseInt(ethers.utils.formatUnits(await market._numberOfSoldItems(), 0))).to.equal(listings.length);
	});

	// it('listed and unlisted items', async () => {
	// 	const listings = Array.from({ length: 3 }, (v, k) => k);

	// 	await Promise.all(
	// 		listings.map(async listing => {
	// 			listing = await market.getListing(listing);
	// 			await token.connect(buyer).approve(market.address, listing.price);
	// 			await market.connect(buyer).buyToken(listing.id);
	// 		})
	// 	);

	// 	expect(parseInt(ethers.utils.formatUnits(await market._numberOfSoldItems(), 0))).to.equal(listings.length);
	// });
};

module.exports = test;
