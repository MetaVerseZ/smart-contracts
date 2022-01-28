const { expect } = require('chai');
const { ethers } = require('hardhat');
// const { create, urlSource } = require('ipfs-http-client');

const test = () => {
	it('number of listings', async () => {
		expect((await market.listings()).length).to.equal(10);
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

		expect(parseInt(ethers.utils.formatUnits(await market.unlisted(), 0))).to.equal(2);
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

		expect(parseInt(ethers.utils.formatUnits(await market.unlisted(), 0))).to.equal(0);
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

	it('cannot list an item that is not minted', async () => {
		try {
			await market.listItem(22, ethers.utils.parseUnits('5000', 'ether'));
		} catch (error) {
			expect(error.message.includes('item not minted')).to.equal(true);
		}
	});
};

module.exports = test;
