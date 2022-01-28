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
				expect(listing.owner).to.equal(ethers.constants.AddressZero);
			})
		);

		const totalNumberOfListings = parseInt(ethers.utils.formatUnits(await market._totalNumberOfListings(), 0));
		const numberOfListedItems = parseInt(ethers.utils.formatUnits(await market.numberOfListedItems(), 0));

		expect(totalNumberOfListings > numberOfListedItems).to.equal(true);
		expect((await market.getListing(5)).owner).to.equal(ethers.constants.AddressZero);
		expect((await market.getListing(6)).owner).to.equal(ethers.constants.AddressZero);
	});

	it('list again', async () => {
		const listings = Array.from({ length: 2 }, (v, k) => k + 5);

		await Promise.all(
			listings.map(async id => {
				await market.listItem(id, ethers.utils.parseEther('100'));
				const listing = await market.getListing(id);
				expect(listing.owner).to.equal(main.address);
			})
		);

		const totalNumberOfListings = parseInt(ethers.utils.formatUnits(await market._totalNumberOfListings(), 0));
		const numberOfListedItems = parseInt(ethers.utils.formatUnits(await market.numberOfListedItems(), 0));

		expect(totalNumberOfListings > numberOfListedItems).to.equal(true);

		const numListings = await market._totalNumberOfListings();
		expect(parseInt(ethers.utils.formatUnits(numListings, 0))).to.equal(12);
	});

	it('number of sold items', async () => {
		const listings = Array.from({ length: 3 }, (v, k) => k);

		await Promise.all(
			listings.map(async listing => {
				listing = await market.getListing(listing);
				await token.connect(buyer).approve(market.address, listing.price);
				await market.connect(buyer).buyItem(listing.id);
			})
		);

		expect(parseInt(ethers.utils.formatUnits(await market._numberOfSales(), 0))).to.equal(listings.length);
	});
};

module.exports = test;
