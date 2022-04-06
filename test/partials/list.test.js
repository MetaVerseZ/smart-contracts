const { expect } = require('chai');
const { ethers } = require('hardhat');
const { expectRevert } = require('@openzeppelin/test-helpers');
// const { create, urlSource } = require('ipfs-http-client');

const test = () => {
	it('number of listings', async () => {
		expect((await market.listingsERC1155(item.address)).length).to.equal(10);
	});

	it('unlist items', async () => {
		const listings = Array.from({ length: 2 }, (v, k) => k + 5);

		await Promise.all(
			listings.map(async id => {
				await market.cancelERC1155(item.address, id);
				const listing = await market.getERC1155Listing(id);
				expect(listing.sellers.length).to.equal(0);
			})
		);
	});

	it('list again', async () => {
		const listings = Array.from({ length: 2 }, (v, k) => k + 5);

		await Promise.all(
			listings.map(async id => {
				await market.listERC1155(item.address, id, ethers.utils.parseEther('100'), 10);
				const listing = await market.getERC1155Listing(id);
				expect(listing.sellers).to.include(main.address);
			})
		);
	});

	it('cannot list an item that is not minted/owned', async () => {
		expectRevert(market.listERC1155(item.address, 22, ethers.utils.parseUnits('5000', 'ether'), 10), 'listing can be done only by owner');
	});
};

module.exports = test;
