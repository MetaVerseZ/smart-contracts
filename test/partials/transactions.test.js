const { ethers } = require('hardhat');
const { expect } = require('chai');
const { expectRevert } = require('@openzeppelin/test-helpers');
const { ZERO_ADDRESS } = require('@openzeppelin/test-helpers/src/constants');

const test = () => {
	const testItemPrice = ethers.utils.parseUnits('20', 'ether');
	const amount = 12;

	it('buy item', async () => {
		const initialMarketBalance = parseFloat(ethers.utils.formatEther(await token.balanceOf(market.address)));

		const listing = await market.getERC1155Listing(0);
		const amounts = listing.amounts.reduce((acc, b) => (acc += parseInt(ethers.utils.formatUnits(b, 0))), 0);

		await token.connect(buyer).approve(market.address, ethers.utils.parseEther('' + parseFloat(ethers.utils.formatEther(listing.price)) * amount));
		await market.connect(buyer).buyERC1155(item.address, listing.id, amount);
		const updatedListing = await market.getERC1155Listing(listing.id);
		const updatedamounts = updatedListing.amounts.reduce((acc, b) => (acc += parseInt(ethers.utils.formatUnits(b, 0))), 0);

		expect(amounts - updatedamounts).to.equal(amount);
		expect(ethers.utils.formatUnits(await item.balanceOf(buyer.address, listing.id), 0)).to.equal(amount.toString());

		const updatedMarketBalance = parseFloat(ethers.utils.formatEther(await token.balanceOf(market.address)));
		expect(updatedMarketBalance - initialMarketBalance).to.equal(parseFloat(ethers.utils.formatEther(listing.price)) * amount * (parseFloat(ethers.utils.formatUnits(await market._listingFeePermille(), 0)) / 1000));
	});

	it('list item again after buying', async () => {
		const approved = await item.isApprovedForAll(buyer.address, market.address);
		if (!approved) {
			await item.connect(buyer).setApprovalForAll(market.address, true);
		}
		await market.connect(buyer).listERC1155(item.address, 0, testItemPrice, amount - 2);
		const listing = await market.getERC1155Listing(0);
		expect(listing.sellers).to.include(buyer.address);

		const index = listing.sellers.indexOf(buyer.address);
		expect(parseInt(ethers.utils.formatUnits(listing.amounts[index], 0))).to.equal(amount - 2);
		const listings = await market.listingsERC1155(item.address);
		expect(listings.length).to.equal(2);
	});

	it('cancel item listing', async () => {
		const id = parseInt(ethers.utils.formatUnits(await item._tokenId(), 0));

		await item.connect(third).mint('any', amount + 10);

		await market.connect(third).listERC1155(item.address, id, testItemPrice, amount + 10);

		const listing = await market.getERC1155Listing(id);
		expect(listing.sellers).to.include(third.address);

		await market.connect(third).cancelERC1155(item.address, id);
		const updatedListing = await market.getERC1155Listing(id);
		expect(updatedListing.sellers.length).to.equal(0);
		expect(updatedListing._contract).to.equal(ZERO_ADDRESS);
		expect(parseInt(ethers.utils.formatUnits(await item.balanceOf(third.address, id), 0))).to.equal(amount + 10);
	});

	it('cannot list a token owned by someone else', async () => {
		await item.connect(buyer).mint('test', 1);

		await expectRevert(market.listERC1155(item.address, parseInt(ethers.utils.formatUnits(await item._tokenId(), 0)) - 1, testItemPrice, 1), 'listing can be done only by owner');
	});

	it('cannot cancel a token owned by someone else', async () => {
		await expectRevert(market.connect(third).cancelERC1155(item.address, 0), 'only owner can cancel listing');
	});

	it('cannot buy an owned item', async () => {
		await expectRevert(market.buyERC1155(item.address, 1, 1), 'seller cannot be buyer');
	});
};

module.exports = test;
