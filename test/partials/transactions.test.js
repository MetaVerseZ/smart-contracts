const { ethers } = require('hardhat');
const { expect } = require('chai');
const { expectRevert } = require('@openzeppelin/test-helpers');

const test = () => {
	before(async () => (listingFee = (await market._listingFee()).toString()));
	const testItemPrice = ethers.utils.parseUnits('5000', 'ether');

	it('buy item', async () => {
		const listing = await market.getListing(0);
		await token.connect(buyer).approve(market.address, listing.price);
		await market.connect(buyer).buyItem(listing.id);
		const updatedListing = await market.getListing(listing.id);
		expect(updatedListing.owner).to.equal(ethers.constants.AddressZero);
		expect(await item.ownerOf(listing.id)).to.equal(buyer.address);
	});

	it('list item again after buying', async () => {
		await market.connect(buyer).listItem(0, testItemPrice);
		const listing = await market.getListing(0);
		expect(listing.owner).to.equal(buyer.address);
		const listings = await market.listings();
		expect(listings.length).to.equal(2);
	});

	it('cancel item listing', async () => {
		const initialBalance = await token.balanceOf(main.address);

		const ID = await item._tokenId();
		await item.mint('http://example.com/' + ID);
		await market.listItem(ID, testItemPrice);

		expect(parseFloat(ethers.utils.formatEther(await token.balanceOf(main.address))), parseFloat(ethers.utils.formatEther(initialBalance) + ethers.utils.formatEther(listingFee)));

		await market.cancel(ID);
		const listing = await market.getListing(ID);
		expect(listing.owner).to.equal(ethers.constants.AddressZero);

		expect(parseFloat(ethers.utils.formatEther(await token.balanceOf(main.address))), parseFloat(ethers.utils.formatEther(initialBalance)));
	});

	it('check owned items', async () => {
		const mainOwnedItems = (await market.getAccountItems(main.address)).map(e => parseInt(ethers.utils.formatUnits(e, 0)));
		const buyerOwnedItems = (await market.getAccountItems(buyer.address)).map(e => parseInt(ethers.utils.formatUnits(e, 0)));
		expect(mainOwnedItems.length).to.equal(2);
		expect(buyerOwnedItems.length).to.equal(1);
		expect(mainOwnedItems.every(item => [1, 2].includes(item)) && [1, 2].every(item => mainOwnedItems.includes(item))).to.equal(true);
		expect(buyerOwnedItems.every(item => [0].includes(item)) && [0].every(item => buyerOwnedItems.includes(item))).to.equal(true);
	});

	it('cannot list a token owned by someone else', async () => {
		await item.connect(buyer).mint('test');

		await token.approve(market.address, listingFee);
		await expectRevert(market.listItem(parseInt(ethers.utils.formatUnits(await item._tokenId(), 0)) - 1, testItemPrice), 'listing can be done only by owner');
	});

	it('cannot cancel a token owned by someone else', async () => {
		await expectRevert(market.connect(buyer).cancel(1), 'only owner can cancel listing');
	});

	it('cannot buy an owned item', async () => {
		await expectRevert(market.buyItem(1), 'owner cannot be buyer');
	});

	it('cannot buy an inactive item', async () => {
		await expectRevert(market.connect(buyer).buyItem(2), 'listing is not active');
	});

	it('catch insufficient listing fee', async () => {
		const account = (await ethers.getSigners())[3];
		await item.connect(account).mint('http://example.com/4');
		await expectRevert(market.connect(account).listItem(3, testItemPrice), 'balance too low for listing fee');
	});

	it('catch low balance for buy payment', async () => {
		const account = (await ethers.getSigners())[3];
		await expectRevert(market.connect(account).buyItem(1), 'balance too low');
	});
};

module.exports = test;
